
import { useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '@/types';
import type { EventFilters } from './components/MapControls';
import { MapPopup } from './components/MapPopup';
import { MapMarkers } from './components/MapMarkers';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import WelcomeHeader from './components/WelcomeHeader';
import DebugOverlay from './overlays/DebugOverlay';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
import { MapStyleControls } from './components/MapStyleControls';
import { useSupercluster } from './clustering/useSupercluster';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useMapControls } from './hooks/useMapControls';
import { useMapPopup } from './hooks/useMapPopup';

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
  onEventSelect?: (event: Event | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

const MapComponent = ({
  events,
  selectedEvent,
  isLoading,
  filters,
  mapLoaded: initialMapLoaded,
  onMapMoveEnd,
  onMapLoad,
  onEventSelect,
  onLoadingChange,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState({ 
    longitude: -98.5795, 
    latitude: 39.8283, 
    zoom: 3.5,
    pitch: 0,
    bearing: 0
  });
  
  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.dark);

  const { map, mapError, mapLoaded } = useMapInitialization(
    mapContainer,
    viewState,
    mapStyle,
    onMapLoad
  );

  const handleMapMove = useCallback((newCenter: { lng: number; lat: number }, newZoom: number, userInteraction: boolean) => {
    setViewState(prev => ({
      ...prev,
      longitude: newCenter.lng,
      latitude: newCenter.lat,
      zoom: newZoom
    }));
    onMapMoveEnd({ latitude: newCenter.lat, longitude: newCenter.lng }, newZoom, userInteraction);
  }, [onMapMoveEnd]);

  const {
    searchTerm,
    setSearchTerm,
    currentLocation,
    locationRequested,
    handleLocationSearch,
    handleGetUserLocation
  } = useMapControls(map, onLoadingChange, onEventSelect);

  const bounds = map ? (map.getBounds().toArray().flat() as [number, number, number, number]) : null;
  const { clusters, supercluster } = useSupercluster(events, bounds, viewState.zoom);

  const handleMapStyleChange = (newStyle: string) => {
    if (mapStyle !== newStyle && map) {
      setMapStyle(newStyle);
      if (onEventSelect) onEventSelect(null);
    }
  };

  let visibleEvents = events;
  if (filters.showInViewOnly && map) {
    try {
      const bounds = map.getBounds();
      visibleEvents = events.filter(ev => {
        if (!ev.coordinates || ev.coordinates.length !== 2) return false;
        const [lng, lat] = ev.coordinates;
        return bounds.contains([lng, lat]);
      });
    } catch (e) {
      console.error('Error filtering events by map bounds:', e);
    }
  }

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50" />
      
      {mapLoaded && <WelcomeHeader />}

      <DebugOverlay
        events={clusters}
        clusters={clusters}
        mapLoaded={mapLoaded}
        mapError={mapError}
        viewState={viewState}
        filters={filters}
      />

      {!mapLoaded && <MapLoadingOverlay />}

      {mapError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Map Error: </strong>
            <span className="block sm:inline">{mapError}</span>
          </div>
        </div>
      )}

      {mapLoaded && map && clusters.length > 0 && (
        <MapMarkers
          map={map}
          events={clusters}
          onMarkerClick={(feature: any) => {
            if (feature.properties && feature.properties.cluster) {
              if (!map || !supercluster) return;
              const clusterId = feature.properties.cluster_id;
              try {
                const zoom = supercluster.getClusterExpansionZoom(clusterId);
                map.flyTo({
                  center: feature.geometry.coordinates as [number, number],
                  zoom: zoom,
                  duration: 800,
                  essential: true
                });
              } catch (err) {
                console.error('[CLUSTER] Error expanding cluster:', err);
              }
              if (onEventSelect) onEventSelect(null);
            } else {
              const eventId = feature.properties.id;
              const originalEvent = events.find(e => e.id === eventId);
              if (originalEvent && onEventSelect) {
                onEventSelect(originalEvent);
              }
            }
          }}
          selectedEvent={selectedEvent as any}
        />
      )}

      {selectedEvent && map && (
        <MapPopup
          map={map}
          event={selectedEvent}
          onClose={() => onEventSelect?.(null)}
          onViewDetails={onEventSelect}
        />
      )}

      {mapLoaded && (
        <>
          <CoordinatesDisplay
            latitude={viewState.latitude}
            longitude={viewState.longitude}
            zoom={viewState.zoom}
          />
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
            <MapStyleControls
              currentMapStyle={mapStyle}
              onMapStyleChange={handleMapStyleChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default MapComponent;
