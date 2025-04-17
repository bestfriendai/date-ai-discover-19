import { useRef, useEffect, useState, useCallback } from 'react';
import { useUserLocation } from '@/hooks/useUserLocation';
import ReactDOMServer from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { MapControls } from './components/MapControls';
import { MapPopup } from './components/MapPopup';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, Search } from 'lucide-react';
import { searchEvents } from '@/services/eventService';
import { Button } from '@/components/ui/button';
import UserLocationMarker from './markers/UserLocationMarker';
import type { EventFilters } from './components/MapControls';
import { formatISO } from 'date-fns';
import * as GeoJSON from 'geojson';
import bbox from '@turf/bbox';
import { motion } from 'framer-motion';
import { applyFilters, sortEvents } from '@/utils/eventFilters';
import PerformanceMonitor from '@/utils/performanceMonitor';

// Debounce utility function was removed since we no longer need automatic fetching on map movement
import { MapMarkers } from './components/MapMarkers';

// Define map styles
const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

interface MapComponentProps {
  events: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  filters: EventFilters;
  mapLoaded: boolean;
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void;
  onEventSelect?: (event: Event) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

// Helper function to convert events to GeoJSON features
const eventsToGeoJSON = (events: Event[]): GeoJSON.FeatureCollection<GeoJSON.Point> => {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  let skipped = 0;
  let missingCategory = 0;

  events.forEach(event => {
    // Validate coordinates
    if (
      !event.coordinates ||
      !Array.isArray(event.coordinates) ||
      event.coordinates.length !== 2 ||
      typeof event.coordinates[0] !== 'number' ||
      typeof event.coordinates[1] !== 'number' ||
      isNaN(event.coordinates[0]) ||
      isNaN(event.coordinates[1])
    ) {
      skipped++;
      return;
    }

    // Validate category
    if (!event.category) {
      missingCategory++;
    }

    features.push({
      type: 'Feature',
      properties: {
        id: event.id,
        title: event.title,
        category: event.category?.toLowerCase() || 'other',
      },
      geometry: {
        type: 'Point',
        coordinates: event.coordinates as [number, number]
      }
    });
  });

  // Debug logging
  console.log(`[Map] eventsToGeoJSON: received=${events.length}, output=${features.length}, skipped_invalid_coords=${skipped}, missing_category=${missingCategory}`);

  return {
    type: 'FeatureCollection',
    features
  };
};

const MapComponent = ({
  events,
  selectedEvent,
  isLoading,
  filters,
  mapLoaded,
  onMapMoveEnd,
  onMapLoad,
  onEventSelect,
  onLoadingChange,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const hoverPopup = useRef<mapboxgl.Popup | null>(null);
  const isProgrammaticMove = useRef(false);
  const initialBoundsFitted = useRef(false); // Track if initial bounds have been fitted
  // Center on the US/globe by default
  const [viewState, setViewState] = useState({ longitude: -98.5795, latitude: 39.8283, zoom: 3.5 });
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('New York');
  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.dark);
  const [mapError, setMapError] = useState<string | null>(null);
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache expiry

  // Optimize event fetching with caching and reduced radius
  // (Event fetching logic removed; all event data is now passed in via props)

  // --- Location Handling ---
  const { getUserLocation } = useUserLocation();

  // Handler for when a marker is clicked
  const handleMarkerClick = (eventItem: Event) => {
    onEventSelect?.(eventItem);
  };

  // --- Map Initialization Effect ---
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      // Start measuring map initialization performance
      PerformanceMonitor.startMeasure('mapInitialization', {
        initialViewState: { ...viewState }
      });

      try {
        console.log('[MAP_DEBUG] Starting map initialization...');
        // Check if mapboxgl is loaded
        if (typeof mapboxgl === 'undefined') {
          console.error('[MAP_DEBUG] CRITICAL: mapboxgl is undefined!');
          setMapError("Map library failed to load.");
          return;
        } else {
          console.log('[MAP_DEBUG] mapboxgl object is defined:', mapboxgl);
        }

        // Check map container
        if (!mapContainer.current) {
          console.error('[MAP_DEBUG] Map container ref is null!');
          setMapError("Map container not found.");
          return;
        } else {
          console.log('[MAP_DEBUG] Map container element found:', mapContainer.current);
        }

        // Get the fallback token from the window object (defined in index.html)
        const FALLBACK_MAPBOX_TOKEN = (window as any).FALLBACK_MAPBOX_TOKEN || 'pk.eyJ1IjoiYmVzdGZyaWVuZGFpIiwiYSI6ImNsdGJtZnRnZzBhcGoya3BjcWVtbWJvdXcifQ.Zy8lxHYC_-4TQU_l-l_QQA';
        console.log('[MAP_DEBUG] Fallback token available:', !!FALLBACK_MAPBOX_TOKEN);

        let mapboxToken: string;
        try {
          console.log('[MAP_DEBUG] Fetching Mapbox token...');
          const { data, error } = await supabase.functions.invoke('get-mapbox-token');
          if (error) {
            console.error('[MAP_DEBUG] Error fetching token from function:', error);
            throw error;
          }
          if (!data?.MAPBOX_TOKEN) {
            console.error('[MAP_DEBUG] No MAPBOX_TOKEN in function response:', data);
            throw new Error('No Mapbox token returned from server');
          }
          mapboxToken = data.MAPBOX_TOKEN;
          // !!! TEMPORARY DEBUGGING ONLY - REMOVE LATER !!!
          console.log('[MAP_DEBUG] Received token (first 10 chars):', mapboxToken.substring(0, 10));
          // !!! END TEMPORARY DEBUGGING !!!
        } catch (tokenError) {
          console.error('[MAP_DEBUG] Token fetch failed, using fallback.', tokenError);
          mapboxToken = FALLBACK_MAPBOX_TOKEN || '';
          if (!mapboxToken) {
            console.error('[MAP_DEBUG] Fallback token is also missing!');
            setMapError("Map token configuration error.");
            return;
          }
          // !!! TEMPORARY DEBUGGING ONLY - REMOVE LATER !!!
          console.log('[MAP_DEBUG] Using fallback token (first 10 chars):', mapboxToken.substring(0, 10));
          // !!! END TEMPORARY DEBUGGING !!!
        }

        mapboxgl.accessToken = mapboxToken;
        console.log('[MAP_DEBUG] Mapbox access token set.');

        // Performance optimizations for the map
        const mapOptions: mapboxgl.MapboxOptions = {
          container: mapContainer.current,
          style: mapStyle,
          center: [viewState.longitude, viewState.latitude] as [number, number],
          zoom: viewState.zoom,
          pitch: 45,
          bearing: -17.6,
          attributionControl: false,
          preserveDrawingBuffer: true,
          fadeDuration: 0,
          maxZoom: 18,
          minZoom: 2,
          trackResize: true,
          antialias: false
        };
        console.log('[MAP_DEBUG] Creating map instance...');
        map.current = new mapboxgl.Map(mapOptions);
        console.log('[MAP_DEBUG] Map instance created (or attempted).');

        map.current.on('load', () => {
          console.log('[MAP_DEBUG] Map "load" event fired!');
          // ... existing load handler code ...
          onMapLoad();
        });

        map.current.on('error', (e: any) => {
          console.error('[MAP_DEBUG] Mapbox specific error event:', e);
          const errorMessage = e.error ? e.error.message : 'Unknown map error';
          setMapError(`Map error: ${errorMessage}`);
        });

        map.current.on('styledata', () => {
          console.log('[MAP_DEBUG] Style loaded successfully');
        });

        try {
          console.log('[MAP] Adding map controls...');
          map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
          map.current.addControl(
            new mapboxgl.GeolocateControl({
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: true,
              showUserHeading: true
            }),
            'bottom-right'
          );
          console.log('[MAP] Map controls added successfully');
        } catch (controlError) {
          console.error('[MAP] Error adding map controls:', controlError);
          // Continue even if controls fail to load
        }

        try {
          console.log('[MAP] Setting up map event listeners...');

          // Map load event - fires when the map's initial style and sources have loaded
          map.current.on('load', () => {
            console.log('[MAP] Map loaded event fired');
            if (!isMounted || !map.current) {
              console.log('[MAP] Component unmounted during map load or map instance missing');
              return;
            }
            onMapLoad();
            console.log('[MAP] Map successfully loaded and ready');

            // End map initialization performance measurement
            PerformanceMonitor.endMeasure('mapInitialization', {
              success: true,
              center: map.current.getCenter(),
              zoom: map.current.getZoom(),
              style: mapStyle
            });

            // Log map status for debugging
            console.log('[MAP] Map loaded with center:', map.current.getCenter());
            console.log('[MAP] Map loaded with zoom:', map.current.getZoom());
            console.log('[MAP] Map loaded with bearing:', (map.current as any).getBearing?.() || 'N/A');
            console.log('[MAP] Map loaded with pitch:', (map.current as any).getPitch?.() || 'N/A');

            // Do not fetch events until user provides a location
          });

          // Map error event - fires when the map encounters an error
          map.current.on('error', (e) => {
            console.error('[MAP] Mapbox error event:', e);
            const errorMessage = e.error?.message || 'Unknown map error';
            console.error('[MAP] Error details:', errorMessage);
            setMapError(`Mapbox error: ${errorMessage}`);
            toast({
              title: "Map Error",
              description: errorMessage,
              variant: "destructive"
            });
          });

          // Map move event - fires when the map's viewport changes
          map.current.on('moveend', (e) => {
            if (!map.current) {
              console.log('[MAP] Map instance missing during moveend event');
              return;
            }

            try {
              const center = map.current.getCenter();
              const newViewState = {
                longitude: parseFloat(center.lng.toFixed(4)),
                latitude: parseFloat(center.lat.toFixed(4)),
                zoom: parseFloat(map.current.getZoom().toFixed(2))
              };

              console.log('[MAP] Map moved to:', newViewState);
              setViewState(newViewState); // Still update coordinates display

              // We're only setting mapHasMoved to true to show the "Search This Area" button
              // We've disabled the automatic event fetching that used to happen on map movement
              // The user can still use the "Search This Area" button for explicit refetches

              // Only show the Search This Area button if this was a user interaction (not programmatic)
              const isUserInteraction = e.originalEvent || (e as any).isUserInteraction;
              if (!isProgrammaticMove.current && mapLoaded && isUserInteraction) {
                console.log('[MAP] User moved map, showing Search This Area button');
                // "Search This Area" button state is now managed by parent
              }
            } catch (moveError) {
              console.error('[MAP] Error during map move:', moveError);
            }
          });

          // Debug events
          map.current.on('data', (e) => {
            if (e.dataType === 'source' && e.isSourceLoaded) {
              console.log(`[MAP] Source '${e.sourceId}' loaded successfully`);
            }
          });

          console.log('[MAP] Map event listeners set up successfully');
        } catch (eventError) {
          console.error('[MAP] Error setting up map event listeners:', eventError);
          setMapError(`Failed to set up map events: ${eventError.message}`);
          throw eventError;
        }
      } catch (error) {
        if (!isMounted) {
          console.log('[MAP] Component unmounted during error handling');
          return;
        }

        // Extract detailed error information
        let errorMessage = "Map initialization failed. Could not load the map.";
        let errorDetails = "";
        let errorType = "Unknown Error";

        if (error instanceof Error) {
          errorMessage = `Map initialization failed: ${error.message}`;
          errorDetails = error.stack || '';
          errorType = error.name || 'Error';
        } else if (typeof error === 'object' && error !== null) {
          try {
            errorMessage = `Map initialization failed: ${JSON.stringify(error)}`;
          } catch (e) {
            errorMessage = `Map initialization failed: [Object cannot be stringified]`;
          }
        }

        // Log detailed error information
        console.error(`[MAP] ${errorType}: ${errorMessage}`);
        console.error('[MAP] Error object:', error);
        console.error('[MAP] Stack trace:', errorDetails);
        console.error('[MAP] Browser info:', navigator.userAgent);
        console.error('[MAP] Window dimensions:', window.innerWidth, 'x', window.innerHeight);

        // Check for common error patterns
        if (errorMessage.includes('WebGL') || errorMessage.includes('GL context')) {
          errorMessage = "Your browser's graphics capabilities may be limited. Try updating your browser or graphics drivers.";
        } else if (errorMessage.includes('token')) {
          errorMessage = "Map authentication failed. Please refresh the page or try again later.";
        } else if (errorMessage.includes('style')) {
          errorMessage = "Map style could not be loaded. Please check your internet connection and try again.";
        }

        // Set error state and show toast
        setMapError(errorMessage);
        toast({
          title: "Map initialization failed",
          description: errorMessage,
          variant: "destructive"
        });

        // Try to recover by setting a fallback state
        // loading state is managed by parent

        // Log that we're entering a degraded state
        console.log('[MAP] Entering degraded state due to map initialization failure');

        // End map initialization with error
        PerformanceMonitor.endMeasure('mapInitialization', {
          success: false,
          error: errorMessage,
          errorType,
          browserInfo: navigator.userAgent
        });
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (userMarker) userMarker.remove();
      if (map.current) map.current.remove();
    };
  }, [filters, mapLoaded, mapStyle]);

  // --- Effect to Update Map Bounds Based on Events (Initial Load Only) ---
  useEffect(() => {
    // Conditions: Map ready, not loading, HAVE events, and initial bounds NOT fitted yet
    if (!map.current || !mapLoaded || isLoading || events.length === 0 || initialBoundsFitted.current) {
      console.log('[MAP] Skipping initial fitBounds. Conditions:', { mapLoaded, isLoading, eventCount: events.length, initialBoundsFitted: initialBoundsFitted.current });
      return;
    }

    // --- If conditions met, proceed to fit bounds ---
    console.log('[MAP] Performing initial fitBounds');

    // Mark as fitted immediately to prevent race conditions
    initialBoundsFitted.current = true;

    const boundsUpdateTimer = setTimeout(() => {
      try {
        // Only use events with valid coordinates
        const eventsWithCoords = events.filter(e =>
          e.coordinates && Array.isArray(e.coordinates) && e.coordinates.length === 2
        );

        if (eventsWithCoords.length === 0) {
          console.log('[MAP] No events with coordinates to fit bounds on initial load');
          initialBoundsFitted.current = false; // Reset if no coordinates
          return;
        }

        console.log(`[MAP] Fitting bounds to ${eventsWithCoords.length} events`);
        const geojsonData = eventsToGeoJSON(eventsWithCoords);

        if (geojsonData.features.length > 0) {
          try {
            isProgrammaticMove.current = true;
            const bounds = bbox(geojsonData) as mapboxgl.LngLatBoundsLike;

            // Add padding based on screen size for better UX
            const padding = {
              top: Math.max(100, window.innerHeight * 0.1),
              bottom: Math.max(150, window.innerHeight * 0.05),
              left: Math.max(50, window.innerWidth * 0.05),
              right: Math.max(50, window.innerWidth * 0.05)
            };

            console.log('[MAP] Fitting to initial bounds with padding:', padding);
            map.current.fitBounds(bounds, {
              padding,
              maxZoom: 15,
              duration: 1000
            });

            setTimeout(() => {
              isProgrammaticMove.current = false;
            }, 1100);
          } catch (e) {
            console.error("[MAP] Error fitting initial bounds:", e);
            initialBoundsFitted.current = false; // Reset if fitting fails
          }
        } else {
          initialBoundsFitted.current = false; // Reset if no features
        }
      } catch (err) {
        console.error("[MAP] Error in initial bounds useEffect:", err);
        initialBoundsFitted.current = false; // Reset on error
      }
    }, 500); // Debounce slightly

    return () => clearTimeout(boundsUpdateTimer);
    // Depend only on events, mapLoaded, and loading state.
    // initialBoundsFitted handles the "only once" logic.
  }, [events, mapLoaded, isLoading]);

  // We'll just remove the debounced version since we're not using it anymore
  // If needed in the future, it can be re-implemented

  // --- Effect to Watch for Map Movement ---
  // This effect has been disabled to prevent automatic event fetching when the user pans or zooms
  // The user can still use the "Search This Area" button for explicit refetches
  /*
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    if (mapHasMoved) {
      console.log('[MAP] Map has moved, but no longer triggering automatic fetch');
      // We no longer automatically fetch events here
      // setMapHasMoved(false); // We'll reset this when the user clicks "Search This Area"
    }
  }, [mapHasMoved, mapLoaded]);
  */

  // --- Effect to Handle Map Style Changes ---
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleStyleData = () => {
      if (map.current?.isStyleLoaded()) {
        console.log("Style loaded, re-adding features...");
      }
    };

    map.current.setStyle(mapStyle);
    map.current.once('styledata', handleStyleData);
  }, [mapStyle, mapLoaded]);

  // --- Handlers ---
  const handleSearchThisArea = () => {
    if (!map.current) return;

    console.log('[MAP] Search This Area button clicked');
    // mapHasMoved is managed by parent

    // Reset initialBoundsFitted to allow fitBounds to run for these results
    initialBoundsFitted.current = false;

    const center = map.current.getCenter();
    // Use the regular fetchEvents here (not debounced) since this is a direct user action
    // event fetching is managed by parent

    toast({
      title: "Searching Area",
      description: "Fetching events for the current map view."
    });
  };

  const handleClearSearch = () => {
    // mapHasMoved is managed by parent
    // Reset initialBoundsFitted to allow fitBounds to run for these results
    initialBoundsFitted.current = false;
    // event fetching is managed by parent
  };

  const handleViewChange = (view: 'list' | 'grid') => {
    // currentView is managed by parent or not used
  };

  const handleLocationSearch = async (location: string) => {
    if (!location.trim() || !mapboxgl.accessToken) return;

    // loading state is managed by parent
    onLoadingChange?.(true);
    // mapHasMoved is managed by parent

    // Reset initialBoundsFitted to allow fitBounds to run for the new search results
    initialBoundsFitted.current = false;

    toast({
      title: "Searching",
      description: `Looking for events near ${location}...`
    });

    try {
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.features?.length) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        const placeName = feature.text || location;

        setCurrentLocation(placeName);
        // userHasSetLocation is managed by parent or not needed

        if (map.current) {
          isProgrammaticMove.current = true;
          map.current.easeTo({
            center: [longitude, latitude],
            zoom: 13,
            duration: 1500
          });

          setTimeout(() => {
            isProgrammaticMove.current = false;
          }, 1600);

          setViewState({ longitude, latitude, zoom: 13 });
          // event fetching is managed by parent
        }
      } else {
        toast({ title: "Location not found", variant: "destructive" });
        // loading state is managed by parent
        onLoadingChange?.(false);

        // Prevent fitBounds if search yields nothing
        initialBoundsFitted.current = true;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({ title: "Search Error", variant: "destructive" });
      // loading state is managed by parent
      onLoadingChange?.(false);

      // Prevent fitBounds on error
      initialBoundsFitted.current = true;
    }
  };

  const handleGetUserLocation = async () => {
    setLocationRequested(true);
    // mapHasMoved is managed by parent
    // Reset initialBoundsFitted to allow fitBounds to run for the new location
    initialBoundsFitted.current = false;

    try {
      const [longitude, latitude] = await getUserLocation(); // Await the promise

      // --- THIS BLOCK RUNS ONLY ON SUCCESS ---
      if (!map.current) throw new Error("Map not initialized");

      if (userMarker) userMarker.remove();

      const markerHtml = ReactDOMServer.renderToString(<UserLocationMarker color="blue" />);
      const el = document.createElement('div');
      el.innerHTML = markerHtml;

      const marker = new mapboxgl.Marker({ element: el.firstChild as HTMLElement })
        .setLngLat([longitude, latitude])
        .addTo(map.current);

      setUserMarker(marker);

      isProgrammaticMove.current = true;
      setViewState({ longitude, latitude, zoom: 14 });
      map.current.jumpTo({ center: [longitude, latitude], zoom: 14 });

      // Add a slight delay for the easeTo animation
      setTimeout(() => {
        if (map.current) {
          map.current.easeTo({
            pitch: 50, // Add some visual flair
            bearing: Math.random() * 60 - 30,
            duration: 1500
          });
        }
        // Set programmatic move to false after animation might have started
        setTimeout(() => {
          isProgrammaticMove.current = false;
        }, 1600);
      }, 100);

      // Try reverse geocode
      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`);
        const data = await response.json();
        if (data.features?.length) {
          const place = data.features.find((f: any) => f.place_type.includes('place') || f.place_type.includes('locality'));
          if (place) setCurrentLocation(place.text);
        }
      } catch (geoError) {
        console.error('Reverse geocode error:', geoError);
      }

      // --- SET USER HAS SET LOCATION ON SUCCESS ---
      // userHasSetLocation is managed by parent or not needed
      // --- FETCH EVENTS FOR THE *USER'S* LOCATION ---
      // event fetching is managed by parent
      // --- END SUCCESS BLOCK ---

    } catch (error) {
      // --- THIS BLOCK RUNS ON GEOLOCATION FAILURE ---
      console.error('Get location error:', error);

      // Use popular cities as fallback locations instead of just New York
      const fallbackLocations = [
        { name: "New York", lng: -74.0060, lat: 40.7128 },
        { name: "Los Angeles", lng: -118.2437, lat: 34.0522 },
        { name: "Chicago", lng: -87.6298, lat: 41.8781 },
        { name: "Miami", lng: -80.1918, lat: 25.7617 },
        { name: "Las Vegas", lng: -115.1398, lat: 36.1699 },
        { name: "San Francisco", lng: -122.4194, lat: 37.7749 },
        { name: "New Orleans", lng: -90.0715, lat: 29.9511 },
        { name: "Austin", lng: -97.7431, lat: 30.2672 }
      ];

      // Select a random popular city
      const randomIndex = Math.floor(Math.random() * fallbackLocations.length);
      const fallbackLocation = fallbackLocations[randomIndex];
      const { name: locationName, lng: fallbackLng, lat: fallbackLat } = fallbackLocation;

      toast({
        title: "Using Popular Location",
        description: `Showing events in ${locationName}. You can search for a specific location using the search bar above.`,
        duration: 5000
      });

      setCurrentLocation(locationName);

      if (map.current) {
        if (userMarker) userMarker.remove();

        // Add a visual indicator for the fallback location
        const fallbackMarkerHtml = ReactDOMServer.renderToString(<UserLocationMarker color="red" />); // Red for fallback
        const fallbackEl = document.createElement('div');
        fallbackEl.innerHTML = fallbackMarkerHtml;

        const marker = new mapboxgl.Marker({ element: fallbackEl.firstChild as HTMLElement })
          .setLngLat([fallbackLng, fallbackLat])
          .addTo(map.current);
        setUserMarker(marker);

        isProgrammaticMove.current = true;
        map.current.flyTo({
          center: [fallbackLng, fallbackLat],
          zoom: 12,
          duration: 2000,
          essential: true
        });
        setViewState({ longitude: fallbackLng, latitude: fallbackLat, zoom: 12 });

        setTimeout(() => {
           isProgrammaticMove.current = false;
        }, 2100);

        // --- DO *NOT* SET userHasSetLocation HERE ---
        // --- FETCH EVENTS FOR THE *FALLBACK* LOCATION ---
        // event fetching is managed by parent
      }
      // --- END FAILURE BLOCK ---
    } finally {
      setLocationRequested(false);
    }
  };

  const handleMapStyleChange = (newStyle: string) => {
    if (mapStyle !== newStyle && map.current) {
      setMapStyle(newStyle);
      onEventSelect?.(null);

      if (hoverPopup.current) {
        hoverPopup.current.remove();
      }

      console.log(`Changing map style to: ${newStyle}`);
    }
  };

  // --- Render ---

  // Filter events by map bounds if showInViewOnly is enabled
  let visibleEvents = events;
  if (filters.showInViewOnly && map.current) {
    const bounds = (map.current as any).getBounds();
    visibleEvents = events.filter(ev => {
      if (!ev.coordinates || ev.coordinates.length !== 2) return false;
      const [lng, lat] = ev.coordinates;
      return bounds.contains([lng, lat]);
    });
  }

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Map Error: </strong>
            <span className="block sm:inline">{mapError}</span>
          </div>
        </div>
      )}

      {mapLoaded && (
        <MapControls
          filters={filters}
          onLocationSearch={handleLocationSearch}
          currentMapStyle={mapStyle}
          onMapStyleChange={handleMapStyleChange}
          onFindMyLocation={handleGetUserLocation}
          locationRequested={locationRequested}
        />
      )}

      {/* "Search This Area" button is now rendered in MapView.tsx */}
      {mapLoaded && map.current && (
        <MapMarkers
          map={map.current}
          events={visibleEvents}
          onMarkerClick={handleMarkerClick}
          selectedEvent={selectedEvent}
        />
      )}

      {selectedEvent && map.current && (
        <MapPopup
          map={map.current}
          event={selectedEvent}
          onClose={() => onEventSelect?.(null)}
          onViewDetails={onEventSelect}
        />
      )}

      {mapLoaded && (
        <CoordinatesDisplay
          latitude={viewState.latitude}
          longitude={viewState.longitude}
          zoom={viewState.zoom}
        />
      )}

      {/* Location button moved into MapControls */}
    </div>
  );
};
export default MapComponent;
