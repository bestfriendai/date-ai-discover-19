import EventMarkerLegend from './markers/EventMarkerLegend';


import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '@/types';
import { EventFilters } from './components/MapControls';
import { MapPopup } from './components/MapPopup';
import { MapMarkers } from './components/MapMarkers';
import WelcomeHeader from './components/WelcomeHeader';
import DebugOverlay from './overlays/DebugOverlay';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
import { MapDebugOverlay } from './components/MapDebugOverlay';
import { DirectMapMarkers } from './components/DirectMapMarkers';
import { MapControlsContainer } from './components/MapControlsContainer';
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
  onFetchEvents?: (filters: EventFilters, coords: { latitude: number; longitude: number }) => void;
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
  onFetchEvents,
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
  } = useMapControls(
    map,
    onLoadingChange,
    onEventSelect,
    // Pass callback to fetch events when location is found
    (coords) => {
      if (onFetchEvents) {
        console.log('[MAP_COMPONENT] Location found, fetching events for:', coords);
        onFetchEvents(filters, coords);
      }
    }
  );

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
      <EventMarkerLegend />
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

      {/* Debug overlay */}
      <MapDebugOverlay
        eventsCount={events.length}
        clustersCount={clusters.length}
        markersCount={events.length}
        isVisible={mapLoaded}
      />

      {/* Cluster markers */}
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

      {/* Direct markers */}
      {mapLoaded && map && events.length > 0 && (
        <DirectMapMarkers
          map={map}
          events={events}
          onEventSelect={onEventSelect}
        />
      )}

      {/* Warning for no markers */}
      {mapLoaded && map && events.length > 0 && clusters.length === 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">No markers to display: </strong>
            <span className="block sm:inline">Events found but no valid coordinates for markers.</span>
          </div>
        </div>
      )}

      {selectedEvent && map && (
        <MapPopup
          map={map}
          event={selectedEvent}
          onClose={() => onEventSelect?.(null)}
          onViewDetails={onEventSelect}
        />
      )}

      <MapControlsContainer
        mapLoaded={mapLoaded}
        viewState={viewState}
        filters={filters}
        currentMapStyle={mapStyle}
        locationRequested={locationRequested}
        onLocationSearch={handleLocationSearch}
        onMapStyleChange={handleMapStyleChange}
        onFindMyLocation={handleGetUserLocation}
      />
    </div>
  );
};

export default MapComponent;
