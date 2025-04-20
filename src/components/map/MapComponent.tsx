// src/components/map/MapComponent.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '../../types';
import { EventFilters } from './components/MapControls';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
import { MapDebugOverlay } from './components/MapDebugOverlay';
import MapMarkers from './MapMarkers';
import { useClusterMarkers } from './hooks/useClusterMarkers';
import WelcomeHeader from './components/WelcomeHeader';
import DebugOverlay from './overlays/DebugOverlay';
import { MapControlsContainer } from './components/MapControlsContainer';
import TerrainToggle from './components/TerrainToggle';
import { useMapPopup } from './hooks/useMapPopup';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useMapControls } from './hooks/useMapControls';
import { useMapState } from './hooks/useMapState';
import { useMapFilters } from './hooks/useMapFilters';
import { useMapEvents } from './hooks/useMapEvents';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import EventMarkerLegend from './markers/EventMarkerLegend';
import { MapEventHandlers } from './components/MapEventHandlers';

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
  onAddToPlan?: (event: Event) => void;
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
  onAddToPlan,
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

  const { map, mapError, mapLoaded } = useMapInitialization(
    mapContainer,
    initialViewState,
    mapStyle,
    onMapLoad
  );

  const {
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

  const { handleMapMoveEnd: handleMapMoveEndFromHook } = useMapEvents(
     (center) => {
       if (center && 'lat' in center && 'lng' in center) {
         onMapMoveEnd({ latitude: center.lat, longitude: center.lng }, (map?.getZoom() as number) ?? initialViewState.zoom, true);
       }
     },
     (zoom) => {
        onMapMoveEnd(
          map?.getCenter()
            ? { latitude: (map.getCenter().lat as number), longitude: (map.getCenter().lng as number) }
            : { latitude: initialViewState.latitude, longitude: initialViewState.longitude },
          zoom,
          true
        );
     },
     () => {},
     mapLoaded
  );

  useEffect(() => {
      if (map) {
          const onMoveEnd = () => {
              const center = map.getCenter();
              const zoom = map.getZoom();
              if (center) {
                handleMapMoveEndFromHook({ latitude: center.lat, longitude: center.lng }, zoom, true);
              }
          };

          map.on('moveend', onMoveEnd);

          return () => {
              map.off('moveend', onMoveEnd);
          };
      }
  }, [map, handleMapMoveEndFromHook]);

  useMapPopup({
      map,
      event: selectedEvent,
      onClose: () => {
        if (onEventSelect && selectedEvent) {
          onEventSelect(null);
        }
      },
      onViewDetails: (event) => {
        console.log('[MapComponent] Popup ViewDetails clicked');
        if (onEventSelect && (!selectedEvent || selectedEvent.id !== event.id)) {
          onEventSelect(event);
        }
      },
      onAddToPlan: (evt) => {
        console.log('[MapComponent] Popup AddToPlan clicked for:', evt.id);
        if (onAddToPlan) {
          onAddToPlan(evt);
        }
      }
  });

  const handleMarkerClick = useCallback((event: Event) => {
    if (!map || !onEventSelect) return;
    
    if (!selectedEvent || selectedEvent.id !== event.id) {
      onEventSelect(event);
      const coordinates = event.coordinates as [number, number];
      map.flyTo({
        center: coordinates,
        zoom: Math.max(map.getZoom(), 14),
        duration: 600,
        essential: true
      });
    }
  }, [map, onEventSelect, selectedEvent]);

  useEffect(() => {
    if (map && onEventSelect && selectedEvent) {
      const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        const point = e.point;
        const features = map.queryRenderedFeatures(point, { 
          layers: ['clusters', 'unclustered-point'] 
        });
        
        if (features.length === 0) {
          onEventSelect(null);
        }
      };
      
      map.on('click', handleMapClick);

      return () => {
        map.off('click', handleMapClick);
      };
    }
  }, [map, onEventSelect, selectedEvent]);

  useKeyboardNavigation({
    events,
    selectedEventId: selectedEvent?.id?.toString() || null,
    onSelectEvent: onEventSelect || (() => {}),
    isEnabled: mapLoaded && events.length > 0
  });
  
  const { clusteringEnabled, toggleClustering, isClusterSourceInitialized } = useClusterMarkers(
    map,
    events
  );

  const [terrainEnabled, setTerrainEnabled] = useState(false);

  useEffect(() => {
    if (!map || !mapLoaded) return;

    map.once('style.load', () => {
      try {
        if (!map.getLayer('sky')) {
          map.addLayer({
            'id': 'sky',
            'type': 'sky',
            'paint': {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': 15
            }
          });
        }
      } catch (err) {
        console.warn('[MapComponent] Could not add sky layer:', err);
      }
    });
  }, [map, mapLoaded]);

  const toggleTerrain = useCallback(() => {
    if (!map) return;
    
    try {
      if (!terrainEnabled) {
        map.easeTo({
          pitch: 60,
          bearing: 0,
          duration: 1000
        });
        
        setTerrainEnabled(true);
      } else {
        map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 1000
        });
        
        setTerrainEnabled(false);
      }
    } catch (error) {
      console.error('[MapComponent] Error toggling terrain:', error);
    }
  }, [map, terrainEnabled]);

  const mapCenter = map?.getCenter();

  return (
    <div className="w-full h-full relative">
      <EventMarkerLegend />

      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50 transition-all duration-300 hover:shadow-xl" />

      {mapLoaded && !mapCenter && <WelcomeHeader />}

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

      {!mapLoaded && <MapLoadingOverlay />}

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

      {mapLoaded && (
         <MapDebugOverlay
           eventsCount={events.length}
           clustersCount={0}
           markersCount={0} // markerMap is not accessible here; can be passed via context if needed
           isVisible={true}
         />
      )}

      {mapLoaded && map && events.length > 0 && (
        <MapEventHandlers
          map={map}
          supercluster={clusteringEnabled ? null : null}
          events={events}
          onEventSelect={onEventSelect}
        />
      )}

      {mapLoaded && map && events.length > 0 && !clusteringEnabled && (
        <MapMarkers
          map={map}
          features={events}
          onMarkerClick={handleMarkerClick}
          selectedFeatureId={selectedEvent?.id || null}
        />
      )}

      {mapLoaded && map && events.length > 0 && (
        <div className="absolute bottom-24 right-4 z-10">
          <button
            onClick={toggleClustering}
            className="bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-border/50 hover:bg-background/90 transition-colors"
            title={clusteringEnabled ? "Disable clustering" : "Enable clustering"}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              {clusteringEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="5" />
                  <circle cx="15" cy="15" r="5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
            </div>
          </button>
        </div>
      )}

      {mapLoaded && map && events.length === 0 && (
         <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
             <strong className="font-bold">No markers to display: </strong>
             <span className="block sm:inline">Events found but could not be mapped. Check event coordinates.</span>
           </div>
         </div>
       )}

      {mapLoaded && map && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <div className="bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-border/50 hover:bg-background/90 transition-colors cursor-pointer"
               onClick={() => map.easeTo({ bearing: 0, pitch: 0, duration: 500 })}
               title="Reset rotation">
            <div className="h-8 w-8 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="2" />
                  <path d="m12 22-3-3m3 3 3-3" strokeWidth="2" />
                  <path d="M12 6v6l3 3" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          
          <TerrainToggle
            map={map}
            enabled={terrainEnabled}
            onToggle={toggleTerrain}
          />
        </div>
      )}

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
