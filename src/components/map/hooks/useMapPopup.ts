// src/components/map/hooks/useMapPopup.ts

import { useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { createRoot, type Root } from 'react-dom/client';
import { EventPopup } from '../popups/EventPopup';

interface UseMapPopupProps {
  map: mapboxgl.Map | null;
  event: Event | null;
  onClose: () => void;
  onViewDetails?: (event: Event) => void;
  onAddToPlan?: (event: Event) => void;
}

export const useMapPopup = ({ map, event, onClose, onViewDetails, onAddToPlan }: UseMapPopupProps) => {
  // Ref to hold the Mapbox popup instance
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  // Ref to hold the React root for the popup content
  const popupRootRef = useRef<Root | null>(null);

  // Define the handler for the Mapbox popup's 'close' event
  const handlePopupClose = useCallback(() => {
    console.log('[useMapPopup] Mapbox popup "close" event fired.');
    onClose();
  }, [onClose]);

  // Cleanup function to unmount React root
  const cleanupReactRoot = useCallback(() => {
    if (popupRootRef.current) {
      popupRootRef.current.unmount();
      popupRootRef.current = null;
      console.log('[useMapPopup] Cleaned up React root.');
    }
  }, []);

  // Main effect to manage the Mapbox popup lifecycle
  useEffect(() => {
    // If map is not initialized, or event is null/missing coordinates, ensure popup is closed
    if (!map || !event?.coordinates) {
      if (popupRef.current) {
        console.log('[useMapPopup] Event is null or missing coordinates, removing existing popup.');
        popupRef.current.remove();
        popupRef.current = null;
        cleanupReactRoot();
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
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
        cleanupReactRoot();
      }
      return; // Cannot proceed without valid coordinates
    }

    // Create a popup container and render React into it
    const createPopupContent = () => {
      const popupContainer = document.createElement('div');
      popupContainer.className = 'date-ai-popup-content-wrapper';

      // Clean up any existing React root
      cleanupReactRoot();

      // Create a new React root and render the EventPopup component
      const root = createRoot(popupContainer);

      // Use the EventPopup component
      root.render(
        EventPopup({
          event,
          onViewDetails: onViewDetails ? () => onViewDetails(event) : undefined,
          onAddToPlan: onAddToPlan ? () => onAddToPlan(event) : undefined
        })
      );

      // Store the root for cleanup
      popupRootRef.current = root;

      return popupContainer;
    };

    // If a popup already exists, update its content and position
    if (popupRef.current) {
      console.log('[useMapPopup] Existing popup found, updating.');
      // Use type assertion to handle the missing setDOMContent in type definition
      const popup = popupRef.current as any;
      popup.setLngLat(coordinates);
      popup.setDOMContent(createPopupContent());
      console.log('[useMapPopup] Existing popup updated with React content.');
    } else {
      // Create a new Mapbox popup instance
      console.log('[useMapPopup] No existing popup found, creating new instance.');
      const newPopup = new mapboxgl.Popup({
        closeOnClick: false,
        closeButton: true,
        offset: 25,
        className: 'date-ai-popup-container',
        maxWidth: '300px'
      });

      // Use type assertion for methods not in TypeScript definitions
      const popup = newPopup as any;
      popup.setLngLat(coordinates);
      popup.setDOMContent(createPopupContent());
      popup.addTo(map);

      // Add the 'close' listener
      newPopup.on('close', handlePopupClose);

      // Store the popup reference
      popupRef.current = newPopup;
      console.log('[useMapPopup] New popup created and added to map with React content.');
    }

    // Cleanup function for when dependencies change
    return () => {
      console.log('[useMapPopup] Effect dependencies changed, cleaning up React root.');
      cleanupReactRoot();
      // Note: We don't remove the popup here, as it will be updated or removed in the next effect run
    };
  }, [map, event, onViewDetails, onAddToPlan, cleanupReactRoot, handlePopupClose]);

  // Effect to remove the popup when the hook unmounts
  useEffect(() => {
    return () => {
      console.log('[useMapPopup] Hook unmounting, cleaning up resources.');
      if (popupRef.current) {
        try {
          popupRef.current.off('close', handlePopupClose);
        } catch (e) {
          console.warn('[useMapPopup] Error removing close listener:', e);
        }
        popupRef.current.remove();
        popupRef.current = null;
      }
      cleanupReactRoot();
      console.log('[useMapPopup] Cleanup complete.');
    };
  }, [handlePopupClose, cleanupReactRoot]);

  // Return the popup reference if needed externally
  return { popupRef };
};
