// src/components/map/MapComponent.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '../../types';
import type { EventFilters } from './components/MapControls';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
import { MapDebugOverlay } from './components/MapDebugOverlay';
import { MapMarkers } from './components/MapMarkers';
import WelcomeHeader from './components/WelcomeHeader';
import DebugOverlay from './overlays/DebugOverlay';
import { MapControlsContainer } from './components/MapControlsContainer';
import TerrainToggle from './components/TerrainToggle';
import { useMapPopup } from './hooks/useMapPopup';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useMapControls } from './hooks/useMapControls';
import { useMapState } from './hooks/useMapState';
import { useMapEvents } from './hooks/useMapEvents';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { toast } from '@/hooks/use-toast';

const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12'
};

interface MapComponentProps {
  events: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  filters: EventFilters;
  mapLoaded: boolean;
  mapboxToken: string; // Add mapboxToken prop
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void;
  onEventSelect?: (event: Event | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onFetchEvents?: (filters: EventFilters, coords: { latitude: number; longitude: number }, radius?: number) => void;
  latitude?: number; // Make latitude optional with default in component
  longitude?: number; // Make longitude optional with default in component
  onAddToPlan?: (event: Event) => void;
  onMapInstance?: (map: mapboxgl.Map) => void; // Correct typings for map instance callback
}

const MapComponent = ({
  events,
  selectedEvent,
  isLoading: isEventsLoading,
  filters,
  mapboxToken, // Destructure the token
  onMapMoveEnd,
  onMapLoad: onMapLoadProp, // Renamed to avoid conflict with hook state
  onEventSelect,
  onLoadingChange,
  onFetchEvents,
  latitude = 39.8283, // Default to US center if not provided
  longitude = -98.5795, // Default to US center if not provided
  onAddToPlan,
  onMapInstance,
  ...props // Rest parameter must be last (no trailing comma)
}: MapComponentProps) => {
  
  // Debug token
  console.log('[MapComponent] Received mapboxToken:', mapboxToken ? mapboxToken.substring(0, 8) + '...' : 'null');
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const [initialViewState] = useState({
    longitude, // Use provided longitude or default
    latitude, // Use provided latitude or default
    zoom: 3.5,
    pitch: 0,
    bearing: 0
  });

  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.dark);
  const [terrainEnabled, setTerrainEnabled] = useState(false);
  const [terrainSourceExists, setTerrainSourceExists] = useState(false);
  const [mapCenter, setMapCenter] = useState<{latitude: number; longitude: number} | null>(null);

  // Use Map state from the hook
  const { map, mapError, mapLoaded: isMapInitialized } = useMapInitialization(
    mapContainer,
    initialViewState,
    mapStyle,
    onMapLoadProp, // Pass the prop function
    mapboxToken // Pass the token here
  );

  // Provide map instance to parent component when available
  useEffect(() => {
    if (map && isMapInitialized && onMapInstance) {
      onMapInstance(map);
    }
  }, [map, isMapInitialized, onMapInstance]);

  const {
    locationRequested,
    handleLocationSearch,
    handleGetUserLocation
  } = useMapControls(
    map,
    onLoadingChange,
    onEventSelect, // Pass onEventSelect so useMapControls can trigger it on location found
    (coords) => {
      if (onFetchEvents) {
        onFetchEvents(filters, coords, filters.distance);
      }
    }
  );

