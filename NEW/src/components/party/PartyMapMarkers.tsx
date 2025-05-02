import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { applyCoordinateJitter } from '@/utils/mapUtils';

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
  onMarkerClick,
}) => {
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  
  // Create and update markers
  useEffect(() => {
    // Remove any existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Add new markers for each event
    events.forEach(event => {
      if (!event.coordinates) return;
      
      // Apply small jitter to prevent exact overlaps
      const jitteredCoords = applyCoordinateJitter(event.coordinates);
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'party-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      
      // Style based on subcategory
      let color = '#8b5cf6'; // Default purple
      let emoji = '🎵'; // Default music note
      
      if (event.partySubcategory) {
        switch (event.partySubcategory) {
          case 'day-party':
            color = '#f59e0b';
            emoji = '☀️';
            break;
          case 'brunch':
            color = '#ec4899';
            emoji = '🍳';
            break;
          case 'club':
            color = '#6366f1';
            emoji = '🎧';
            break;
          case 'networking':
            color = '#3b82f6';
            emoji = '🤝';
            break;
          case 'celebration':
            color = '#ef4444';
            emoji = '🎉';
            break;
          case 'social':
            color = '#10b981';
            emoji = '👥';
            break;
          case 'festival':
            color = '#d946ef';
            emoji = '🎪';
            break;
          case 'rooftop':
            color = '#0ea5e9';
            emoji = '🏙️';
            break;
          case 'immersive':
            color = '#8b5cf6';
            emoji = '✨';
            break;
          case 'popup':
            color = '#f97316';
            emoji = '🎪';
            break;
          case 'nightclub':
            color = '#4f46e5';
            emoji = '🌃';
            break;
          default:
            color = '#8b5cf6';
            emoji = '🎵';
        }
      }
      
      // Style the marker
      el.style.backgroundColor = color;
      el.style.border = event.id === selectedEventId ? '3px solid white' : '2px solid rgba(255,255,255,0.7)';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '14px';
      el.style.transform = event.id === selectedEventId ? 'scale(1.2)' : 'scale(1)';
      el.style.transition = 'all 0.2s ease-in-out';
      el.innerHTML = emoji;
      
      // Create and add the marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat(jitteredCoords)
        .addTo(map);
      
      // Add click handler
      el.addEventListener('click', () => {
        onMarkerClick(event);
      });
      
      // Store marker reference
      markersRef.current[event.id] = marker;
    });
    
    // Clean up on unmount
    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
    };
  }, [map, events, selectedEventId, onMarkerClick]);
  
  // Update selected marker style when selection changes
  useEffect(() => {
    // Reset all markers to default style
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      el.style.border = id === selectedEventId ? '3px solid white' : '2px solid rgba(255,255,255,0.7)';
      el.style.transform = id === selectedEventId ? 'scale(1.2)' : 'scale(1)';
      el.style.zIndex = id === selectedEventId ? '10' : '1';
    });
    
    // If there's a selected event, fly to it
    if (selectedEventId && markersRef.current[selectedEventId]) {
      const marker = markersRef.current[selectedEventId];
      map.flyTo({
        center: marker.getLngLat(),
        zoom: 14,
        duration: 1000
      });
    }
  }, [map, selectedEventId]);
  
  return null; // This component doesn't render anything directly
};
