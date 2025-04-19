
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
    const handleClick = (e: any) => {
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
    
    // Define cursor style handlers
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    
    // Add click handler
    map.on('click', handleClick);
    
    // Add cursor style handlers
    map.on('mouseenter', handleMouseEnter);
    map.on('mouseleave', handleMouseLeave);
    
    // Cleanup
    return () => {
      map.off('click', handleClick);
      map.off('mouseenter', handleMouseEnter);
      map.off('mouseleave', handleMouseLeave);
    };
  }, [map, supercluster, events, onEventSelect]);
  
  return null;
};
