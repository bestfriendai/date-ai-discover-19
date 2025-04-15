
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { EventMarker } from '../markers/EventMarker';

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
}

export const MapMarkers = ({ map, events, onMarkerClick }: MapMarkersProps) => {
  // Add markers for each event
  events.forEach(event => {
    if (!event.coordinates) return;
    
    const markerEl = document.createElement('div');
    markerEl.className = 'mapboxgl-marker';
    
    const marker = new mapboxgl.Marker(markerEl)
      .setLngLat([event.coordinates[0], event.coordinates[1]])
      .addTo(map);
    
    markerEl.addEventListener('click', () => {
      onMarkerClick(event);
    });
  });

  return null; // This is a utility component that doesn't render anything
};
