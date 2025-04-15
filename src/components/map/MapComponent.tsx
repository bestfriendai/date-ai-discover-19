
import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { MapControls } from './components/MapControls';
import { MapMarkers } from './components/MapMarkers';
import { MapPopup } from './components/MapPopup';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin } from 'lucide-react';
import { searchEvents } from '@/services/eventService';
import { Button } from '@/components/ui/button';

interface MapComponentProps {
  onEventSelect?: (event: Event) => void;
}

const MapComponent = ({ onEventSelect }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -73.9712,
    latitude: 40.7831,
    zoom: 14
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'grid'>('list');
  const [locationRequested, setLocationRequested] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('New York');

  const fetchEvents = useCallback(async (latitude: number, longitude: number, radius: number = 10) => {
    try {
      setLoading(true);

      // Use our new searchEvents service
      const events = await searchEvents({
        latitude,
        longitude,
        radius
      });

      setEvents(events);

      if (events.length > 0) {
        toast({
          title: "Events loaded",
          description: `Found ${events.length} events near your location`,
        });
      } else {
        toast({
          title: "No events found",
          description: "Try adjusting your search radius or location",
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserLocation = async (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported by your browser.');
        toast({
          title: "Geolocation not supported",
          description: "Your browser doesn't support geolocation. Using default location.",
          variant: "destructive"
        });
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      const successCallback = (position: GeolocationPosition) => {
        console.log('Geolocation success:', position.coords);
        resolve([position.coords.longitude, position.coords.latitude]);
      };

      const errorCallback = (error: GeolocationPositionError) => {
        console.error('Geolocation error:', error.code, error.message);
        let errorMessage = "";

        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location services in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please try again later.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage = "An unknown error occurred while getting your location.";
        }

        toast({
          title: "Location error",
          description: errorMessage,
          variant: "destructive"
        });
        reject(error);
      };

      const options = {
        enableHighAccuracy: true,  // Use GPS if available
        timeout: 10000,           // Time to wait for a position
        maximumAge: 0             // Don't use a cached position
      };

      // Request the user's position
      navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        options
      );
    });
  };

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true);
        console.log('Initializing map...');

        // Get Mapbox token from Supabase function
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) {
          console.error('Error getting Mapbox token:', error);
          throw error;
        }

        if (data?.MAPBOX_TOKEN && mapContainer.current) {
          console.log('Mapbox token received, creating map');
          mapboxgl.accessToken = data.MAPBOX_TOKEN;

          // Create the map instance
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom,
            pitch: 45,
            bearing: -17.6,
            attributionControl: false,
            preserveDrawingBuffer: true
          });

          // Add navigation controls
          map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

          // Add geolocate control (this adds a built-in location button)
          const geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true
          });
          map.current.addControl(geolocateControl, 'bottom-right');

          // Wait for the map to load
          map.current.on('load', () => {
            console.log('Map loaded successfully');
            setMapLoaded(true);
            setLoading(false);

            // Fetch events for the default location
            fetchEvents(viewState.latitude, viewState.longitude);

            // Show a toast prompting the user to enable location for better results
            toast({
              title: "Enable location",
              description: "Click the location button for events near you",
            });
          });

          // Handle map move events to update coordinates display
          map.current.on('move', () => {
            if (!map.current) return;
            const center = map.current.getCenter();
            setViewState({
              longitude: parseFloat(center.lng.toFixed(4)),
              latitude: parseFloat(center.lat.toFixed(4)),
              zoom: parseFloat(map.current.getZoom().toFixed(2))
            });
          });
        } else {
          console.error('No Mapbox token or map container');
          throw new Error('Could not initialize map: missing token or container');
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Map initialization failed",
          description: "Could not load the map. Please refresh the page.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (userMarker) {
        console.log('Cleaning up user marker');
        userMarker.remove();
      }
      if (map.current) {
        console.log('Cleaning up map');
        map.current.remove();
      }
    };
  }, [fetchEvents]);

  const handleViewChange = (view: 'list' | 'grid') => {
    setCurrentView(view);
  };

  const handleToggleFilters = () => {
    toast({
      title: "Filters",
      description: "Filter functionality will be implemented soon.",
    });
  };

  const handleLocationSearch = (location: string) => {
    if (!location.trim()) return;

    toast({
      title: "Searching",
      description: `Searching for events near ${location}...`,
    });

    // This would typically use a geocoding API to convert the location string to coordinates
    // For now, we'll just use a mock implementation
    setTimeout(() => {
      const randomLat = 40.7 + (Math.random() * 0.2);
      const randomLng = -74 + (Math.random() * 0.2);

      if (map.current) {
        map.current.easeTo({
          center: [randomLng, randomLat],
          zoom: 13,
          duration: 1500,
          essential: true
        });

        setViewState({ longitude: randomLng, latitude: randomLat, zoom: 13 });
        fetchEvents(randomLat, randomLng);
      }
    }, 1000);
  };

  const handleGetUserLocation = async () => {
    setLocationRequested(true);
    console.log('Getting user location...');

    try {
      // Get user location
      const [longitude, latitude] = await getUserLocation();
      console.log('User location obtained:', longitude, latitude);

      // Remove existing marker if any
      if (userMarker) {
        console.log('Removing existing user marker');
        userMarker.remove();
      }

      // Make sure the map is initialized
      if (!map.current) {
        console.error('Map is not initialized');
        toast({
          title: "Map error",
          description: "Map is not ready. Please try again.",
          variant: "destructive"
        });
        setLocationRequested(false);
        return;
      }

      console.log('Creating user marker');
      // Create a custom element for the user marker
      const el = document.createElement('div');
      el.className = 'flex items-center justify-center';
      el.innerHTML = `
        <div class="relative">
          <div class="w-6 h-6 bg-blue-600 rounded-full animate-pulse"></div>
          <div class="w-12 h-12 bg-blue-600/30 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
        </div>
      `;

      // Create and add the user marker to the map
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map.current);
      setUserMarker(marker);

      console.log('Moving map to user location');
      // First update the view state
      setViewState({ longitude, latitude, zoom: 14 });

      // Then center the map on the user's location
      map.current.jumpTo({
        center: [longitude, latitude],
        zoom: 14
      });

      // Add a smooth animation after the jump
      setTimeout(() => {
        if (map.current) {
          map.current.easeTo({
            pitch: 50,
            bearing: Math.random() * 60 - 30, // random bearing for visual interest
            duration: 1500
          });
        }
      }, 100);

      // Try to get the location name using reverse geocoding
      try {
        console.log('Getting location name via reverse geocoding');
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          // Find the place name (usually city or neighborhood)
          const place = data.features.find((f: any) =>
            f.place_type.includes('place') ||
            f.place_type.includes('locality') ||
            f.place_type.includes('neighborhood')
          );
          if (place) {
            console.log('Location name found:', place.text);
            setCurrentLocation(place.text);
          } else {
            console.log('No suitable place name found in response');
          }
        } else {
          console.log('No features found in geocoding response');
        }
      } catch (error) {
        console.error('Error getting location name:', error);
      }

      // Fetch events near the user's location
      console.log('Fetching events near user location');
      fetchEvents(latitude, longitude);

      toast({
        title: "Location found",
        description: "Showing events near your current location",
      });
    } catch (error) {
      console.error('Error getting user location:', error);

      // Fallback to a default location (New York) if geolocation fails
      const fallbackLng = -73.9712;
      const fallbackLat = 40.7831;

      // Show error toast
      toast({
        title: "Location access failed",
        description: "Using default location. Please check your browser settings to enable location access.",
        variant: "destructive"
      });

      // If we have a map, center it on the fallback location
      if (map.current) {
        console.log('Using fallback location:', fallbackLat, fallbackLng);

        // Create a fallback marker
        const el = document.createElement('div');
        el.className = 'flex items-center justify-center';
        el.innerHTML = `
          <div class="relative">
            <div class="w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
            <div class="w-12 h-12 bg-red-500/30 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
          </div>
        `;

        // Remove existing marker if any
        if (userMarker) userMarker.remove();

        // Add the fallback marker
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([fallbackLng, fallbackLat])
          .addTo(map.current);
        setUserMarker(marker);

        // Center the map on the fallback location
        map.current.jumpTo({
          center: [fallbackLng, fallbackLat],
          zoom: 14
        });

        // Update the view state
        setViewState({ longitude: fallbackLng, latitude: fallbackLat, zoom: 14 });

        // Fetch events for the fallback location
        fetchEvents(fallbackLat, fallbackLng);
      }
    } finally {
      setLocationRequested(false);
    }
  };

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainer}
        className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50"
      />

      {loading && !mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      <MapControls
        currentView={currentView}
        onViewChange={handleViewChange}
        onToggleFilters={handleToggleFilters}
        onLocationSearch={handleLocationSearch}
      />

      {events.length > 0 && map.current && mapLoaded && (
        <MapMarkers
          map={map.current}
          events={events}
          onMarkerClick={(event) => {
            setSelectedEvent(event);
            if (onEventSelect) onEventSelect(event);
          }}
          selectedEvent={selectedEvent}
        />
      )}

      {selectedEvent && map.current && (
        <MapPopup
          map={map.current}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewDetails={() => onEventSelect?.(selectedEvent)}
        />
      )}

      <CoordinatesDisplay
        longitude={viewState.longitude}
        latitude={viewState.latitude}
        zoom={viewState.zoom}
      />

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <div className="bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg rounded-full px-4 py-2 flex items-center gap-3">
          <div className="text-sm font-medium">{currentLocation}</div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            onClick={handleGetUserLocation}
            disabled={locationRequested}
            title="Use my current location"
          >
            {locationRequested ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
