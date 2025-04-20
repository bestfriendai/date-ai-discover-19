
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
    
    const handleClick = (e: any) => {
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
            easing: (t) => t * (2 - t) // Smooth easing function
          });
        } catch (err) {
          console.error('[MAP_EVENTS] Error expanding cluster:', err);
        }
        
        if (onEventSelect) onEventSelect(null);
      } else {
        const eventId = feature.properties?.id;
        const event = events.find(e => e.id === eventId);
        
        if (event && onEventSelect) {
          // Add a nice zoom effect when selecting an event
          map.flyTo({
            center: event.coordinates as [number, number],
            zoom: Math.max(map.getZoom(), 14),
            duration: 800
            // Remove the padding property as it's not supported in this context
          });
          
          onEventSelect(event);
        }
      }
    };
    
    const handleMouseEnter = () => {
      // Simplify the mouse enter handler to avoid potential issues
      map.getCanvas().style.cursor = 'pointer';
    };
    
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      map.getCanvas().style.transform = '';
    };
    
    // Fix event handlers to use the correct pattern
    map.on('click', handleClick);
    
    // Add event listeners to specific layers properly
    map.on('mouseenter', 'clusters', handleMouseEnter);
    map.on('mouseenter', 'unclustered-point', handleMouseEnter);
    map.on('mouseleave', 'clusters', handleMouseLeave);
    map.on('mouseleave', 'unclustered-point', handleMouseLeave);
    
    return () => {
      // Clean up event listeners properly
      map.off('click', handleClick);
      map.off('mouseenter', 'clusters', handleMouseEnter);
      map.off('mouseenter', 'unclustered-point', handleMouseEnter);
      map.off('mouseleave', 'clusters', handleMouseLeave);
      map.off('mouseleave', 'unclustered-point', handleMouseLeave);
    };
  }, [map, supercluster, events, onEventSelect]);
  
  return null;
};
