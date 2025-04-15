
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { EventMarker } from '../markers/EventMarker';
import { createRoot } from 'react-dom/client';

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
  selectedEvent: Event | null;
}

export const MapMarkers = ({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  events.forEach(event => {
    if (!event.coordinates) return;
    
    const markerEl = document.createElement('div');
    
    // Create a React root and render the EventMarker component
    const root = createRoot(markerEl);
    root.render(
      <EventMarker 
        event={event} 
        selected={selectedEvent?.id === event.id}
      />
    );
    
    // Create and add the marker to the map
    const marker = new mapboxgl.Marker(markerEl)
      .setLngLat([event.coordinates[0], event.coordinates[1]])
      .addTo(map);
    
    // Add click handler
    markerEl.addEventListener('click', () => {
      onMarkerClick(event);
    });
  });

  return null;
};
