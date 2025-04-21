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
    // Popups have been disabled as requested
    console.log('[useMapPopup] Popups are disabled as requested');

    // Clean up any existing popup
    if (popupRef.current) {
      console.log('[useMapPopup] Removing existing popup.');
      popupRef.current.remove();
      popupRef.current = null;
      cleanupReactRoot();
    }

    // We still want to maintain the event selection functionality
    // but without showing the popup

    return () => {
      // Cleanup function when dependencies change
      cleanupReactRoot();
    };
  }, [map, event, cleanupReactRoot]);


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
