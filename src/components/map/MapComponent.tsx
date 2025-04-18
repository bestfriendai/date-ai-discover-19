// src/components/map/MapComponent.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '../../types';
import { EventFilters } from './components/MapControls';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
import { MapDebugOverlay } from './components/MapDebugOverlay';
import MapMarkers from './MapMarkers';
import WelcomeHeader from './components/WelcomeHeader';
import DebugOverlay from './overlays/DebugOverlay';
import { MapControlsContainer } from './components/MapControlsContainer';
import { MapPopup } from './components/MapPopup';
import { useMapPopup } from './hooks/useMapPopup';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useMapControls } from './hooks/useMapControls';
import { useMapState } from './hooks/useMapState';
import { useMapFilters } from './hooks/useMapFilters';
import { useMapEvents } from './hooks/useMapEvents';
import EventMarkerLegend from './markers/EventMarkerLegend';

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
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void;
  onEventSelect?: (event: Event | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onFetchEvents?: (filters: EventFilters, coords: { latitude: number; longitude: number }, radius?: number) => void;
}

const MapComponent = ({
  events,
  selectedEvent,
  isLoading: isEventsLoading,
  filters,
  onMapMoveEnd,
  onMapLoad,
  onEventSelect,
  onLoadingChange,
  onFetchEvents,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [initialViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3.5,
    pitch: 0,
    bearing: 0
  });

  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.dark);

  // Use map initialization hook
  const { map, mapError, mapLoaded } = useMapInitialization(
    mapContainer,
    initialViewState,
    mapStyle,
    onMapLoad
  );

  // Use map controls hook
  const {
    searchTerm,
    setSearchTerm,
    currentLocation,
    locationRequested,
    handleLocationSearch,
    handleGetUserLocation
  } = useMapControls(
    map,
    onLoadingChange,
    onEventSelect,
    (coords) => {
      if (onFetchEvents) {
        onFetchEvents(filters, coords, filters.distance);
      }
    }
  );

  // Use Map Events hook
  const { handleMapMoveEnd: handleMapMoveEndFromHook } = useMapEvents(
     (center) => {
       const { lat, lng } = center as any;
       onMapMoveEnd({ latitude: lat, longitude: lng }, map?.getZoom() ?? initialViewState.zoom, true);
     },
     (zoom) => {
        onMapMoveEnd(map?.getCenter() as any, zoom, true);
     },
     (moved) => {},
     mapLoaded
  );

  useEffect(() => {
      if (map) {
          const onMoveEnd = () => {
              const center = map.getCenter();
              const zoom = map.getZoom();
              handleMapMoveEndFromHook(center as any, zoom, true);
          };

          map.on('moveend', onMoveEnd);

          return () => {
              map.off('moveend', onMoveEnd);
          };
      }
  }, [map, handleMapMoveEndFromHook]);

  // Use Map Popup hook
  const popupRef = useMapPopup(map, selectedEvent, () => onEventSelect?.(null));

  // Function to handle clicks on markers (events)
  const handleMarkerClick = useCallback((event: Event) => {
    if (!map || !onEventSelect) return;

    onEventSelect(event);
    map.flyTo({
      center: event.coordinates as [number, number],
      zoom: Math.max(map.getZoom(), 14),
      duration: 600
    });
  }, [map, onEventSelect]);

  // Handle map background click to deselect
  useEffect(() => {
    if (map && onEventSelect) {
        const handleClick = () => {
            onEventSelect(null);
        };
        map.on('click', handleClick);

        return () => {
            map.off('click', handleClick);
        };
    }
  }, [map, onEventSelect]);

  // For WelcomeHeader conditional
  const mapCenter = map?.getCenter();

  return (
    <div className="w-full h-full relative">
      {/* Map Legend */}
      <EventMarkerLegend />

      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50" />

      {/* Welcome Header (Conditional) */}
      {mapLoaded && !mapCenter && <WelcomeHeader />}

      {/* Debug Overlay (Conditional) */}
      <DebugOverlay
        events={events}
        clusters={[]} // No clusters
        mapLoaded={mapLoaded}
        mapError={mapError}
        viewState={{
          latitude: map?.getCenter()?.lat ?? initialViewState.latitude,
          longitude: map?.getCenter()?.lng ?? initialViewState.longitude,
          zoom: map?.getZoom() ?? initialViewState.zoom,
        }}
        filters={filters}
      />

      {/* Loading Overlay (Conditional) */}
      {!mapLoaded && <MapLoadingOverlay />}

      {/* Map Error Display (Conditional) */}
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

      {/* Map Debug Overlay (Counts) */}
      {mapLoaded && (
         <MapDebugOverlay
           eventsCount={events.length}
           clustersCount={0}
           markersCount={0} // markerMap is not accessible here; can be passed via context if needed
           isVisible={true}
         />
      )}

      {/* Map Markers (One per event) */}
      {mapLoaded && map && events.length > 0 && (
        <MapMarkers
          map={map}
          features={events}
          onMarkerClick={handleMarkerClick}
          selectedFeatureId={selectedEvent?.id || null}
        />
      )}

      {/* Warning for no markers */}
      {mapLoaded && map && events.length === 0 && (
         <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
             <strong className="font-bold">No markers to display: </strong>
             <span className="block sm:inline">Events found but could not be mapped. Check event coordinates.</span>
           </div>
         </div>
       )}

      {/* Map Popup (Conditional, uses selectedEvent from MapView state) */}
      {/* The popup will be managed by the useMapPopup hook */}

      {/* Map Controls (Search bar, Locate, Style Switch) */}
      {mapLoaded && (
        <MapControlsContainer
          mapLoaded={mapLoaded}
          viewState={{
             latitude: map?.getCenter()?.lat ?? initialViewState.latitude,
             longitude: map?.getCenter()?.lng ?? initialViewState.longitude,
             zoom: map?.getZoom() ?? initialViewState.zoom,
          }}
          filters={filters}
          currentMapStyle={mapStyle}
          locationRequested={locationRequested}
          onLocationSearch={handleLocationSearch}
          onMapStyleChange={setMapStyle}
          onFindMyLocation={handleGetUserLocation}
        />
      )}
    </div>
  );
};

export default MapComponent;
