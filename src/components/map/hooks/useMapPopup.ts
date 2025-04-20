// src/components/map/hooks/useMapPopup.ts

import { useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types'; // Corrected import path

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
    // Format to a more human-readable string, handle potential errors
    const options: Intl.DateTimeFormatOptions = {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    };
    // Use try-catch in case locale/options are invalid
    try {
        return date.toLocaleString(undefined, options);
    } catch (localeError) {
        console.warn("[MapPopup] Error formatting date with locale:", localeError, "Falling back to default format.");
        return date.toLocaleString(); // Fallback
    }
  } catch (e) {
    console.error("[MapPopup] Error parsing or formatting date:", e, { dateStr, timeStr });
    return 'Invalid Date/Time'; // More specific error message
  }
};

export const useMapPopup = ({ map, event, onClose, onViewDetails, onAddToPlan }: UseMapPopupProps) => {
  // Ref to hold the Mapbox popup instance
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  // Ref to hold references to attached DOM event listeners for cleanup
  const buttonListenersRef = useRef<Array<{ element: HTMLElement, type: string, handler: EventListener }>>([]);

  // Define the handler for the Mapbox popup's 'close' event
  const handlePopupClose = useCallback(() => {
    console.log('[useMapPopup] Mapbox popup "close" event fired.');
    // Only call the external onClose handler, do NOT call popupRef.current.remove() here
    // The parent component (MapComponent) will set the event prop to null based on this.
    // The useEffect below will then handle the actual popup removal.
    onClose();
  }, [onClose]); // Depend on the external onClose prop

  // Cleanup function to remove DOM button listeners
  const cleanupButtonListeners = useCallback(() => {
      buttonListenersRef.current.forEach(({ element, type, handler }) => {
          // Check if the element is still attached to the document before trying to remove the listener
          if (element && element.removeEventListener) { // Added element check for safety
             element.removeEventListener(type, handler);
          }
      });
      buttonListenersRef.current = []; // Clear the stored references
       console.log('[useMapPopup] Cleaned up button listeners.');
  }, []);


  // Main effect to manage the Mapbox popup lifecycle
  useEffect(() => {
    // If map is not initialized, or event is null/missing coordinates, ensure popup is closed
    if (!map || !event?.coordinates) {
      if (popupRef.current) {
        console.log('[useMapPopup] Event is null or missing coordinates, removing existing popup.');
        // Explicitly remove the Mapbox popup instance
        popupRef.current.remove();
        popupRef.current = null;
        // Cleanup listeners associated with the old popup element
        cleanupButtonListeners();
         // Note: We don't call onClose here because the state change (setting event to null)
         // that caused this path to be taken already originated from the parent, often via onClose.
         // Calling it again could lead to infinite loops if not careful.
      }
      return; // Nothing to do if no event or map
    }

    // Ensure coordinates are valid (Mapbox expects [longitude, latitude])
    const coordinates = Array.isArray(event.coordinates) && event.coordinates.length === 2 &&
                        typeof event.coordinates[0] === 'number' && typeof event.coordinates[1] === 'number' &&
                        !isNaN(event.coordinates[0]) && !isNaN(event.coordinates[1])
      ? (event.coordinates as [number, number])
      : undefined;

    if (!coordinates) {
      console.warn('[useMapPopup] Cannot open popup: event has invalid coordinates', event);
      // If we have a popup open but the event suddenly has invalid coords, close it.
      if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
          cleanupButtonListeners();
      }
      return; // Cannot proceed without valid coordinates
    }

    // Create HTML content for the popup
    const createPopupHTML = (event: Event) => { // Pass event to ensure latest data
      // Get category color (can be moved to a helper if used elsewhere)
      const getCategoryColor = (category: string = ''): string => {
        const lowerCategory = category.toLowerCase();
        if (lowerCategory.includes('music')) return '#3b82f6'; // blue
        if (lowerCategory.includes('sports')) return '#22c55e'; // green
        if (lowerCategory.includes('arts') || lowerCategory.includes('theatre')) return '#ec4899'; // pink
        if (lowerCategory.includes('family')) return '#eab308'; // yellow
        if (lowerCategory.includes('food') || lowerCategory.includes('restaurant')) return '#f97316'; // orange
        if (lowerCategory.includes('party')) return '#a855f7'; // purple
        return '#6b7280'; // gray default
      };

      const categoryColor = getCategoryColor(event.category);
      const formattedDateTime = formatEventDateTime(event.date, event.time);

      // Use simpler styling here as Tailwind classes aren't processed within the raw HTML string
      // Consider using ReactDOMServer.renderToString for more complex React content
      const html = `
        <div class="map-popup-content" style="padding: 12px; font-family: sans-serif; max-width: 300px; color: #333;">
          ${event.image ? `
            <div class="popup-image" style="height: 100px; overflow: hidden; border-radius: 4px; margin-bottom: 8px; background-color: #eee;">
              <img src="${event.image}" alt="${event.title || 'Event image'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null;this.src='/placeholder.svg';">
            </div>
          ` : ''}
          <div style="margin-bottom: 4px;">
            <span class="category-badge" style="background-color: ${categoryColor}; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: capitalize; margin-right: 4px;">${event.category || 'Event'}</span>
            ${event.price ? `<span class="price-badge" style="background-color: #eee; color: #333; font-size: 10px; padding: 2px 6px; border-radius: 4px; float: right;">${event.price}</span>` : ''}
          </div>
          <h3 style="font-weight: 600; margin: 4px 0; font-size: 15px; line-height: 1.3;">${event.title || 'Untitled Event'}</h3>
          <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
            <div>${formattedDateTime}</div>
            ${event.location ? `<div>${event.location}</div>` : ''}
          </div>
          <div class="popup-actions" style="display: flex; gap: 8px; margin-top: 8px;">
            ${onViewDetails ? `
              <button id="view-details-btn" style="flex: 1; background-color: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; text-align: center; transition: background-color 0.2s;">View Details</button>
            ` : ''}
             ${onAddToPlan ? `
              <button id="add-to-plan-btn" style="background-color: transparent; border: 1px solid #ccc; color: #333; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: background-color 0.2s;" title="Add to Plan">+</button>
             ` : ''}
            ${event.url ? `
              <button id="external-link-btn" style="background-color: transparent; border: 1px solid #ccc; color: #333; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: background-color 0.2s;" title="Visit Website">↗</button>
            ` : ''}
          </div>
        </div>
      `;

      return html;
    };

    // If a popup already exists, remove its old listeners and update its content/position
    if (popupRef.current) {
        console.log('[useMapPopup] Existing popup found, updating.');
        // Remove old button listeners before updating HTML
        cleanupButtonListeners();
        // Update content and position
        popupRef.current
          .setLngLat(coordinates)
          .setHTML(createPopupHTML(event)); // Use the latest event data
         console.log('[useMapPopup] Existing popup updated.');

    } else {
        // Create a new Mapbox popup instance if none exists
        console.log('[useMapPopup] No existing popup found, creating new instance.');
        const newPopup = new mapboxgl.Popup({
          closeOnClick: false, // Prevent closing when map is clicked outside popup
          closeButton: true,
          offset: 25,
          className: 'date-ai-popup-container', // Custom class for styling
          maxWidth: '300px'
        })
        .setLngLat(coordinates)
        .setHTML(createPopupHTML(event)) // Use the latest event data
        .addTo(map); // Add to the map

        popupRef.current = newPopup;

        // Add the 'close' listener *once* when the popup is created
        // This listener calls handlePopupClose, which triggers the parent's onClose prop.
        newPopup.on('close', handlePopupClose);
        console.log('[useMapPopup] New popup created and added to map, close listener attached.');
    }

    // Add event listeners for the buttons inside the popup HTML
    // These need to be re-attached every time the popup content is set or updated
    requestAnimationFrame(() => { // Ensure DOM is ready after setHTML
        const container = popupRef.current?.getElement(); // Get the root DOM element of the popup

        if (container) {
            console.log('[useMapPopup] Attaching button listeners to popup element.');
            const viewDetailsBtn = container.querySelector('#view-details-btn');
            if (viewDetailsBtn && onViewDetails) { // Check if button exists and handler is provided
                const handler = () => {
                  console.log('[useMapPopup] View details button clicked.');
                  onViewDetails(event); // Use the latest event object
                };
                viewDetailsBtn.addEventListener('click', handler);
                buttonListenersRef.current.push({ element: viewDetailsBtn as HTMLElement, type: 'click', handler: handler as EventListener });
            }

            const addToPlanBtn = container.querySelector('#add-to-plan-btn');
            if (addToPlanBtn && onAddToPlan) { // Check if button exists and handler is provided
                 const handler = () => {
                   console.log('[useMapPopup] Add to plan button clicked.');
                   onAddToPlan(event); // Use the latest event object
                 };
                 addToPlanBtn.addEventListener('click', handler);
                 buttonListenersRef.current.push({ element: addToPlanBtn as HTMLElement, type: 'click', handler: handler as EventListener });
            }

            const externalLinkBtn = container.querySelector('#external-link-btn');
            if (externalLinkBtn && event.url) { // Check if button exists and URL is provided
                const handler = () => {
                    console.log('[useMapPopup] External link button clicked.');
                   window.open(event.url, '_blank'); // Use the latest event object's URL
                };
                externalLinkBtn.addEventListener('click', handler);
                buttonListenersRef.current.push({ element: externalLinkBtn as HTMLElement, type: 'click', handler: handler as EventListener });
            }
            console.log('[useMapPopup] Finished attaching button listeners.');
        } else {
             console.warn('[useMapPopup] Popup container element not found after setHTML, could not attach button listeners.');
        }
    });


    // Effect cleanup function
    return () => {
      console.log('[useMapPopup] Effect dependencies changed or component unmounting.');
      // This runs when the 'event' or 'map' prop changes, or when the component unmounts.
      // It should clean up listeners *before* potentially creating a new popup or removing the old one.

      // Remove button listeners from the *current* popup element
      cleanupButtonListeners();

      // The Mapbox 'close' listener (handlePopupClose) is managed by the initial popup creation logic
      // and will correctly call onClose when the user clicks the Mapbox close button.
      // The actual popupRef.current.remove() is handled by the logic at the start of this useEffect
      // when event becomes null or map becomes null.
    };
  }, [map, event, handlePopupClose, onViewDetails, onAddToPlan, cleanupButtonListeners]); // Effect dependencies

  // Effect to remove the popup when the hook unmounts
  useEffect(() => {
    return () => {
      console.log('[useMapPopup] Hook unmounting, ensuring popup is removed and listeners are cleaned up.');
      // This is the final cleanup when the component using the hook is removed.
      if (popupRef.current) {
        // Remove the Mapbox 'close' listener specifically attached during creation
        // This prevents handlePopupClose from being called when we manually remove here.
        // Check if the listener exists before trying to remove it
        // Note: Mapbox GL JS doesn't provide a direct 'getListener' method.
        // We rely on the fact that we only add it once and remove it here.
        // A more robust way might involve tracking the listener state, but this is common practice.
        try {
           popupRef.current.off('close', handlePopupClose);
           console.log('[useMapPopup] Removed Mapbox close listener.');
        } catch (e) {
           console.warn('[useMapPopup] Error removing Mapbox close listener during unmount:', e);
        }

        popupRef.current.remove();
        popupRef.current = null;
        console.log('[useMapPopup] Mapbox popup instance removed.');
      }
      // Ensure button listeners are also cleaned up
      cleanupButtonListeners();
      console.log('[useMapPopup] Final cleanup complete.');
    };
  }, [handlePopupClose, cleanupButtonListeners]); // This effect runs only on mount and unmount


  // The hook itself doesn't return JSX, it manages the side effect of showing/hiding the Mapbox popup
  return { popupRef }; // Optionally return popupRef if needed externally
};
