
import React from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

interface MapEventHandlersProps {
  map: mapboxgl.Map | null;
  supercluster: any;
  events: Event[];
  onEventSelect?: (event: Event | null) => void;
}

export const MapEventHandlers: React.FC<MapEventHandlersProps> = ({
  map,
  supercluster,
  events,
  onEventSelect
}) => {
  React.useEffect(() => {
    if (!map) return;
    
    const handleClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters', 'unclustered-point']
      });
      
      if (features.length === 0) {
        if (onEventSelect) onEventSelect(null);
        return;
      }
      
      const feature = features[0];
      
      if (feature.properties?.cluster) {
        if (!supercluster) return;
        
        const clusterId = feature.properties.cluster_id;
        try {
          const zoom = supercluster.getClusterExpansionZoom(clusterId);
          map.flyTo({
            center: feature.geometry?.coordinates as [number, number],
            zoom: zoom,
            duration: 1000,
            essential: true,
            easing: (t) => t * (2 - t)
          });
        } catch (err) {
          console.error('[MAP_EVENTS] Error expanding cluster:', err);
        }
        
        if (onEventSelect) onEventSelect(null);
      } else {
        const eventId = feature.properties?.id;
        const event = events.find(e => e.id === eventId);
        
        if (event && onEventSelect) {
          map.flyTo({
            center: event.coordinates as [number, number],
            zoom: Math.max(map.getZoom(), 14),
            duration: 800
          });
          
          onEventSelect(event);
        }
      }
    };
    
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    
    // Add event listeners correctly with proper types
    map.on('click', handleClick);
    map.on('mouseenter', 'clusters', handleMouseEnter);
    map.on('mouseenter', 'unclustered-point', handleMouseEnter);
    map.on('mouseleave', 'clusters', handleMouseLeave);
    map.on('mouseleave', 'unclustered-point', handleMouseLeave);
    
    return () => {
      map.off('click', handleClick);
      map.off('mouseenter', 'clusters', handleMouseEnter);
      map.off('mouseenter', 'unclustered-point', handleMouseEnter);
      map.off('mouseleave', 'clusters', handleMouseLeave);
      map.off('mouseleave', 'unclustered-point', handleMouseLeave);
    };
  }, [map, supercluster, events, onEventSelect]);
  
  return null;
};
