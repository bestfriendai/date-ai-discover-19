// src/components/map/MapComponent.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '../../types';
import type { EventFilters } from './components/MapControls';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
import { MapDebugOverlay } from './components/MapDebugOverlay';
import MapMarkers from './MapMarkers'; // Use the refactored MapMarkers
import { useClusterMarkers } from './hooks/useClusterMarkers';
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
import EventMarkerLegend from './markers/EventMarkerLegend';
// import { MapEventHandlers } from './components/MapEventHandlers'; // Handlers moved into MapComponent or hooks
import { toast } from '@/hooks/use-toast'; // Import toast

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
    longitude: -98.5795, // Centered US
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
    onEventSelect, // Pass onEventSelect so useMapControls can trigger it on location found
    (coords) => {
      if (onFetchEvents) {
        onFetchEvents(filters, coords, filters.distance);
      }
    }
  );

  // Integrate map event handling directly or via hook
  const { handleMapMoveEnd: handleMapMoveEndFromHook, handleSearchThisArea } = useMapEvents(
     (center) => {
       if (mapLoaded && map) {
          const currentZoom = map.getZoom();
          onMapMoveEnd(center, currentZoom, true); // Pass user interaction flag
       }
     },
     (zoom) => {
        if (mapLoaded && map) {
           const center = map.getCenter();
           onMapMoveEnd({ latitude: center.lat, longitude: center.lng }, zoom, true); // Pass user interaction flag
        }
     },
     // onSearchThisArea now needs access to map center and filters
     () => {
        if (map && onFetchEvents) {
          const center = map.getCenter();
          if (center) {
            toast({
              title: "Searching this area",
              description: "Looking for events in the current map view...",
            });
            onFetchEvents(filters, { latitude: center.lat, longitude: center.lng }, filters.distance);
            // Reset mapHasMoved if search is triggered by the button
            // The mapHasMoved state is primarily for the "Search This Area" button visibility
            // It should be reset AFTER the user acts on it (clicks the button)
            // It's also reset when new events are successfully loaded (in useEventSearch)
          }
        }
     },
     mapLoaded
  );

  // Set up Mapbox-specific event listeners (moveend, click, etc.)
  useEffect(() => {
      if (!map || !mapLoaded) return;

      const onMoveEnd = () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          // Check for user interaction if possible, or rely on mapHasMoved state logic
          // Mapbox doesn't directly provide user interaction flag on moveend in this way easily
          // We rely on the mapHasMoved state being set by explicit user actions (drag/zoom)
          if (center) {
            handleMapMoveEndFromHook({ latitude: center.lat, longitude: center.lng }, zoom, true); // Assume user interaction for simplicity here
          }
      };

      // Add click handler to deselect event if clicking empty space
      const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'unclustered-point'] // Layers for clickable features
        });

        // If no features were clicked, deselect the currently selected event
        if (features.length === 0) {
          if (selectedEvent && onEventSelect) {
            console.log('[MapComponent] Clicked empty space, deselecting event.');
            onEventSelect(null);
          }
        }
         // Feature clicks (cluster or point) are handled by the layers added by useClusterMarkers OR the custom MapMarkers handlers
      };

      // Add event listeners
      map.on('moveend', onMoveEnd);
      map.on('click', handleMapClick);


      // Cleanup function
      return () => {
          map.off('moveend', onMoveEnd);
          map.off('click', handleMapClick);
      };
  }, [map, mapLoaded, handleMapMoveEndFromHook, selectedEvent, onEventSelect]); // Re-run if map, loaded state, or handlers change

  // Manual cluster click handler for useClusterMarkers layers
  const handleClusterClick = useCallback((clusterId: number, coordinates: [number, number]) => {
      if (!map) return;
      const source = map.getSource('events') as mapboxgl.GeoJSONSource; // Assuming sourceId is 'events' in useClusterMarkers
      if (!source || !('getClusterExpansionZoom' in source)) return;

      try {
        (source as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;

          map.easeTo({
            center: coordinates,
            zoom: zoom, // Zoom to the expansion zoom
            duration: 500
          });
        });
        // Deselect any currently selected event when clicking a cluster
        if (selectedEvent && onEventSelect) {
            onEventSelect(null);
        }
      } catch (error) {
        console.error('[MapComponent] Error expanding cluster:', error);
      }
  }, [map, selectedEvent, onEventSelect]);

  // Manual point click handler for useClusterMarkers layers
  const handleUnclusteredPointClick = useCallback((event: Event) => {
    if (!map || !onEventSelect) return;

    if (!selectedEvent || selectedEvent.id !== event.id) {
      onEventSelect(event);
      const coordinates = event.coordinates as [number, number];
       if (coordinates) { // Ensure coordinates are valid before flying
          map.flyTo({
            center: coordinates,
            zoom: Math.max(map.getZoom(), 14), // Zoom in if current zoom is low
            duration: 600,
            essential: true
          });
       }
    }
  }, [map, onEventSelect, selectedEvent]);


  // Mapbox GL JS Clustering Logic
  const { clusteringEnabled, toggleClustering, isClusterSourceInitialized } = useClusterMarkers(
    map,
    events
  );

   // Add cluster/point click handlers when clustering is enabled and initialized
   useEffect(() => {
        if (!map || !mapLoaded || !clusteringEnabled || !isClusterSourceInitialized) return;

        const handleCursorEnter = () => {
             if (map.getCanvas) map.getCanvas().style.cursor = 'pointer';
        };

        const handleCursorLeave = () => {
             if (map.getCanvas) map.getCanvas().style.cursor = '';
        };

        // Add click handler for clusters
        // Wrapper for cluster click
        const clusterClickHandler = (e: mapboxgl.MapMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const clusterId = feature.properties?.cluster_id;
          // Ensure geometry is Point before accessing coordinates
          if (feature.geometry?.type === 'Point' && clusterId !== undefined) {
            handleClusterClick(clusterId, feature.geometry.coordinates as [number, number]);
          }
        };
        map.on('click', 'clusters', clusterClickHandler);

        // Wrapper for unclustered point click
        const pointClickHandler = (e: mapboxgl.MapMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const eventId = feature.properties?.id;
          const event = events.find(ev => ev.id === eventId);
          if (event) {
            handleUnclusteredPointClick(event);
          }
        };
        map.on('click', 'unclustered-point', pointClickHandler);

        // Add hover effects for clustered layers
        map.on('mouseenter', 'clusters', handleCursorEnter);
        map.on('mouseleave', 'clusters', handleCursorLeave);
        map.on('mouseenter', 'unclustered-point', handleCursorEnter);
        map.on('mouseleave', 'unclustered-point', handleCursorLeave);

        return () => {
            // Clean up listeners for clustered layers
            // Use the wrapper functions for removal as well, if they were defined outside the effect
            // Or simply remove by type and layerId if wrappers are inline
            if (map.getLayer('clusters')) map.off('click', 'clusters', clusterClickHandler);
            if (map.getLayer('unclustered-point')) map.off('click', 'unclustered-point', pointClickHandler);
            if (map.getLayer('clusters')) map.off('mouseenter', 'clusters', handleCursorEnter);
            // Correct map.getLayer calls
            if (map.getLayer('clusters')) map.off('mouseleave', 'clusters', handleCursorLeave);
            if (map.getLayer('unclustered-point')) map.off('mouseenter', 'unclustered-point', handleCursorEnter);
            if (map.getLayer('unclustered-point')) map.off('mouseleave', 'unclustered-point', handleCursorLeave);
        };
   }, [map, mapLoaded, clusteringEnabled, isClusterSourceInitialized, handleClusterClick, handleUnclusteredPointClick]);


  const [terrainEnabled, setTerrainEnabled] = useState(false);

  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Add sky layer for 3D terrain effect
    map.once('style.load', () => {
      try {
         // Check if terrain source exists before adding terrain layer
         if (map.getSource('mapbox-terrain')) {
             map.setTerrain({ 'source': 'mapbox-terrain', 'exaggeration': 1.5 });
             console.log('[MapComponent] Mapbox terrain source found, terrain enabled by default.');
             setTerrainEnabled(true); // Enable terrain if source is available
         } else {
             console.warn('[MapComponent] Mapbox terrain source not found. Terrain toggle disabled.');
             // Optionally disable the toggle button or show a message
         }

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
        console.warn('[MapComponent] Could not add sky or terrain layer:', err);
      }
    });
  }, [map, mapLoaded]); // Effect depends on map and mapLoaded state


  const toggleTerrain = useCallback(() => {
    if (!map) return;

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
      }
    } catch (error) {
      console.error('[MapComponent] Error toggling terrain:', error);
      toast({
        title: "Error Toggling Terrain",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  }, [map, terrainEnabled]);

  // Use mapCenter and mapZoom from useMapState hook
  const { mapCenter: currentMapCenter, mapZoom: currentMapZoom } = useMapState();


   // Custom marker click handler (for use with MapMarkers when clustering is off)
  const handleCustomMarkerClick = useCallback((feature: Event) => {
    if (!map || !onEventSelect) return;

    console.log('[MapComponent] Custom Marker clicked for:', feature.id);

    // If we click the currently selected marker, deselect it
    if (selectedEvent && selectedEvent.id === feature.id) {
       onEventSelect(null);
       console.log('[MapComponent] Deselecting event:', feature.id);
    } else {
       // Select the new event
       onEventSelect(feature);
       console.log('[MapComponent] Selecting event:', feature.id);

       const coordinates = feature.coordinates as [number, number];
       if (coordinates) { // Ensure coordinates are valid before flying
          map.flyTo({
            center: coordinates,
            zoom: Math.max(map.getZoom(), 14), // Zoom in if current zoom is low
            duration: 600,
            essential: true
          });
       }
    }
  }, [map, onEventSelect, selectedEvent]);


  useMapPopup({
      map,
      event: selectedEvent,
      onClose: () => {
        if (onEventSelect && selectedEvent) {
          console.log('[MapComponent] Popup closed, deselecting event');
          onEventSelect(null);
        }
      },
      onViewDetails: (event) => {
        console.log('[MapComponent] Popup ViewDetails clicked for:', event.id);
        // Selecting the event here will open the right sidebar
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


  useKeyboardNavigation({
    events,
    selectedEventId: selectedEvent?.id?.toString() || null,
    onSelectEvent: onEventSelect || (() => {}),
    isEnabled: mapLoaded && events.length > 0 // Only enable keyboard nav when map is loaded and there are events
  });


  return (
    <div className="w-full h-full relative">
      {mapLoaded && <EventMarkerLegend />}

      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50 transition-all duration-300 hover:shadow-xl" />

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

      {/* Debug Overlay */}
      {mapLoaded && map && (
         <DebugOverlay
           events={events}
           clusters={[]} // Clusters are handled by Mapbox layers when enabled, not readily available as GeoJSON array here when using Mapbox clustering.
           mapLoaded={mapLoaded}
           mapError={mapError}
           viewState={{
             latitude: map.getCenter().lat,
             longitude: map.getCenter().lng,
             zoom: map.getZoom(),
           }}
           filters={filters}
         />
      )}

      {/* Custom Map Markers (when clustering is disabled) */}
      {mapLoaded && map && events.length > 0 && !clusteringEnabled && (
        <MapMarkers
          map={map}
          features={events} // Pass the raw events to MapMarkers
          onMarkerClick={handleCustomMarkerClick} // Use custom marker click handler
          selectedFeatureId={selectedEvent?.id || null}
        />
      )}

      {/* Toggle Clustering Button */}
      {mapLoaded && map && events.length > 0 && (
        <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2"> {/* Adjusted position */}
          <button
            onClick={toggleClustering}
            className="bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-border/50 hover:bg-background/90 transition-colors"
            title={clusteringEnabled ? "Disable clustering" : "Enable clustering (Mapbox built-in)"}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              {clusteringEnabled ? (
                // Icon for Clustering Enabled
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="5" />
                  <circle cx="15" cy="15" r="5" />
                </svg>
              ) : (
                // Icon for Clustering Disabled (showing individual markers)
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
            </div>
          </button>

          {/* Terrain Toggle Button */}
           {map.getSource('mapbox-terrain') && ( // Only show terrain toggle if terrain source is available
             <TerrainToggle
               map={map}
               enabled={terrainEnabled}
               onToggle={toggleTerrain}
             />
           )}
        </div>
      )}


      {mapLoaded && map && (
        <MapControlsContainer
          mapLoaded={mapLoaded}
          viewState={{
             // Use the actual map center and zoom
             latitude: map.getCenter().lat,
             longitude: map.getCenter().lng,
             zoom: map.getZoom(),
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
       {mapLoaded && !currentMapCenter && !isEventsLoading && events.length === 0 && <WelcomeHeader />}

    </div>
  );
};

export default MapComponent;
