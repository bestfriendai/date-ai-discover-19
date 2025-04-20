// src/components/map/MapComponent.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event } from '../../types';
import type { EventFilters } from './components/MapControls';
import { MapLoadingOverlay } from './components/MapLoadingOverlay';
import { MapDebugOverlay } from './components/MapDebugOverlay';
import MapMarkers from './components/MapMarkers'; // Fixed import path
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
// import { MapEventHandlers } from './components/MapEventHandlers'; // Logic moved into MapComponent or hooks
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
  const { handleMapMoveEnd: handleMapMoveEndFromHook, handleSearchThisArea } = useMapEvents(
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

  // Use Mapbox GL JS Clustering Logic from hook
  const { clusteringEnabled, toggleClustering, isClusterSourceInitialized } = useClusterMarkers(
    map, // Pass the Mapbox map instance
    events // Pass the event data for clustering
  );

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


   // Manual cluster click handler for layers added by useClusterMarkers
  const handleClusterClick = useCallback((clusterId: number, coordinates: [number, number]) => {
      if (!map) return;
      const source = map.getSource('events') as mapboxgl.GeoJSONSource; // Source ID used in useClusterMarkers
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
            console.log('[MapComponent] Clicked cluster, deselecting event.');
        }
      } catch (error) {
        console.error('[MapComponent] Error expanding cluster:', error);
      }
  }, [map, selectedEvent, onEventSelect]);

  // Manual point click handler for layers added by useClusterMarkers
  const handleUnclusteredPointClick = useCallback((eventFeature: GeoJSON.Feature) => {
    if (!map || !onEventSelect || !eventFeature.properties?.id) return;

    const eventId = String(eventFeature.properties.id);
     // Find the corresponding event object from the `events` array
    const event = events.find(e => String(e.id) === eventId);

    if (!event) {
        console.warn('[MapComponent] Clicked unclustered point feature, but event object not found:', eventId);
        return; // Event object not found in current list
    }

    console.log('[MapComponent] Clicked unclustered point for event ID:', event.id);

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
    } else {
       // Clicking the same selected event point, deselect it
       onEventSelect(null);
       console.log('[MapComponent] Deselecting event:', event.id);
    }
  }, [map, onEventSelect, selectedEvent, events]); // Depend on events list to find the event object

  // Attach Layer-Specific Mapbox Event Listeners (only when clustering is ON and initialized)
  useEffect(() => {
      if (!map || !isMapInitialized || !clusteringEnabled || !isClusterSourceInitialized) return;

      const handleCursorEnter = () => {
           if (map.getCanvas) map.getCanvas().style.cursor = 'pointer';
      };

      const handleCursorLeave = () => {
           if (map.getCanvas) map.getCanvas().style.cursor = '';
      };

      // Wrapper for cluster click to match Mapbox signature
      const clusterClickHandler = (e: mapboxgl.MapMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const clusterId = feature.properties?.cluster_id;
        if (feature.geometry?.type === 'Point' && clusterId !== undefined) {
          handleClusterClick(clusterId, feature.geometry.coordinates as [number, number]);
        }
      };

      // Wrapper for unclustered point click to match Mapbox signature
      const pointClickHandler = (e: mapboxgl.MapMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        handleUnclusteredPointClick(e.features[0]); // Pass the GeoJSON feature
      };


      // Ensure layers exist before adding listeners (although isClusterSourceInitialized should cover this)
      if (map.getLayer('clusters')) {
          map.on('click', 'clusters', clusterClickHandler);
          map.on('mouseenter', 'clusters', handleCursorEnter);
          map.on('mouseleave', 'clusters', handleCursorLeave);
           console.log('[MapComponent] Attached cluster event listeners.');
      }
      if (map.getLayer('unclustered-point')) {
           map.on('click', 'unclustered-point', pointClickHandler);
           map.on('mouseenter', 'unclustered-point', handleCursorEnter);
           map.on('mouseleave', 'unclustered-point', handleCursorLeave);
           console.log('[MapComponent] Attached unclustered point event listeners.');
      }


      return () => {
          // Clean up listeners for clustered layers when clustering is disabled or map unmounts
          if (map.getLayer('clusters')) {
              map.off('click', 'clusters', clusterClickHandler);
              map.off('mouseenter', 'clusters', handleCursorEnter);
              map.off('mouseleave', 'clusters', handleCursorLeave);
          }
          if (map.getLayer('unclustered-point')) {
              map.off('click', 'unclustered-point', pointClickHandler);
              map.off('mouseenter', 'unclustered-point', handleCursorEnter);
              map.off('mouseleave', 'unclustered-point', handleCursorLeave);
          }
           console.log('[MapComponent] Cleaned up layer-specific event listeners.');
      };
  }, [map, isMapInitialized, clusteringEnabled, isClusterSourceInitialized, handleClusterClick, handleUnclusteredPointClick]); // Re-run if these dependencies change


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

  // Use mapCenter and mapZoom from useMapState hook (if needed for display, but not for map interaction)
  const { mapCenter: currentMapCenter, mapZoom: currentMapZoom } = useMapState();


   // Custom marker click handler (for use with MapMarkers when clustering is off)
  const handleCustomMarkerClick = useCallback((event: Event) => {
    if (!map || !isMapInitialized || !onEventSelect) return;

    console.log('[MapComponent] Custom Marker clicked for:', event.id);

    // If we click the currently selected marker, deselect it
    if (selectedEvent && selectedEvent.id === event.id) {
       onEventSelect(null);
       console.log('[MapComponent] Deselecting event:', event.id);
    } else {
       // Select the new event
       onEventSelect(event);
       console.log('[MapComponent] Selecting event:', event.id);

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
  }, [map, isMapInitialized, onEventSelect, selectedEvent]);


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
      {isMapInitialized && <EventMarkerLegend />}

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
       {isMapInitialized && !currentMapCenter && !isEventsLoading && events.length === 0 && <WelcomeHeader />}

    </div>
  );
};

export default MapComponent;
