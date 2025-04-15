
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import EventMarker from '../markers/EventMarker'; // Use default import
import { createRoot } from 'react-dom/client';

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
  selectedEvent: Event | null;
}

export const MapMarkers = ({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  const markersRef = useRef<{[key: string]: {marker: mapboxgl.Marker, root: ReturnType<typeof createRoot>}}>({}); // More specific type for root

  useEffect(() => {
    // Create markers for events that don't have one yet
    events.forEach(event => {
      if (!event.coordinates) return;
      
      // If marker already exists for this event, skip creation
      if (markersRef.current[event.id]) {
        // Just update the selected state
        const markerRoot = markersRef.current[event.id].root;
        markerRoot.render(
          <EventMarker
            event={event} // Pass the whole event object
            isSelected={selectedEvent?.id === event.id}
            onClick={() => onMarkerClick(event)}
          />
        );
        return;
      }
      
      // Create marker element and React root
      const markerEl = document.createElement('div');
      const root = createRoot(markerEl);
      
      // Render EventMarker component
      root.render(
        <EventMarker
          event={event} // Pass the whole event object
          isSelected={selectedEvent?.id === event.id}
          onClick={() => onMarkerClick(event)}
        />
      );

      // Create and add Mapbox marker
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([event.coordinates[0], event.coordinates[1]])
        .addTo(map);

      // Click handler is now inside EventMarker, no need for this:
      // markerEl.addEventListener('click', () => {
      //   onMarkerClick(event);
      // });

      // Store marker reference for future updates
      markersRef.current[event.id] = { marker, root };
    });
    
    // Clean up function - remove markers that are no longer in the events array
    return () => {
      // Get current event IDs
      const currentEventIds = new Set(events.map(e => e.id));
      
      // Find and remove markers for events that are no longer present
      Object.keys(markersRef.current).forEach(eventId => {
        if (!currentEventIds.has(eventId)) {
          // Remove marker from map
          markersRef.current[eventId].marker.remove();
          // Delete from our reference object
          delete markersRef.current[eventId];
        }
      });
    };
  }, [map, events, selectedEvent, onMarkerClick]);

  return null;
};
