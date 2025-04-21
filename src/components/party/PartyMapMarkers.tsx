import React, { useCallback } from 'react';
import type { Map } from 'mapbox-gl';
import type { Event } from '@/types';
import PartyMarker from './PartyMarker';

interface PartyMapMarkersProps {
  map: Map;
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
  // Handler for marker click
  const handleMarkerClick = useCallback((event: Event) => {
    onMarkerClick(event);
  }, [onMarkerClick]);

  return (
    <>
      {events.map(event => {
        // Skip events without coordinates
        if (!event.coordinates || !Array.isArray(event.coordinates) || event.coordinates.length !== 2) {
          return null;
        }
        
        return (
          <PartyMarker
            key={event.id}
            event={event}
            isSelected={selectedEventId === event.id}
            onClick={() => handleMarkerClick(event)}
          />
        );
      })}
    </>
  );
};

export default PartyMapMarkers;
