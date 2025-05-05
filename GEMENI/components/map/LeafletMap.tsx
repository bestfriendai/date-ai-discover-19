import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import type { EventFilters } from './components/MapControls';

// Fix Leaflet marker icon issue
// This is needed because Leaflet's default marker icons use relative paths that don't work in React
// @ts-ignore - Ignoring TypeScript error for Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component to update the map view when props change
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

interface LeafletMapProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventSelect?: (event: Event | null) => void;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  filters?: EventFilters;
  onFilterChange?: (filters: EventFilters) => void;
  showControls?: boolean;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  events,
  selectedEvent,
  onEventSelect,
  initialViewState,
  filters,
  onFilterChange,
  showControls = true
}) => {
  const [mapReady, setMapReady] = useState(false);
  
  // Filter events based on category filters
  const filteredEvents = events.filter(event => {
    if (!filters || !filters.categories || filters.categories.length === 0) {
      return true;
    }
    return filters.categories.includes(event.category || 'other');
  });
  
  useEffect(() => {
    // Only show this toast once when the component first mounts
    if (!mapReady) {
      console.log('[LeafletMap] Initializing OpenStreetMap');
      toast({
        title: "Using OpenStreetMap",
        description: "Map is powered by OpenStreetMap.",
        variant: "default"
      });
      setMapReady(true);
    }
  }, [mapReady]);

  // Create a default center position
  const defaultCenter: [number, number] = [initialViewState.latitude, initialViewState.longitude];
  const defaultZoom = initialViewState.zoom;

  return (
    <div className="w-full h-full relative">
      {/* @ts-ignore - Ignoring TypeScript errors for now to get the map working */}
      <MapContainer
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl overflow-hidden shadow-lg border border-border/50 transition-all duration-300 hover:shadow-xl"
        center={defaultCenter}
        zoom={defaultZoom}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ZoomControl position="bottomright" />
        
        <MapUpdater 
          center={defaultCenter}
          zoom={defaultZoom}
        />
        
        {filteredEvents.map((event) => {
          // Get coordinates from event, with fallbacks
          const lat = event.coordinates?.[1] || (event as any).latitude || 0;
          const lng = event.coordinates?.[0] || (event as any).longitude || 0;
          const position: [number, number] = [lat, lng];
          
          return (
            <Marker
              key={event.id}
              position={position}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg">{event.title || (event as any).name || 'Event'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{event.category || 'Uncategorized'}</p>
                  <button
                    className="bg-primary text-white px-3 py-1 rounded mt-3 text-sm font-medium hover:bg-primary/90"
                    onClick={() => onEventSelect && onEventSelect(event)}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
