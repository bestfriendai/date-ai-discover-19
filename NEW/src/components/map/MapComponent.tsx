import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '@/types';
import { useMapPopup } from './hooks/useMapPopup';
import { useMapInitialization } from './hooks/useMapInitialization';
import { toast } from '../../hooks/use-toast';

// Map styles
const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12'
};

// Event filters interface
export interface EventFilters {
  categories?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  location?: string;
  radius?: number;
  keyword?: string;
  onCategoriesChange?: (categories: string[]) => void;
  onDatePresetChange?: (preset: string) => void;
}

// MapComponent props
interface MapComponentProps {
  events: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  filters: EventFilters;
  mapLoaded: boolean;
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void;
  onEventSelect?: (event: Event | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onFetchEvents?: (filters: EventFilters, coords: { latitude: number; longitude: number }, radius?: number) => void;
  onAddToPlan?: (event: Event) => void;
  onMapInstance?: (map: mapboxgl.Map) => void;
}

const MapComponent = ({
  events,
  selectedEvent,
  isLoading: isEventsLoading,
  filters,
  onMapMoveEnd,
  onMapLoad: onMapLoadProp,
  onEventSelect,
  onLoadingChange,
  onFetchEvents,
  onAddToPlan,
  onMapInstance,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [initialViewState] = useState({
    longitude: -98.5795, // Centered US
    latitude: 39.8283,
    zoom: 3.5,
    pitch: 0,
    bearing: 0
  });

  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.dark);
  const [locationRequested, setLocationRequested] = useState(false);

  // Use Map state from the hook
  const { map, mapError, mapLoaded: isMapInitialized } = useMapInitialization(
    mapContainer,
    initialViewState,
    mapStyle,
    onMapLoadProp
  );

  // Use popup hook
  useMapPopup(map, selectedEvent, onEventSelect);

  // Pass map instance to parent if needed
  useEffect(() => {
    if (map && onMapInstance) {
      onMapInstance(map);
    }
  }, [map, onMapInstance]);

  // Handle map move events
  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMapMoveEnd(
        { latitude: center.lat, longitude: center.lng },
        zoom,
        true // Assume user interaction
      );
    };

    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onMapMoveEnd]);

  // Handle user location request
  const handleGetUserLocation = useCallback(() => {
    if (!map) return;

    setLocationRequested(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          map.flyTo({
            center: [longitude, latitude],
            zoom: 12,
            essential: true
          });

          // Notify parent about the move
          onMapMoveEnd(
            { latitude, longitude },
            12,
            true
          );

          // Fetch events for this location if handler provided
          if (onFetchEvents) {
            onFetchEvents(filters, { latitude, longitude }, filters.radius);
          }

          setLocationRequested(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: `Could not get your location: ${error.message}`,
            variant: 'destructive'
          });
          setLocationRequested(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        title: 'Location Not Supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive'
      });
      setLocationRequested(false);
    }
  }, [map, onMapMoveEnd, onFetchEvents, filters]);

  // Handle location search
  const handleLocationSearch = useCallback((location: string) => {
    if (!map) return;

    // Use Mapbox Geocoding API to search for location
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}`)
      .then(response => response.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center;
          
          map.flyTo({
            center: [longitude, latitude],
            zoom: 12,
            essential: true
          });

          // Notify parent about the move
          onMapMoveEnd(
            { latitude, longitude },
            12,
            true
          );

          // Fetch events for this location if handler provided
          if (onFetchEvents) {
            onFetchEvents(
              { ...filters, location },
              { latitude, longitude },
              filters.radius
            );
          }
        } else {
          toast({
            title: 'Location Not Found',
            description: `Could not find location: ${location}`,
            variant: 'destructive'
          });
        }
      })
      .catch(error => {
        console.error('Error searching location:', error);
        toast({
          title: 'Search Error',
          description: 'An error occurred while searching for the location',
          variant: 'destructive'
        });
      });
  }, [map, onMapMoveEnd, onFetchEvents, filters]);

  // Add event markers to map
  useEffect(() => {
    if (!map || !isMapInitialized) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add markers for events
    events.forEach(event => {
      if (!event.coordinates) return;

      const [longitude, latitude] = event.coordinates;

      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'event-marker';
      markerElement.style.width = '24px';
      markerElement.style.height = '24px';
      markerElement.style.borderRadius = '50%';
      markerElement.style.backgroundColor = event.isPartyEvent ? '#8b5cf6' : '#3b82f6';
      markerElement.style.border = '2px solid white';
      markerElement.style.cursor = 'pointer';
      markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Add marker to map
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([longitude, latitude])
        .addTo(map);

      // Add click handler
      markerElement.addEventListener('click', () => {
        if (onEventSelect) {
          onEventSelect(event);
        }
      });
    });
  }, [map, events, isMapInitialized, onEventSelect]);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
      />

      {/* Loading overlay */}
      {isEventsLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-white mt-2">Loading events...</p>
          </div>
        </div>
      )}

      {/* Map error message */}
      {mapError && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
          <div className="bg-red-900 p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-white text-lg font-bold mb-2">Map Error</h3>
            <p className="text-white">{mapError}</p>
            <button
              className="mt-4 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
