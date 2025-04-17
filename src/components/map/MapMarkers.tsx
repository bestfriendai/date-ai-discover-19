import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import ReactDOMServer from 'react-dom/server';
import type { Event } from '@/types';

// Custom marker component for different categories
const CategoryMarker = ({ category, isSelected = false }: { category: string; isSelected?: boolean }) => {
  let bgColor = 'bg-gray-700';
  let textColor = 'text-white';
  
  switch (category?.toLowerCase()) {
    case 'music':
      bgColor = 'bg-blue-500';
      break;
    case 'sports':
      bgColor = 'bg-green-500';
      break;
    case 'arts':
    case 'theatre':
      bgColor = 'bg-pink-500';
      break;
    case 'family':
      bgColor = 'bg-yellow-400';
      textColor = 'text-gray-900';
      break;
    case 'food':
    case 'restaurant':
      bgColor = 'bg-orange-500';
      break;
  }
  
  const size = isSelected ? 'w-8 h-8' : 'w-6 h-6';
  const border = isSelected ? 'border-2 border-white shadow-lg' : '';
  const scale = isSelected ? 'scale-125' : '';
  const zIndex = isSelected ? 'z-10' : 'z-0';
  
  return (
    <div className={`${bgColor} ${textColor} ${size} ${border} ${scale} ${zIndex} rounded-full flex items-center justify-center transition-all duration-200 shadow-md`}>
      {getIconForCategory(category)}
    </div>
  );
};

// Helper function to get the appropriate icon for each category
const getIconForCategory = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'music':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'sports':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      );
    case 'arts':
    case 'theatre':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7h20" />
          <path d="M20 7v14" />
          <path d="M4 7v14" />
          <path d="M12 7v14" />
          <path d="M12 21h8" />
          <path d="M4 21h8" />
          <path d="M15 4h-3" />
          <path d="M10 4H7" />
          <path d="M17 4h3" />
          <path d="M12 4v3" />
        </svg>
      );
    case 'family':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'food':
    case 'restaurant':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10h10" />
          <path d="M7 14h10" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
};

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
  selectedEvent: Event | null;
}

const MapMarkers = ({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  
  // Create and update markers
  useEffect(() => {
    const currentMarkerIds = Object.keys(markersRef.current);
    const newMarkerIds = events.map(event => event.id);
    
    // Remove markers that are no longer in the events array
    currentMarkerIds.forEach(id => {
      if (!newMarkerIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
    
    // Add or update markers
    events.forEach(event => {
      if (!event.coordinates || event.coordinates.length !== 2) return;
      
      const [lng, lat] = event.coordinates;
      const isSelected = selectedEvent?.id === event.id;
      
      // Create marker element
      const markerHtml = ReactDOMServer.renderToString(
        <CategoryMarker category={event.category || 'other'} isSelected={isSelected} />
      );
      
      const el = document.createElement('div');
      el.innerHTML = markerHtml;
      el.className = 'marker cursor-pointer';
      el.addEventListener('click', () => onMarkerClick(event));
      el.addEventListener('mouseenter', () => setHoveredEvent(event.id));
      el.addEventListener('mouseleave', () => setHoveredEvent(null));
      
      // Add or update marker
      if (markersRef.current[event.id]) {
        // Update existing marker
        markersRef.current[event.id].setLngLat([lng, lat]);
        
        // Update marker element if selected state changed
        if (isSelected !== (markersRef.current[event.id].getElement().querySelector('.scale-125') !== null)) {
          markersRef.current[event.id].remove();
          markersRef.current[event.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
        }
      } else {
        // Create new marker
        markersRef.current[event.id] = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      }
      
      // Bring selected marker to front
      if (isSelected && markersRef.current[event.id]) {
        markersRef.current[event.id].remove();
        markersRef.current[event.id].addTo(map);
      }
    });
    
    return () => {
      // Clean up all markers when component unmounts
      Object.values(markersRef.current).forEach(marker => marker.remove());
    };
  }, [events, map, onMarkerClick, selectedEvent]);
  
  // Handle hover effects
  useEffect(() => {
    if (hoveredEvent && markersRef.current[hoveredEvent]) {
      const marker = markersRef.current[hoveredEvent];
      const element = marker.getElement();
      
      // Add hover effect
      element.style.transform = 'scale(1.1)';
      element.style.zIndex = '100';
      
      return () => {
        // Remove hover effect
        element.style.transform = '';
        element.style.zIndex = '';
      };
    }
  }, [hoveredEvent]);
  
  return null; // This component doesn't render anything directly
};

export default MapMarkers;
