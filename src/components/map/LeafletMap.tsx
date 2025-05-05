
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Event } from '@/types';
import { getEventCoordinates, getPartyMarkerConfig } from './utils/partyMarkers';

interface LeafletMapProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventSelect: (event: Event) => void;
  initialViewState: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  showControls?: boolean;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  events,
  selectedEvent,
  onEventSelect,
  initialViewState,
  showControls = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current).setView(
      [initialViewState.latitude, initialViewState.longitude],
      initialViewState.zoom
    );

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Store map reference
    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when events change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    const newMarkers = events
      .filter(event => {
        const coords = getEventCoordinates(event);
        return coords !== null;
      })
      .map(event => {
        const coords = getEventCoordinates(event);
        if (!coords) return null;

        // Get marker configuration
        const config = getPartyMarkerConfig(event);
        
        // Create marker with custom icon
        const icon = L.divIcon({
          className: `custom-marker ${config.className || ''}`,
          html: `<div style="background-color: ${config.color}; width: ${config.size}px; height: ${config.size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"></div>`,
          iconSize: [config.size || 24, config.size || 24],
          iconAnchor: [(config.size || 24) / 2, (config.size || 24) / 2]
        });
        
        const marker = L.marker([coords[1], coords[0]], { icon });
        marker.addTo(mapRef.current!);
        
        // Add popup
        marker.bindPopup(`
          <div>
            <strong>${event.title}</strong><br>
            ${event.date} ${event.time ? `at ${event.time}` : ''}<br>
            ${event.location || ''}
          </div>
        `);
        
        // Add click handler
        marker.on('click', () => {
          onEventSelect(event);
        });
        
        return marker;
      })
      .filter(Boolean) as L.Marker[];
    
    markersRef.current = newMarkers;
    
    // If we have a selected event, highlight it
    if (selectedEvent) {
      const coords = getEventCoordinates(selectedEvent);
      if (coords && mapRef.current) {
        mapRef.current.setView([coords[1], coords[0]], Math.max(initialViewState.zoom, 12));
      }
    }
  }, [events, selectedEvent, onEventSelect]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      className="leaflet-container"
    />
  );
};

export default LeafletMap;
