import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
// Import specific GeoJSON types
import type { FeatureCollection, Point, Feature } from 'geojson';
// Removed problematic MapboxGeoJSONFeature import

// Helper to map category to an emoji icon
const getEmojiForCategory = (category: string): string => {
  switch (category?.toLowerCase()) {
    case 'music': return '🎵';
    case 'sports': return '⚽';
    case 'arts':
    case 'theatre': return '🎭';
    case 'family': return '👨‍👩‍👧‍👦';
    case 'food':
    case 'restaurant': return '🍔';
    default: return '📍';
  }
};

// Helper to map category to a color
const getColorForCategory = (category: string): string => {
    switch (category?.toLowerCase()) {
      case 'music': return '#3b82f6';
      case 'sports': return '#22c55e';
      case 'arts':
      case 'theatre': return '#ec4899';
      case 'family': return '#facc15';
      case 'food':
      case 'restaurant': return '#f97316';
      default: return '#6b7280';
    }
  };


interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
  selectedEvent: Event | null;
}

const SOURCE_ID = 'event-markers-source';
const LAYER_ID = 'event-markers-layer';

// Use 'any' for event type if specific Mapbox types cause issues
type MapEventHandler = any;

const MapMarkers = ({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  const hoveredEventId = useRef<string | number | null>(null);
  const eventMap = useRef<{ [key: string]: Event }>({});

  // 1. Setup Source and Layer
  useEffect(() => {
    // Use getCanvas() as a proxy for map validity
    if (!map || !map.getCanvas()) return;

    // Define handlers within useEffect to capture props/state correctly
    const handleClick = (e: MapEventHandler) => {
        if (e.features && e.features.length > 0) {
          const featureProps = e.features[0].properties;
          const featureId = featureProps?.id;
          const lookupId = typeof featureId === 'number' ? String(featureId) : featureId;
          if (lookupId && eventMap.current[lookupId]) {
            onMarkerClick(eventMap.current[lookupId]);
          }
        }
    };

    const handleMouseMove = (e: MapEventHandler) => {
        if (!map || !map.getCanvas()) return;
        if (e.features && e.features.length > 0) {
          const currentFeature = e.features[0];
          const currentFeatureId = currentFeature.id ?? currentFeature.properties?.id;

          if (currentFeatureId !== undefined && hoveredEventId.current !== currentFeatureId) {
            if (hoveredEventId.current !== null && map.getSource(SOURCE_ID)) {
              map.setFeatureState(
                { source: SOURCE_ID, id: hoveredEventId.current },
                { hover: false }
              );
            }
            hoveredEventId.current = currentFeatureId;
             if (map.getSource(SOURCE_ID)) {
                map.setFeatureState(
                  { source: SOURCE_ID, id: hoveredEventId.current },
                  { hover: true }
                );
             }
             if (map.getCanvas()) {
                map.getCanvas().style.cursor = 'pointer';
             }
          }
        } else {
            handleMouseLeave();
        }
    };

    const handleMouseLeave = () => {
        if (!map || !map.getCanvas()) return;
        if (hoveredEventId.current !== null && map.getSource(SOURCE_ID)) {
          map.setFeatureState(
            { source: SOURCE_ID, id: hoveredEventId.current },
            { hover: false }
          );
        }
        hoveredEventId.current = null;
        if (map.getCanvas()) {
            map.getCanvas().style.cursor = '';
        }
    };


    const setupSourceAndLayer = () => {
        if (!map || !map.getCanvas()) return;

        let source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        if (!source) {
          map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
          source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        }

        let layer = map.getLayer(LAYER_ID);
        if (!layer) {
          map.addLayer({
            id: LAYER_ID,
            type: 'symbol',
            source: SOURCE_ID,
            layout: {
              'icon-image': '',
              'text-field': ['get', 'icon'],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-size': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], 28,
                ['boolean', ['feature-state', 'hover'], false], 24,
                20
              ],
              'text-offset': [0, -1],
              'text-anchor': 'bottom',
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], '#ffffff',
                ['get', 'color']
              ],
              'text-halo-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], ['get', 'color'],
                'rgba(0,0,0,0)'
              ],
              'text-halo-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], 2,
                0
              ],
               'text-halo-blur': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], 1,
                0
              ],
            }
          });

          // Attach Interaction Handlers - Use LAYER_ID for layer-specific events
          map.on('click', LAYER_ID, handleClick);
          map.on('mousemove', LAYER_ID, handleMouseMove);
          map.on('mouseleave', LAYER_ID, handleMouseLeave);
        }
    };

    if (!map.isStyleLoaded()) {
        map.once('load', setupSourceAndLayer);
    } else {
        setupSourceAndLayer();
    }

    // Cleanup function
    return () => {
      if (map && map.getCanvas()) {
          // Use 2-argument map.off as a workaround for type error
          map.off('click', handleClick);
          map.off('mousemove', handleMouseMove);
          map.off('mouseleave', handleMouseLeave);

          // Wrap removals in checks for function existence and cast to 'any' to bypass type errors
          if (typeof map.getLayer === 'function' && map.getLayer(LAYER_ID)) {
            if (typeof (map as any).removeLayer === 'function') {
                (map as any).removeLayer(LAYER_ID);
            } else { console.warn('map.removeLayer function not found'); }
          }
          if (typeof map.getSource === 'function' && map.getSource(SOURCE_ID)) {
            try {
                 const style = map.getStyle();
                 if (style && style.layers) {
                     const sourceInUse = style.layers.some(layer => layer.source === SOURCE_ID && layer.id !== LAYER_ID);
                     if (!sourceInUse) {
                         if (typeof (map as any).removeSource === 'function') {
                            (map as any).removeSource(SOURCE_ID);
                         } else { console.warn('map.removeSource function not found'); }
                     }
                 } else {
                      // Fallback: Cast to 'any' to bypass type error
                      if (typeof (map as any).removeSource === 'function') {
                         (map as any).removeSource(SOURCE_ID);
                      } else { console.warn('map.removeSource function not found'); }
                 }
            } catch (error) {
                console.error("Error removing source:", SOURCE_ID, error);
            }
          }
      }
    };
  }, [map, onMarkerClick]);


  // 2. Update Data and Selection State
  useEffect(() => {
    if (!map || !map.getCanvas() || !map.isStyleLoaded()) return;

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (!source) return;

    let previouslySelectedFeatureId: string | number | undefined = undefined;
    // Cast to 'any' to bypass type error for querySourceFeatures
    if (typeof (map as any).querySourceFeatures === 'function') {
        try {
            const selectedFeatures = (map as any).querySourceFeatures(SOURCE_ID, {
                filter: ['==', ['feature-state', 'selected'], true]
            });
            if (selectedFeatures && selectedFeatures.length > 0) { // Add null check for safety
                previouslySelectedFeatureId = selectedFeatures[0].id ?? selectedFeatures[0].properties?.id;
            }
        } catch (error) { console.error("Error querying source features:", error); }
    } else { console.warn('map.querySourceFeatures function not found'); }

    const features: Feature<Point>[] = events
      .filter(event => event.coordinates && event.coordinates.length === 2)
      .map(event => {
        eventMap.current[event.id] = event;
        const category = event.category || 'other';
        const feature: Feature<Point> = {
          type: 'Feature',
          id: event.id,
          geometry: {
            type: 'Point',
            coordinates: event.coordinates,
          },
          properties: {
            id: event.id,
            category: category,
            icon: getEmojiForCategory(category),
            color: getColorForCategory(category),
          },
        };
        return feature;
      });

    const geojsonData: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: features,
    };

    source.setData(geojsonData);

    // Re-apply selection state
    if (previouslySelectedFeatureId !== undefined && previouslySelectedFeatureId !== selectedEvent?.id) {
         if (map.getSource(SOURCE_ID)) {
            map.setFeatureState({ source: SOURCE_ID, id: previouslySelectedFeatureId }, { selected: false });
         }
    }
    if (selectedEvent) {
         if (map.getSource(SOURCE_ID)) {
            map.setFeatureState(
                { source: SOURCE_ID, id: selectedEvent.id },
                { selected: true }
            );
         }
    }

  }, [map, events, selectedEvent]);


  return null;
};

export default MapMarkers;
