
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
import { MapMarkers } from './components/MapMarkers';

// Define map styles
const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

interface MapComponentProps {
  onEventSelect?: (event: Event) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onEventsChange?: (events: Event[]) => void;
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

const MapComponent = ({ onEventSelect, onLoadingChange, onEventsChange }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const hoverPopup = useRef<mapboxgl.Popup | null>(null);
  const isProgrammaticMove = useRef(false);
  // Center on the US/globe by default
  const [viewState, setViewState] = useState({ longitude: -98.5795, latitude: 39.8283, zoom: 3.5 });
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
const [showInViewOnly, setShowInViewOnly] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userHasSetLocation, setUserHasSetLocation] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'grid'>('list');
  const [locationRequested, setLocationRequested] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('New York');
  const [filters, setFilters] = useState<EventFilters>({});
  const [mapHasMoved, setMapHasMoved] = useState(false);
  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.dark);
  const [mapError, setMapError] = useState<string | null>(null);

  // --- Event Fetching ---
  // Cache for event results to avoid redundant API calls
  const eventCache = useRef<{[key: string]: {timestamp: number, events: Event[]}}>({});
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache expiry

  // Optimize event fetching with caching and reduced radius
  const fetchEvents = useCallback(async (latitude: number, longitude: number, radius: number = 30, currentFilters: EventFilters = {}) => {
    // Validate coordinates before fetching
    const isValidCoord = (
      typeof latitude === 'number' && typeof longitude === 'number' &&
      !isNaN(latitude) && !isNaN(longitude) &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );

    // If coordinates are invalid, use default coordinates for New York
    if (!isValidCoord) {
      console.log('[DEBUG] Invalid coordinates, using default coordinates for New York');
      latitude = 40.7128;
      longitude = -74.0060;
    }

    // Create a cache key based on location and filters
    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${radius},${JSON.stringify(currentFilters)}`;
    const now = Date.now();

    // Check if we have a valid cached result
    if (eventCache.current[cacheKey] &&
        now - eventCache.current[cacheKey].timestamp < CACHE_EXPIRY) {
      console.log('[DEBUG] Using cached events data');
      setEvents(eventCache.current[cacheKey].events);
      onEventsChange?.(eventCache.current[cacheKey].events);
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);

    try {
      const startDate = currentFilters.dateRange?.from ? formatISO(currentFilters.dateRange.from, { representation: 'date' }) : undefined;
      const endDate = currentFilters.dateRange?.to ? formatISO(currentFilters.dateRange.to, { representation: 'date' }) : undefined;

      const rawResponse = await searchEvents({
        latitude,
        longitude,
        radius: currentFilters.distance ?? radius,
        startDate,
        endDate,
        categories: currentFilters.categories
      });

      console.log('[Map][DEBUG] Raw backend response:', rawResponse);

      if (rawResponse && rawResponse.events) {
        const { events: fetchedEvents, sourceStats } = rawResponse;

        let filteredEvents = fetchedEvents;

        // Client-side filtering for priceRange if backend does not support it
        if (currentFilters.priceRange) {
          const [minPrice, maxPrice] = currentFilters.priceRange;
          filteredEvents = filteredEvents.filter(ev => {
            if (typeof ev.price === 'number') {
              return ev.price >= minPrice && ev.price <= maxPrice;
            }
            if (typeof ev.price === 'string') {
              const priceNum = parseFloat(ev.price.replace(/[^0-9.]/g, ''));
              return !isNaN(priceNum) && priceNum >= minPrice && priceNum <= maxPrice;
            }
            return true;
          });
        }

        // Store in cache for future use
        eventCache.current[cacheKey] = {
          timestamp: Date.now(),
          events: filteredEvents
        };

        setEvents(filteredEvents);
        onEventsChange?.(filteredEvents);

        if (sourceStats) {
          console.log('[Events][SourceStats]', sourceStats);
        }

        // Clear previous errors
        setMapError(null);

        // Show toast if no events found
        if (fetchedEvents.length === 0) {
          toast({
            title: "No events found",
            description: "Try adjusting your search criteria or location.",
            variant: "default"
          });
        }
      } else {
        // Handle empty response
        setEvents([]);
        onEventsChange?.([]);
        setMapError("No events data returned.");
      }
    } catch (error) {
      console.error('Error fetching events:', error);

      // Try to extract more detailed error information
      let errorMessage = "Failed to fetch events.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }

      toast({
        title: "Error",
        description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
        variant: "destructive"
      });

      setMapError(errorMessage);

      // Still show any events we might have cached
      if (events.length === 0) {
        setEvents([]);
        onEventsChange?.([]);
      }
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [onEventsChange, onLoadingChange]);

  // --- Filter Handling ---
  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setMapHasMoved(false);
    fetchEvents(viewState.latitude, viewState.longitude, 30, updatedFilters);
  }, [filters, viewState.latitude, viewState.longitude, fetchEvents]);

  // --- Location Handling ---
  const { getUserLocation } = useUserLocation();

  // Handler for when a marker is clicked
  const handleMarkerClick = (eventItem: Event) => {
    setSelectedEvent(eventItem);
    onEventSelect?.(eventItem);
  };
  // Define the search callback function
  const registerSearchCallback = useCallback(() => {
    (window as any).mapSearchCallback = (params: any) => {
      console.log('[Map] Search callback received params:', params);
      if (params.latitude && params.longitude) {
        fetchEvents(params.latitude, params.longitude, params.radius || 30, {
          categories: params.categories,
          dateRange: params.startDate && params.endDate ? {
            from: new Date(params.startDate),
            to: new Date(params.endDate)
          } : undefined
        });
      } else if (params.location) {
        // Use the location search function
        if (params.location.trim() && mapboxgl.accessToken) {
          setLoading(true);
          onLoadingChange?.(true);
          setMapHasMoved(false);

          const location = params.location;

          toast({
            title: "Searching",
            description: `Looking for events near ${location}...`
          });

          // Geocode the location and fetch events
          const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
          fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
              if (data.features?.length) {
                const feature = data.features[0];
                const [longitude, latitude] = feature.center;
                const placeName = feature.text || location;

                setCurrentLocation(placeName);
                setUserHasSetLocation(true);

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
                  fetchEvents(latitude, longitude, 30, filters);
                }
              } else {
                toast({ title: "Location not found", variant: "destructive" });
                setLoading(false);
                onLoadingChange?.(false);
              }
            })
            .catch(error => {
              console.error('Geocoding error:', error);
              toast({ title: "Search Error", variant: "destructive" });
              setLoading(false);
              onLoadingChange?.(false);
            });
        }
      }
    };
  }, [fetchEvents, filters, isProgrammaticMove, map, onLoadingChange, setCurrentLocation, setLoading, setMapHasMoved, setUserHasSetLocation, setViewState, toast]);

  // Register the search callback on the window object
  useEffect(() => {
    registerSearchCallback();

    return () => {
      // Clean up the callback when component unmounts
      delete (window as any).mapSearchCallback;
    };
  }, [registerSearchCallback]);

  // --- Map Initialization Effect ---
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        console.log('[MAP] Starting map initialization...');

        // Clear cached token to ensure we always get a fresh one
        localStorage.removeItem('mapbox_token');

        // Get the fallback token from the window object (defined in index.html)
        // This is a public token with limited usage
        const FALLBACK_MAPBOX_TOKEN = (window as any).FALLBACK_MAPBOX_TOKEN || 'pk.eyJ1IjoiYmVzdGZyaWVuZGFpIiwiYSI6ImNsdGJtZnRnZzBhcGoya3BjcWVtbWJvdXcifQ.Zy8lxHYC_-4TQU_l-l_QQA';

        let mapboxToken: string;

        try {
          // Get a fresh token from the server
          console.log('[MAP] Fetching Mapbox token from server...');
          const { data, error } = await supabase.functions.invoke('get-mapbox-token');

          if (!isMounted) {
            console.log('[MAP] Component unmounted during token fetch');
            return;
          }

          if (error) {
            console.error('[MAP] Error fetching Mapbox token:', error);
            throw error;
          }

          if (!data?.MAPBOX_TOKEN) {
            console.error('[MAP] No Mapbox token returned from server');
            throw new Error('No Mapbox token returned from server');
          }

          mapboxToken = data.MAPBOX_TOKEN;
          console.log('[MAP] Successfully retrieved token from server');
        } catch (tokenError) {
          console.error('[MAP] Using fallback Mapbox token due to error:', tokenError);
          mapboxToken = FALLBACK_MAPBOX_TOKEN;
        }

        if (!mapContainer.current) {
          console.error('[MAP] Map container not found');
          throw new Error('Map container not found');
        }
        console.log('[MAP] Successfully retrieved Mapbox token');

        // Check if mapboxgl is available
        if (typeof mapboxgl === 'undefined') {
          console.error('[MAP] Mapbox GL JS library is not loaded');
          throw new Error('Mapbox GL JS library is not loaded. Please refresh the page or check your internet connection.');
        }

        // Set the token
        mapboxgl.accessToken = mapboxToken;
        console.log('[MAP] Mapbox token set successfully');

        // Performance optimizations for the map
        console.log('[MAP] Creating Mapbox instance with token:', mapboxToken.substring(0, 8) + '...');
        console.log('[MAP] Map container:', mapContainer.current);
        console.log('[MAP] Map style:', mapStyle);
        console.log('[MAP] Initial coordinates:', [viewState.longitude, viewState.latitude]);

        try {
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom,
            pitch: 45,
            bearing: -17.6,
            attributionControl: false,
            preserveDrawingBuffer: true,
            fadeDuration: 0 // Reduce fade animations for better performance
          });

          console.log('[MAP] Mapbox instance created successfully');
        } catch (mapError) {
          console.error('[MAP] Error creating Mapbox instance:', mapError);
          throw mapError;
        }

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

          map.current.on('load', () => {
            console.log('[MAP] Map loaded event fired');
            if (!isMounted || !map.current) {
              console.log('[MAP] Component unmounted during map load or map instance missing');
              return;
            }
            setMapLoaded(true);
            console.log('[MAP] Map successfully loaded and ready');
            // Do not fetch events until user provides a location
          });

          map.current.on('error', (e) => {
            console.error('[MAP] Mapbox error event:', e);
            setMapError(`Mapbox error: ${e.error?.message || 'Unknown error'}`);
          });

          map.current.on('move', (e) => {
            if (!map.current) return;

            try {
              const center = map.current.getCenter();
              setViewState({
                longitude: parseFloat(center.lng.toFixed(4)),
                latitude: parseFloat(center.lat.toFixed(4)),
                zoom: parseFloat(map.current.getZoom().toFixed(2))
              });

              if (!isProgrammaticMove.current && mapLoaded && (e.originalEvent || (e as any).isUserInteraction)) {
                setMapHasMoved(true);
              }
            } catch (moveError) {
              console.error('[MAP] Error during map move:', moveError);
            }
          });

          console.log('[MAP] Map event listeners set up successfully');
        } catch (eventError) {
          console.error('[MAP] Error setting up map event listeners:', eventError);
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

        if (error instanceof Error) {
          errorMessage = `Map initialization failed: ${error.message}`;
          errorDetails = error.stack || '';
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = `Map initialization failed: ${JSON.stringify(error)}`;
        }

        console.error('[MAP] Error initializing map:', error);
        console.error('[MAP] Error details:', errorDetails);

        // Set error state and show toast
        setMapError(errorMessage);
        toast({
          title: "Map initialization failed",
          description: errorMessage,
          variant: "destructive"
        });

        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (userMarker) userMarker.remove();
      if (map.current) map.current.remove();
    };
  }, [filters, mapLoaded, mapStyle]);

  // --- Effect to Update Map Bounds Based on Events ---
  useEffect(() => {
    if (!map.current || !mapLoaded || loading || mapHasMoved || events.length === 0) return;

    try {
      const geojsonData = eventsToGeoJSON(events);

      if (geojsonData.features.length > 0) {
        try {
          isProgrammaticMove.current = true;
          const bounds = bbox(geojsonData) as mapboxgl.LngLatBoundsLike;

          map.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
            duration: 1000
          });

          setTimeout(() => {
            isProgrammaticMove.current = false;
          }, 1100);
        } catch (e) {
          console.error("Error fitting bounds:", e);
        }
      }
    } catch (err) {
      console.error("Error updating map bounds:", err);
    }
  }, [events, mapLoaded, loading, mapHasMoved]);

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
    setMapHasMoved(false);
    const center = map.current.getCenter();
    fetchEvents(center.lat, center.lng, 30, filters);
    toast({
      title: "Searching Area",
      description: "Fetching events for the current map view."
    });
  };

  const handleClearSearch = () => {
    setMapHasMoved(false);
    fetchEvents(viewState.latitude, viewState.longitude, 30, filters);
  };

  const handleViewChange = (view: 'list' | 'grid') => {
    setCurrentView(view);
  };

  const handleLocationSearch = async (location: string) => {
    if (!location.trim() || !mapboxgl.accessToken) return;

    setLoading(true);
    onLoadingChange?.(true);
    setMapHasMoved(false);

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
        setUserHasSetLocation(true);

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
          await fetchEvents(latitude, longitude, 30, filters);
        }
      } else {
        toast({ title: "Location not found", variant: "destructive" });
        setLoading(false);
        onLoadingChange?.(false);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({ title: "Search Error", variant: "destructive" });
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleGetUserLocation = async () => {
    setLocationRequested(true);
    setMapHasMoved(false);

    try {
      const [longitude, latitude] = await getUserLocation();

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

      setTimeout(() => {
        if (map.current) {
          map.current.easeTo({
            pitch: 50,
            bearing: Math.random() * 60 - 30,
            duration: 1500
          });
        }
        isProgrammaticMove.current = false;
      }, 100);

      try {
        // Reverse geocode
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`);
        const data = await response.json();

        if (data.features?.length) {
          const place = data.features.find((f: any) => f.place_type.includes('place') || f.place_type.includes('locality'));
          if (place) setCurrentLocation(place.text);
        }
      } catch (geoError) {
        console.error('Reverse geocode error:', geoError);
      }

      setUserHasSetLocation(true);
      fetchEvents(latitude, longitude, 30, filters);
    } catch (error) {
      console.error('Get location error:', error);

      const fallbackLng = -73.9712, fallbackLat = 40.7831;

      if (map.current) {
        if (userMarker) userMarker.remove();

        const fallbackMarkerHtml = ReactDOMServer.renderToString(<UserLocationMarker color="red" />);
        const fallbackEl = document.createElement('div');
        fallbackEl.innerHTML = fallbackMarkerHtml;

        const marker = new mapboxgl.Marker({ element: fallbackEl.firstChild as HTMLElement })
          .setLngLat([fallbackLng, fallbackLat])
          .addTo(map.current);

        setUserMarker(marker);

        isProgrammaticMove.current = true;
        map.current.jumpTo({ center: [fallbackLng, fallbackLat], zoom: 14 });

        setTimeout(() => {
          isProgrammaticMove.current = false;
        }, 100);

        setViewState({ longitude: fallbackLng, latitude: fallbackLat, zoom: 14 });
        setUserHasSetLocation(true);
        fetchEvents(fallbackLat, fallbackLng, 30, filters);
      }
    } finally {
      setLocationRequested(false);
    }
  };

  const handleMapStyleChange = (newStyle: string) => {
    if (mapStyle !== newStyle && map.current) {
      setMapStyle(newStyle);
      setSelectedEvent(null);

      if (hoverPopup.current) {
        hoverPopup.current.remove();
      }

      console.log(`Changing map style to: ${newStyle}`);
    }
  };

  // --- Render ---

  // Filter events by map bounds if showInViewOnly is enabled
  let visibleEvents = events;
  if (showInViewOnly && map.current) {
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
          currentView={currentView}
          onViewChange={handleViewChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onLocationSearch={handleLocationSearch}
          onSearchClear={handleClearSearch}
          currentMapStyle={mapStyle}
          onMapStyleChange={handleMapStyleChange}
          onFindMyLocation={handleGetUserLocation}
          locationRequested={locationRequested}
          showInViewOnly={showInViewOnly}
          onShowInViewOnlyChange={setShowInViewOnly}
        />
      )}

      {mapLoaded && mapHasMoved && (
        <motion.div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
        >
          <Button
            onClick={handleSearchThisArea}
            className="shadow-lg bg-background/90 hover:bg-background backdrop-blur-sm border border-border/50"
          >
            <Search className="mr-2 h-4 w-4" /> Search This Area
          </Button>
        </motion.div>
      )}

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
          onClose={() => setSelectedEvent(null)}
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
