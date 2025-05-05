
import React, { useState } from 'react';
import { Event } from '@/types';
import { getPartyMarkerConfig, getEventCoordinates } from './utils/partyMarkers';
import LeafletMap from './LeafletMap';
import { toast } from '@/hooks/use-toast';

interface PartyMapProps {
  events: Event[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onMarkerClick?: (event: Event) => void;
  showClusters?: boolean;
  showHeatmap?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

const PartyMap: React.FC<PartyMapProps> = ({
  events,
  center = { lat: 40.7128, lng: -74.0060 }, // Default to New York
  zoom = 11,
  height = '400px',
  onMarkerClick,
  showClusters = true,
  showHeatmap = false,
  userLocation = null
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Handle marker click
  const handleMarkerClick = (event: Event) => {
    setSelectedEvent(event);
    if (onMarkerClick) {
      onMarkerClick(event);
    }
  };

  // Create the initial view state for LeafletMap
  const initialViewState = {
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom
  };

  return (
    <div className="w-full h-full" style={{ height }}>
      <LeafletMap
        events={events}
        selectedEvent={selectedEvent}
        onEventSelect={handleMarkerClick}
        initialViewState={initialViewState}
        showControls={true}
      />
    </div>
  );
};

export default PartyMap;
