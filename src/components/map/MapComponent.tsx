
import { useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '@/types';
import { Loader2 } from 'lucide-react';
import type { EventFilters } from './components/MapControls';
import { MapControls } from './components/MapControls';
import { MapPopup } from './components/MapPopup';
import { MapMarkers } from './components/MapMarkers';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import WelcomeHeader from './components/WelcomeHeader';
import DebugOverlay from './overlays/DebugOverlay';
import { useSupercluster } from './clustering/useSupercluster';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useMapControls } from './hooks/useMapControls';

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

  // Initialize map using custom hook
  const { map, mapError, mapLoaded } = useMapInitialization(
    mapContainer,
    viewState,
    mapStyle,
    onMapLoad
  );

  // Map controls using custom hook
  const {
    searchTerm,
    setSearchTerm,
    currentLocation,
    locationRequested,
    handleLocationSearch,
    handleGetUserLocation
  } = useMapControls(map, onLoadingChange, onEventSelect);

  // Get clusters using existing hook
  const bounds = map ? (map as any).getBounds().toArray().flat() as [number, number, number, number] : null;
  const { clusters, supercluster } = useSupercluster(events, bounds, viewState.zoom);

  // Handle map style changes
  const handleMapStyleChange = (newStyle: string) => {
    if (mapStyle !== newStyle && map) {
      setMapStyle(newStyle);
      onEventSelect?.(null);
    }
  };

  // Filter events by map bounds if showInViewOnly is enabled
  let visibleEvents = events;
  if (filters.showInViewOnly && map) {
    try {
      const bounds = (map as any).getBounds();
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
              onEventSelect?.(null);
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
        <CoordinatesDisplay
          latitude={viewState.latitude}
          longitude={viewState.longitude}
          zoom={viewState.zoom}
        />
      )}
    </div>
  );
};

export default MapComponent;
