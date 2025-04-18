
import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

export const useMapPopup = (
  map: mapboxgl.Map | null,
  event: Event | null,
  onClose: () => void,
  onViewDetails?: (event: Event) => void
) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map || !event?.coordinates) {
      popupRef.current?.remove();
      return;
    }

    // Create or update popup
    if (popupRef.current) {
      popupRef.current.setLngLat(event.coordinates);
    } else {
      popupRef.current = new mapboxgl.Popup({
        closeOnClick: false,
        offset: 25,
        className: 'date-ai-popup',
      })
        .setLngLat(event.coordinates)
        .addTo(map);

      popupRef.current.on('close', onClose);
    }

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map, event, onClose]);

  return popupRef;
};
