import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import type { EventFilters } from './components/MapControls';
import { MapControlsContainer } from './components/MapControlsContainer';

// Fix Leaflet marker icon issue
// This is needed because Leaflet's default marker icons use relative paths that don't work in React
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Component to update the map view when props change
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

// Custom marker component with category-based styling
const EventMarker = ({ event, selected, onClick }: { 
  event: Event, 
  selected: boolean, 
  onClick: (event: Event) => void 
}) => {
  // Create a custom icon based on the event category
  const getMarkerIcon = (event: Event, isSelected: boolean) => {
    // Default colors
    let color = '#3B82F6'; // blue-500
    
    // Change color based on category
    if (event.category === 'food') color = '#EF4444'; // red-500
    if (event.category === 'outdoors') color = '#10B981'; // green-500
    if (event.category === 'culture') color = '#8B5CF6'; // purple-500
    if (event.category === 'nightlife') color = '#F59E0B'; // amber-500
    
    // Create a custom icon with the category color
    return L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="
        background-color: ${color};
        width: ${isSelected ? '30px' : '20px'};
        height: ${isSelected ? '30px' : '20px'};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
        transition: all 0.3s ease;
      "></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };
  
  const position: [number, number] = [
    event.coordinates?.[1] || event.latitude || 0,
    event.coordinates?.[0] || event.longitude || 0
  ];
  
  return (
    <Marker
      key={event.id}
      position={position}
      icon={getMarkerIcon(event, selected)}
      eventHandlers={{
        click: () => onClick(event)
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-lg">{event.title || event.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{event.category || 'Uncategorized'}</p>
          <p className="mt-2">{event.description?.substring(0, 100) || 'No description available'}{event.description?.length > 100 ? '...' : ''}</p>
          <button
            className="bg-primary text-white px-3 py-1 rounded mt-3 text-sm font-medium hover:bg-primary/90"
            onClick={() => onClick(event)}
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
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
      toast({
        title: "Using OpenStreetMap",
        description: "Map is powered by OpenStreetMap.",
        variant: "info"
      });
      setMapReady(true);
    }
  }, [mapReady]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[initialViewState.latitude, initialViewState.longitude]}
        zoom={initialViewState.zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={true}
        className="rounded-xl overflow-hidden shadow-lg border border-border/50 transition-all duration-300 hover:shadow-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ZoomControl position="bottomright" />
        
        <MapUpdater 
          center={[initialViewState.latitude, initialViewState.longitude]} 
          zoom={initialViewState.zoom} 
        />
        
        {filteredEvents.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            selected={selectedEvent?.id === event.id}
            onClick={(event) => onEventSelect && onEventSelect(event)}
          />
        ))}
      </MapContainer>
      
      {showControls && filters && onFilterChange && (
        <MapControlsContainer 
          filters={filters}
          onFilterChange={onFilterChange}
          className="absolute top-4 left-4 z-10"
        />
      )}
    </div>
  );
};

export default LeafletMap;
