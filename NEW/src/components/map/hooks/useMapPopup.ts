import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

export const useMapPopup = (
  map: mapboxgl.Map | null,
  selectedEvent: Event | null,
  onEventSelect: ((event: Event | null) => void) | undefined
) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Create and manage popups
  useEffect(() => {
    if (!map) return;

    // Create a popup but don't add it to the map yet
    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
      className: 'map-popup'
    });

    // Add popup close handler
    popupRef.current.on('close', () => {
      if (onEventSelect) {
        onEventSelect(null);
      }
    });

    return () => {
      // Clean up popup when component unmounts
      if (popupRef.current) {
        popupRef.current.remove();
      }
    };
  }, [map, onEventSelect]);

  // Show popup for selected event
  useEffect(() => {
    if (!map || !popupRef.current) return;

    // Remove existing popup
    popupRef.current.remove();

    // If there's a selected event with coordinates, show popup
    if (selectedEvent && selectedEvent.coordinates) {
      const [lng, lat] = selectedEvent.coordinates;

      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'popup-content';
      
      // Add event image if available
      if (selectedEvent.image) {
        const img = document.createElement('img');
        img.src = selectedEvent.image;
        img.alt = selectedEvent.title;
        img.className = 'popup-image';
        img.style.width = '100%';
        img.style.height = '120px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        img.style.marginBottom = '8px';
        popupContent.appendChild(img);
      }
      
      // Add event title
      const title = document.createElement('h3');
      title.textContent = selectedEvent.title;
      title.style.fontWeight = 'bold';
      title.style.fontSize = '16px';
      title.style.marginBottom = '4px';
      popupContent.appendChild(title);
      
      // Add event date and time
      if (selectedEvent.date || selectedEvent.time) {
        const datetime = document.createElement('p');
        datetime.textContent = `${selectedEvent.date || ''} ${selectedEvent.time || ''}`;
        datetime.style.fontSize = '14px';
        datetime.style.marginBottom = '4px';
        popupContent.appendChild(datetime);
      }
      
      // Add event location
      if (selectedEvent.location) {
        const location = document.createElement('p');
        location.textContent = selectedEvent.location;
        location.style.fontSize = '14px';
        location.style.marginBottom = '8px';
        popupContent.appendChild(location);
      }
      
      // Add view details button
      const button = document.createElement('button');
      button.textContent = 'View Details';
      button.className = 'popup-button';
      button.style.backgroundColor = '#3b82f6';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '4px';
      button.style.padding = '6px 12px';
      button.style.cursor = 'pointer';
      button.style.fontSize = '14px';
      button.onclick = (e) => {
        e.stopPropagation();
        if (onEventSelect) {
          onEventSelect(selectedEvent);
        }
      };
      popupContent.appendChild(button);

      // Set popup content and add to map
      popupRef.current
        .setLngLat([lng, lat])
        .setDOMContent(popupContent)
        .addTo(map);
    }
  }, [map, selectedEvent, onEventSelect]);

  return popupRef.current;
};
