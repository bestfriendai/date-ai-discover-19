// src/components/map/MapComponent.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '../../types';
import type { EventFilters } from './components/MapControls';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
// import { MapDebugOverlay } from './components/MapDebugOverlay';
import MapMarkers from './components/MapMarkers'; // Fixed import path
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
// import EventMarkerLegend from './markers/EventMarkerLegend'; // Removed as requested
// import { MapEventHandlers } from './components/MapEventHandlers'; // Logic moved into MapComponent or hooks
import { toast } from '@/hooks/use-toast'; // Import toast

const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12'
};

const EVENTS_SOURCE_ID = 'events-source';
const EVENTS_LAYER_ID = 'events-layer';

interface MapComponentProps {
  events: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  filters: EventFilters;
  mapLoaded: boolean; // This comes from the parent MapView component
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void; // This comes from the parent MapView component
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
  onMapLoad: onMapLoadProp, // Renamed to avoid conflict with hook state
  onEventSelect,
  onLoadingChange,
  onFetchEvents,
  onAddToPlan,
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

  // Use Map state from the hook
  const { map, mapError, mapLoaded: isMapInitialized } = useMapInitialization(
    mapContainer,
    initialViewState,
    mapStyle,
    onMapLoadProp // Pass the prop function
  );

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
  const { handleMapMoveEnd: handleMapMoveEndFromHook } = useMapEvents(
     (center) => {
       if (isMapInitialized && map) {
          const currentZoom = map.getZoom();
          onMapMoveEnd(center, currentZoom, true); // Pass user interaction flag
       }
     },
     (zoom) => {
        if (isMapInitialized && map) {
           const center = map.getCenter();
           onMapMoveEnd({ latitude: center.lat, longitude: center.lng }, zoom, true); // Pass user interaction flag
        }
     },
     // onSearchThisArea logic needs map and filters
     () => {
        if (map && isMapInitialized && onFetchEvents) {
          const center = map.getCenter();
          if (center) {
            toast({
              title: "Searching this area",
              description: "Looking for events in the current map view...",
            });
            onFetchEvents(filters, { latitude: center.lat, longitude: center.lng }, filters.distance);
            // mapHasMoved state is handled in the parent MapView component
          }
        }
     },
     isMapInitialized // Depends on map being initialized
  );

  // Clustering is disabled - we use custom React markers instead
  const clusteringEnabled = false;

