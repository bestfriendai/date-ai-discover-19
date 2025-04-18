import React, { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { useMarkerManager } from '../hooks/useMarkerManager';

interface DirectMapMarkersProps {
  map: mapboxgl.Map | null;
  events: Event[];
  onEventSelect?: (event: Event | null) => void;
}

export const DirectMapMarkers: React.FC<DirectMapMarkersProps> = ({
  map,
  events,
  onEventSelect
}) => {
  const { markerCount } = useMarkerManager(map, events, onEventSelect);
  
  useEffect(() => {
    console.log(`[DIRECT_MARKERS] Rendering ${markerCount} markers for ${events.length} events`);
  }, [events.length, markerCount]);
  
  // This component doesn't render anything visible
  // It just manages the markers on the map
  return null;
};
