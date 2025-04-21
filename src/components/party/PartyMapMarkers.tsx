import React from 'react';
import type { Event } from '@/types';
import type { Map } from 'mapbox-gl';

interface PartyMapMarkersProps {
  map: Map;
  events: Event[];
  selectedEventId: string | null;
  onMarkerClick: (event: Event) => void;
}

// This is a placeholder component that doesn't actually render markers
// It's here to satisfy imports but won't be used
export const PartyMapMarkers: React.FC<PartyMapMarkersProps> = () => {
  return null;
};

export default PartyMapMarkers;
