
import { useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

interface UseMapPopupProps {
  map: mapboxgl.Map | null;
  event: Event | null;
  onClose: () => void;
  onViewDetails?: (event: Event) => void;
  onAddToPlan?: (event: Event) => void;
}

// Helper function to format date/time
const formatEventDateTime = (dateStr?: string, timeStr?: string): string => {
  if (!dateStr) return 'Date TBD';
  // Combine date and time, handle potential missing time
  const dateTimeStr = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  try {
    const date = new Date(dateTimeStr);
    // Check if date is valid, also check if it's the default invalid date (epoch start)
    if (isNaN(date.getTime()) || date.getTime() === new Date(0).getTime()) return 'Invalid Date';
    return date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  } catch (e) {
    console.error("[MapPopup] Error formatting date:", e);
    return 'Invalid Date';
  }
};

export const useMapPopup = ({ map, event, onClose, onViewDetails, onAddToPlan }: UseMapPopupProps) => {
  // Ref to hold the Mapbox popup instance
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  
  const closePopup = useCallback(() => {
    console.log('[useMapPopup] Closing popup');
    
    // Remove the Mapbox popup
    popupRef.current?.remove();
    popupRef.current = null;
    onClose();
  }, [onClose]);

  useEffect(() => {
    // If no map or no event, ensure popup is closed
    if (!map || !event?.coordinates) {
      if (popupRef.current) {
        console.log('[useMapPopup] Event null or no coordinates, removing popup');
        closePopup();
      }
      return;
    }

    // Coordinates must be [longitude, latitude]
    const coordinates = Array.isArray(event.coordinates) && event.coordinates.length === 2
      ? (event.coordinates as [number, number])
      : undefined;

    if (!coordinates) {
      console.warn('[useMapPopup] Cannot open popup: event has no valid coordinates', event);
      closePopup();
      return;
    }

    // Create HTML content for the popup
    const createPopupHTML = () => {
      // Get category color
      const getCategoryColor = (category: string = '') => {
        const lowerCategory = category.toLowerCase();
        if (lowerCategory === 'music') return '#3b82f6';
        if (lowerCategory === 'sports') return '#22c55e';
        if (lowerCategory === 'arts' || lowerCategory === 'theatre') return '#ec4899';
        if (lowerCategory === 'family') return '#eab308';
        if (lowerCategory === 'food' || lowerCategory === 'restaurant') return '#f97316';
        if (lowerCategory === 'party') return '#a855f7';
        return '#6b7280';
      };

      const categoryColor = getCategoryColor(event.category);
      const formattedDate = formatEventDateTime(event.date, event.time);
      
      const html = `
        <div class="map-popup-content">
          ${event.image ? `
            <div class="popup-image" style="height: 100px; overflow: hidden; border-radius: 4px; margin-bottom: 8px;">
              <img src="${event.image}" alt="${event.title}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          ` : ''}
          <div style="margin-bottom: 4px;">
            <span class="category-badge" style="background-color: ${categoryColor}; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px;">${event.category || 'Event'}</span>
            ${event.price ? `<span class="price-badge" style="background-color: rgba(0,0,0,0.1); font-size: 10px; padding: 2px 6px; border-radius: 4px; float: right;">${event.price}</span>` : ''}
          </div>
          <h3 style="font-weight: 600; margin: 4px 0; font-size: 14px;">${event.title}</h3>
          <div style="font-size: 12px; color: #666; margin-bottom: 6px;">
            <div>${formattedDate}</div>
            ${event.location ? `<div>${event.location}</div>` : ''}
          </div>
          <div class="popup-actions" style="display: flex; gap: 4px; margin-top: 8px;">
            <button id="view-details-btn" style="flex: 1; background-color: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">View Details</button>
            <button id="add-to-plan-btn" style="background-color: transparent; border: 1px solid #ccc; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">+</button>
            ${event.url ? `<button id="external-link-btn" style="background-color: transparent; border: 1px solid #ccc; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">↗</button>` : ''}
          </div>
        </div>
      `;
      
      return html;
    };

    // Log only event ID to avoid deep traversal
    if (event?.id) {
      console.log('[useMapPopup] Opening popup for event ID:', event.id);
    } else if (popupRef.current) {
       console.log('[useMapPopup] Closing popup');
    }

    // Create the Mapbox popup instance if it doesn't exist
    if (!popupRef.current) {
      console.log('[useMapPopup] Creating new Mapbox popup instance');
      popupRef.current = new mapboxgl.Popup({
        closeOnClick: false, // Prevent closing when map is clicked
        closeButton: true,
        offset: 25,
        className: 'date-ai-popup-container', // Optional class for styling
        maxWidth: '300px'
      })
      .setLngLat(coordinates)
      .setHTML(createPopupHTML())
      .addTo(map);

      // Set up event listeners for buttons
      const container = popupRef.current.getElement();
      
      const viewDetailsBtn = container.querySelector('#view-details-btn');
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
          console.log('[useMapPopup] View details button clicked');
          onViewDetails?.(event);
        });
      }
      
      const addToPlanBtn = container.querySelector('#add-to-plan-btn');
      if (addToPlanBtn) {
        addToPlanBtn.addEventListener('click', () => {
          console.log('[useMapPopup] Add to plan button clicked');
          onAddToPlan?.(event);
        });
      }
      
      const externalLinkBtn = container.querySelector('#external-link-btn');
      if (externalLinkBtn && event.url) {
        externalLinkBtn.addEventListener('click', () => {
          window.open(event.url, '_blank');
        });
      }

      // Set the close listener
      popupRef.current.on('close', closePopup);
    } else {
      console.log('[useMapPopup] Reusing existing Mapbox popup instance');
      popupRef.current
        .setLngLat(coordinates)
        .setHTML(createPopupHTML());
      
      // Set up event listeners for buttons
      const container = popupRef.current.getElement();
      
      const viewDetailsBtn = container.querySelector('#view-details-btn');
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
          console.log('[useMapPopup] View details button clicked');
          onViewDetails?.(event);
        });
      }
      
      const addToPlanBtn = container.querySelector('#add-to-plan-btn');
      if (addToPlanBtn) {
        addToPlanBtn.addEventListener('click', () => {
          console.log('[useMapPopup] Add to plan button clicked');
          onAddToPlan?.(event);
        });
      }
      
      const externalLinkBtn = container.querySelector('#external-link-btn');
      if (externalLinkBtn && event.url) {
        externalLinkBtn.addEventListener('click', () => {
          window.open(event.url, '_blank');
        });
      }
    }

    return () => {
      console.log('[useMapPopup] Effect cleanup triggered (event change or unmount)');
    };
  }, [map, event, closePopup, onViewDetails, onAddToPlan]);

  // Effect to remove popup when the hook unmounts
  useEffect(() => {
    return () => {
      console.log('[useMapPopup] Hook unmounting, ensuring popup is removed');
      closePopup();
    };
  }, [closePopup]);

  // The hook itself doesn't return JSX, it manages the side effect of showing/hiding the Mapbox popup
  return { popupRef, closePopup };
};
