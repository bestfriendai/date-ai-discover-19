
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import EventMarker from '../markers/EventMarker';
import { createRoot } from 'react-dom/client';

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
  selectedEvent: Event | null;
}

export const MapMarkers = ({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  const markersRef = useRef<{[key: string]: {marker: mapboxgl.Marker, root: ReturnType<typeof createRoot>}}>(
    {}
  );

  useEffect(() => {
    // Remove old event markers
    Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
    markersRef.current = {};

    events
      .filter(e => e.coordinates && Array.isArray(e.coordinates) && e.coordinates.length === 2)
      .forEach(event => {
        const [lng, lat] = event.coordinates as [number, number];
        const markerEl = document.createElement('div');
        const root = createRoot(markerEl);
        root.render(
          <EventMarker
            event={event}
            isSelected={selectedEvent?.id === event.id}
            onClick={() => onMarkerClick(event)}
          />
        );
        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current[event.id] = { marker, root };
      });

    // Cleanup on unmount
    return () => {
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
      markersRef.current = {};
    };
    // eslint-disable-next-line
  }, [events, map, selectedEvent, onMarkerClick]);

  return null;
};
