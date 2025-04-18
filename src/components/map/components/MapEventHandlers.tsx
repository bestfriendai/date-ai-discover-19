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
  // This component doesn't render anything visible
  // It just attaches event handlers to the map
  
  React.useEffect(() => {
    if (!map) return;
    
    // Add event handlers to the map
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      // Get features at click point
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters', 'unclustered-point']
      });
      
      if (features.length === 0) {
        // Clicked on empty space, deselect event
        if (onEventSelect) onEventSelect(null);
        return;
      }
      
      const feature = features[0];
      
      if (feature.properties && feature.properties.cluster) {
        // Handle cluster click
        if (!supercluster) return;
        
        const clusterId = feature.properties.cluster_id;
        try {
          const zoom = supercluster.getClusterExpansionZoom(clusterId);
          map.flyTo({
            center: feature.geometry?.coordinates as [number, number],
            zoom: zoom,
            duration: 800,
            essential: true
          });
        } catch (err) {
          console.error('[MAP_EVENTS] Error expanding cluster:', err);
        }
        
        if (onEventSelect) onEventSelect(null);
      } else {
        // Handle event marker click
        const eventId = feature.properties?.id;
        const event = events.find(e => e.id === eventId);
        
        if (event && onEventSelect) {
          onEventSelect(event);
        }
      }
    };
    
    // Add click handler
    map.on('click', handleClick);
    
    // Add cursor style changes
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    
    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });
    
    // Cleanup
    return () => {
      map.off('click', handleClick);
      map.off('mouseenter', 'clusters');
      map.off('mouseleave', 'clusters');
      map.off('mouseenter', 'unclustered-point');
      map.off('mouseleave', 'unclustered-point');
    };
  }, [map, supercluster, events, onEventSelect]);
  
  return null;
};
