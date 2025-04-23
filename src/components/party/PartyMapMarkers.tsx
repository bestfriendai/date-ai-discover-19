import React, { useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import PartyMarker from './PartyMarker';
import { createRoot } from 'react-dom/client';

interface PartyMapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  selectedEventId: string | null;
  onMarkerClick: (event: Event) => void;
}

export const PartyMapMarkers: React.FC<PartyMapMarkersProps> = ({
  map,
  events,
  selectedEventId,
  onMarkerClick
}) => {
  const [activeMarkers, setActiveMarkers] = useState<Map<string, { marker: mapboxgl.Marker, root: any }>>(new Map());

  const updateMarkers = useCallback(() => {
    if (!map || !events.length) return;

    console.log('[PartyMapMarkers] Updating markers for', events.length, 'events');

    const newMarkers = new Map(activeMarkers);
    
    events.forEach(event => {
      if (!event.coordinates || !Array.isArray(event.coordinates) || event.coordinates.length !== 2) {
        console.warn('[PartyMapMarkers] Event missing valid coordinates:', event.id);
        return;
      }

      const id = String(event.id);
      const isSelected = id === selectedEventId;
      const existingMarker = newMarkers.get(id);

      if (existingMarker) {
        existingMarker.root.render(
          <PartyMarker 
            event={event} 
            isSelected={isSelected} 
            onClick={() => onMarkerClick(event)} 
          />
        );
        return;
      }

      const el = document.createElement('div');
      const root = createRoot(el);
      
      root.render(
        <PartyMarker 
          event={event} 
          isSelected={isSelected} 
          onClick={() => onMarkerClick(event)} 
        />
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(event.coordinates as [number, number])
        .addTo(map);

      newMarkers.set(id, { marker, root });
    });

    const currentIds = new Set(events.map(e => String(e.id)));
    activeMarkers.forEach((_, id) => {
      if (!currentIds.has(id)) {
        const markerToRemove = activeMarkers.get(id);
        if (markerToRemove) {
          markerToRemove.marker.remove();
          markerToRemove.root.unmount();
          newMarkers.delete(id);
        }
      }
    });

    setActiveMarkers(newMarkers);
  }, [map, events, selectedEventId, onMarkerClick, activeMarkers]);

  useEffect(() => {
    updateMarkers();
    
    return () => {
      activeMarkers.forEach(({ marker, root }) => {
        marker.remove();
        root.unmount();
      });
    };
  }, [map, events, selectedEventId, updateMarkers]);

  return null;
};

export default PartyMapMarkers;
