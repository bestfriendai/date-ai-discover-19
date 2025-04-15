
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

interface MapPopupProps {
  map: mapboxgl.Map;
  event: Event;
  onClose: () => void;
  onViewDetails?: () => void;
}

export const MapPopup = ({ map, event, onClose, onViewDetails }: MapPopupProps) => {
  if (!event.coordinates) return null;

  const popupEl = document.createElement('div');
  popupEl.className = 'p-2 max-w-[200px]';
  popupEl.innerHTML = `
    <h3 class="font-semibold text-sm mb-1">${event.title}</h3>
    <div class="text-xs text-muted-foreground mb-2">
      Category: ${event.category}
    </div>
    <button class="w-full px-4 py-2 text-xs bg-primary text-white rounded-md">
      View Details
    </button>
  `;

  const popup = new mapboxgl.Popup({ closeOnClick: false })
    .setLngLat([event.coordinates[0], event.coordinates[1]])
    .setHTML(popupEl.outerHTML);
  
  popup.addTo(map);
  
  return null; // This is a utility component that doesn't render anything
};