  // Attach Mapbox-specific event listeners like moveend and click (for deselect)
  useEffect(() => {
      if (!map || !isMapInitialized) return;

      const onMoveEnd = () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          // Assuming user interaction for moveend for simplicity in this handler
          if (center) {
            handleMapMoveEndFromHook({ latitude: center.lat, longitude: center.lng }, zoom, true);
          }
      };

      // Handle clicks on the map *background* to deselect the event
      const handleMapBackgroundClick = (e: mapboxgl.MapMouseEvent) => {
        // Query layers that might be clickable. Only query if they exist.
        const clickableLayers = [];
         if (clusteringEnabled && map.getLayer('clusters')) clickableLayers.push('clusters');
         if (clusteringEnabled && map.getLayer('unclustered-point')) clickableLayers.push('unclustered-point');
         // Add other potentially clickable layers if any

        const features = clickableLayers.length > 0
            ? map.queryRenderedFeatures(e.point, { layers: clickableLayers })
            : [];

        // If no clickable features were found at the click point AND an event is currently selected, deselect it.
        if (features.length === 0 && selectedEvent && onEventSelect) {
          console.log('[MapComponent] Clicked empty space, deselecting event.');
          onEventSelect(null);
        }
         // Note: Clicks *on* features (clusters or individual points when clustering is active)
         // are handled by the layer-specific click handlers added below.
         // Clicks on custom HTML markers (when clustering is disabled) are handled by their React `onClick` props.
      };

      // Add general map event listeners
      map.on('moveend', onMoveEnd);
      map.on('click', handleMapBackgroundClick);


      // Cleanup function for these listeners
      return () => {
          map.off('moveend', onMoveEnd);
          map.off('click', handleMapBackgroundClick);
      };
  }, [map, isMapInitialized, handleMapMoveEndFromHook, selectedEvent, onEventSelect, clusteringEnabled]); // Re-run if map, loaded state, handlers, selected event, or clustering state change

  // Effect to handle switching between DOM markers and WebGL layers based on event count
  useEffect(() => {
    if (!map || !isMapInitialized) return;

    const useWebGL = events.length >= 100;

    if (useWebGL) {
      // Create GeoJSON object
      const geojsonObject: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: events.map(event => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: event.coordinates as [number, number] // Assuming coordinates are [lng, lat]
          },
          properties: {
            id: event.id,
            title: event.title,
            category: event.category
          }
        }))
      };

      // Add or update source
      const source = map.getSource(EVENTS_SOURCE_ID);
      if (!source) {
        map.addSource(EVENTS_SOURCE_ID, {
          type: 'geojson',
          data: geojsonObject,
          cluster: true, // Enable clustering
          clusterMaxZoom: 16, // Max zoom to cluster points on
          clusterRadius: 40 // Radius of each cluster when clustering points (defaults to 50)
        });
        console.log('[MapComponent] Added GeoJSON source with clustering for events');
      } else {
        (source as mapboxgl.GeoJSONSource).setData(geojsonObject);
        console.log('[MapComponent] Updated GeoJSON source with clustering for events');
      }

      // Add layers for clusters and unclustered points
      // Cluster layer
      if (!map.getLayer('clusters')) {
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: EVENTS_SOURCE_ID,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6', // Blue for small clusters
              100, // If point_count is 100 or more...
              '#f1f075', // Yellow
              750, // If point_count is 750 or more...
              '#f28cb1' // Pink
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20, // Radius 20 for point_count < 100
              100, // If point_count is 100 or more...
              30, // Radius 30
              750, // If point_count is 750 or more...
              40 // Radius 40
            ]
          }
        });
        console.log('[MapComponent] Added clusters layer');
      }

      // Cluster count layer
      if (!map.getLayer('cluster-count')) {
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: EVENTS_SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });
        console.log('[MapComponent] Added cluster-count layer');
      }

      // Unclustered points layer
      if (!map.getLayer('unclustered-point')) {
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: EVENTS_SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'category'],
              'music', '#FF5722',
              'sports', '#2196F3',
              'arts', '#9C27B0',
              'food', '#4CAF50',
              'party', '#FFC107',
              '#607D8B' // default color
            ],
            'circle-radius': 6,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });
        console.log('[MapComponent] Added unclustered-point layer');
      }

      // Ensure DOM markers are removed
      // This is handled by the conditional rendering below, but good to note here.

    } else {
      // Use DOM markers
      // Remove WebGL source and layer if they exist
      if (map.getLayer(EVENTS_LAYER_ID)) {
        map.removeLayer(EVENTS_LAYER_ID);
        console.log('[MapComponent] Removed WebGL circle layer for events');
      }
      if (map.getSource(EVENTS_SOURCE_ID)) {
        map.removeSource(EVENTS_SOURCE_ID);
        console.log('[MapComponent] Removed GeoJSON source for events');
      }
      // Ensure DOM markers are rendered
      // This is handled by the conditional rendering below.
    }

    // Cleanup function
    return () => {
      if (map) {
        // Remove cluster and unclustered point layers
        if (map.getLayer('clusters')) {
          map.removeLayer('clusters');
          console.log('[MapComponent] Cleaned up clusters layer');
        }
        if (map.getLayer('cluster-count')) {
          map.removeLayer('cluster-count');
          console.log('[MapComponent] Cleaned up cluster-count layer');
        }
        if (map.getLayer('unclustered-point')) {
          map.removeLayer('unclustered-point');
          console.log('[MapComponent] Cleaned up unclustered-point layer');
        }
        // Remove source last
        if (map.getSource(EVENTS_SOURCE_ID)) {
          map.removeSource(EVENTS_SOURCE_ID);
          console.log('[MapComponent] Cleaned up GeoJSON source');
        }
      }
    };
  }, [map, isMapInitialized, events]); // Re-run when map, initialized state, or events change



   // Cluster handlers removed - we use custom React markers instead

  // Cluster event listeners removed - we use custom React markers instead


  const [terrainEnabled, setTerrainEnabled] = useState(false);
  const terrainSourceExists = map && map.getSource('mapbox-terrain'); // Check if terrain source exists

  // Effect to set up terrain when map style loads
  useEffect(() => {
    if (!map || !isMapInitialized) return;

    map.once('style.load', () => {
      console.log('[MapComponent] Map style loaded.');
      try {
         // Check if terrain source exists and is added by the style
         if (map.getSource('mapbox-terrain')) {
             // Do not automatically set terrain here, let the toggle control it
             console.log('[MapComponent] Mapbox terrain source found in style.');
             // Initial terrain state will be handled by the terrainEnabled state and toggle
         } else {
             console.warn('[MapComponent] Mapbox terrain source not found in style. Terrain toggle may not work.');
         }

         // Add sky layer if it doesn't exist
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
           console.log('[MapComponent] Sky layer added.');
        }
      } catch (err) {
        console.error('[MapComponent] Error during style load handling:', err);
      }
    });
  }, [map, isMapInitialized]); // Effect depends on map and initialized state


  const toggleTerrain = useCallback(() => {
    if (!map || !isMapInitialized) return;

    try {
      if (!terrainEnabled) {
         // Attempt to set terrain. Check if source is available.
         if (map.getSource('mapbox-terrain')) {
             map.setTerrain({ 'source': 'mapbox-terrain', 'exaggeration': 1.5 });
              map.easeTo({
                pitch: 60, // Tilt the map for better 3D view
                duration: 1000
              });
              setTerrainEnabled(true);
              console.log('[MapComponent] 3D terrain enabled.');
         } else {
             console.warn('[MapComponent] Mapbox terrain source not available. Cannot enable terrain.');
             toast({
               title: "Terrain Not Available",
               description: "3D terrain is not available for this map style or area.",
               variant: "default"
             });
         }
      } else {
         // Disable terrain
         map.setTerrain(null); // Setting terrain to null disables it
         map.easeTo({
           pitch: 0, // Reset pitch
           duration: 1000
         });
         setTerrainEnabled(false);
         console.log('[MapComponent] 3D terrain disabled.');
      }
    } catch (error) {
      console.error('[MapComponent] Error toggling terrain:', error);
      toast({
        title: "Error Toggling Terrain",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  }, [map, isMapInitialized, terrainEnabled]);

  // Use mapCenter from useMapState hook (if needed for display, but not for map interaction)
  const { mapCenter: currentMapCenter } = useMapState();


  // Custom marker click handler removed - now handled directly in MapMarkers component


  useMapPopup({
      map,
      event: selectedEvent, // Use the selectedEvent from state
      onClose: () => {
        // The popup is managed by this hook, closing it should clear the selected event
        if (onEventSelect && selectedEvent) {
          console.log('[MapComponent] Popup reports close, deselecting event');
          onEventSelect(null);
        }
      },
      onViewDetails: (event) => { // This event object is passed from the popup HTML
        console.log('[MapComponent] Popup ViewDetails clicked for:', event.id);
        // Selecting the event here will open the right sidebar and update the map state
        if (onEventSelect && (!selectedEvent || selectedEvent.id !== event.id)) {
          onEventSelect(event);
        }
      },
      onAddToPlan: (evt) => { // This event object is passed from the popup HTML
        console.log('[MapComponent] Popup AddToPlan clicked for:', evt.id);
        if (onAddToPlan) {
          onAddToPlan(evt);
        }
      }
  });


  // Use keyboard navigation hook
  useKeyboardNavigation({
    events, // Pass the current list of events
    selectedEventId: selectedEvent?.id?.toString() || null, // Pass ID of selected event
    onSelectEvent: onEventSelect || (() => {}), // Pass the handler to update selected event
    isEnabled: isMapInitialized && events.length > 0 // Only enable keyboard nav when map is initialized and there are events
  });


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

      {/* Custom Map Markers (shown only for small datasets) */}
      {isMapInitialized && map && events.length > 0 && events.length < 100 && (
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
       {isMapInitialized && !currentMapCenter && !isEventsLoading && events.length === 0 && <WelcomeHeader />}

    </div>
  );
};

export default MapComponent;