  // Map event handling (moveend, deselect on click empty space)
  useEffect(() => {
    if (!map || !isMapInitialized) return;

    // Track map center for UI state
    const center = map.getCenter();
    setMapCenter({
      latitude: center.lat,
      longitude: center.lng
    });

    // Check if terrain source exists
    try {
      const terrainSource = map.getSource('mapbox-dem');
      setTerrainSourceExists(!!terrainSource);
    } catch (e) {
      // Source doesn't exist yet
      setTerrainSourceExists(false);
    }

    const onMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const isUserInteraction = true; // Assume user interaction for now
      
      // Update local state
      setMapCenter({
        latitude: center.lat,
        longitude: center.lng
      });
      
      // Notify parent component
      onMapMoveEnd(
        { latitude: center.lat, longitude: center.lng },
        zoom,
        isUserInteraction
      );
    };

    // Handle clicks on the map *background* to deselect the event
    const handleMapBackgroundClick = (e: mapboxgl.MapMouseEvent) => {
      // Only handle clicks that aren't on markers
      const features = map.queryRenderedFeatures(e.point);
      
      // Check if we clicked on a marker or popup
      const clickedOnMarker = features.some((feature: any) => {
        if ('layer' in feature && feature.layer) {
          const layerId = feature.layer.id;
          return layerId === 'markers' || 
                 (typeof layerId === 'string' && (layerId.includes('marker') || layerId.includes('cluster')));
        }
        return false;
      });
      
      // If we didn't click on a marker and there's a selected event, deselect it
      if (!clickedOnMarker && selectedEvent && onEventSelect) {
        console.log('Deselecting event from map background click');
        onEventSelect(null);
      }
    };

    // Add event listeners
    map.on('moveend', onMoveEnd);
    map.on('click', handleMapBackgroundClick);

    // Clean up event listeners
    return () => {
      map.off('moveend', onMoveEnd);
      map.off('click', handleMapBackgroundClick);
    };
  }, [map, isMapInitialized, onMapMoveEnd, selectedEvent, onEventSelect]);

  // Add terrain layer when enabled
  useEffect(() => {
    if (!map || !isMapInitialized) return;

    const addTerrainSource = async () => {
      try {
        // Check if the source already exists
        try {
          const source = map.getSource('mapbox-dem');
          if (source) {
            console.log('Terrain source already exists');
            setTerrainSourceExists(true);
            return;
          }
        } catch (e) {
          // Source doesn't exist, continue to add it
        }

        // Add the terrain source
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        } as any);

        setTerrainSourceExists(true);
        console.log('Added terrain source');
      } catch (error) {
        console.error('Error adding terrain source:', error);
      }
    };

    // Add the terrain source when the map is initialized
    addTerrainSource();
  }, [map, isMapInitialized]);

  // Toggle terrain when terrainEnabled changes
  useEffect(() => {
    if (!map || !isMapInitialized || !terrainSourceExists) return;

    try {
      if (terrainEnabled) {
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        console.log('Terrain enabled');
      } else {
        map.setTerrain(null);
        console.log('Terrain disabled');
      }
    } catch (error) {
      console.error('Error toggling terrain:', error);
    }
  }, [map, isMapInitialized, terrainEnabled, terrainSourceExists]);

  // Toggle terrain function
  const toggleTerrain = useCallback(() => {
    setTerrainEnabled(prev => !prev);
  }, []);

  // Set up keyboard navigation for events
  const { focusedIndex } = useKeyboardNavigation({
    events,
    selectedEventId: selectedEvent?.id?.toString() || null,
    onSelectEvent: onEventSelect || (() => {}),
    isEnabled: isMapInitialized && events.length > 0 // Only enable keyboard nav when map is initialized and there are events
  });

  // Event handlers for the popup
  const onClose = useCallback(() => {
    // Use the selectedEvent from state
    if (onEventSelect) {
      onEventSelect(null);
    }
  }, [onEventSelect]);

  const onViewDetails = useCallback((event) => {
    // Navigate to event details page
    if (event && event.id) {
      window.location.href = `/event/${event.id}`;
    }
  }, []);

  const onAddToPlanHandler = useCallback((evt) => {
    if (onAddToPlan) {
      onAddToPlan(evt);
    }
  }, [onAddToPlan]);

  return (
    <div className="w-full h-full relative">
      {/* Map marker categories panel removed as requested */}

      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50 transition-all duration-300 hover:shadow-xl" />

      {/* Loading Overlay */}
      {!isMapInitialized && <MapLoadingOverlay />}

      {/* Map Error Display */}
      {mapError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Map Error: </strong>
            <span className="block sm:inline">{mapError}</span>
            {mapError.includes('Map token configuration error') && (
                 <p className="mt-2 text-sm">This is likely a server issue with fetching the Mapbox token. Please try again later.</p>
            )}
          </div>
        </div>
      )}

      {/* Debug Overlay */}
      {isMapInitialized && map && (
         <DebugOverlay
           events={events}
           clusters={[]} // Clusters are managed by Mapbox layers when enabled, not readily available as GeoJSON array here when using Mapbox clustering.
           mapLoaded={isMapInitialized} // Pass initialized state from hook as mapLoaded
           mapError={mapError}
           viewState={{
             // Use the actual map center and zoom, with fallbacks
             latitude: map.getCenter()?.lat ?? initialViewState.latitude,
             longitude: map.getCenter()?.lng ?? initialViewState.longitude,
             zoom: map.getZoom() ?? initialViewState.zoom,
           }}
           filters={filters}
         />
      )}

      {/* Custom Map Markers (always shown now that clustering is disabled) */}
      {isMapInitialized && map && events.length > 0 && (
        <MapMarkers
          map={map} // Pass the Mapbox map instance
          features={events} // Pass the raw events to MapMarkers
          onMarkerClick={(event) => {
            console.log('Marker clicked:', event.id);
            if (onEventSelect) {
              onEventSelect(event);
            }
          }} // Explicitly define click handler
          selectedFeatureId={selectedEvent?.id || null} // Pass ID of selected event
        />
      )}

      {/* Terrain Toggle only - clustering button removed */}
      {isMapInitialized && map && events.length > 0 && terrainSourceExists && (
        <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
          {/* Terrain Toggle Button */}
          <TerrainToggle
            map={map}
            enabled={terrainEnabled}
            onToggle={toggleTerrain}
          />
        </div>
      )}

      {isMapInitialized && map && (
        <MapControlsContainer
          mapLoaded={isMapInitialized} // Pass initialized state
          viewState={{
             // Use the actual map center and zoom, with fallbacks
             latitude: map.getCenter()?.lat ?? initialViewState.latitude,
             longitude: map.getCenter()?.lng ?? initialViewState.longitude,
             zoom: map.getZoom() ?? initialViewState.zoom,
          }}
          filters={filters}
          currentMapStyle={mapStyle}
          locationRequested={locationRequested}
          onLocationSearch={handleLocationSearch}
          onMapStyleChange={setMapStyle}
          onFindMyLocation={handleGetUserLocation}
        />
      )}

      {/* Welcome Header - Show only on load if no initial location/events */}
       {isMapInitialized && !mapCenter && !isEventsLoading && events.length === 0 && <WelcomeHeader />}

    </div>
  );
};

export default MapComponent;
