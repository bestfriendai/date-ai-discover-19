
import React, { useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { Button } from '@/components/ui/button'; // Use your Button component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Use Card components
import { Clock, MapPin as MapPinIcon } from 'lucide-react'; // Assuming lucide-react is installed
import { cn } from '@/lib/utils'; // Import cn

interface MapPopupProps {
  map: mapboxgl.Map;
  event: Event;
  onClose: () => void;
  onViewDetails?: (event: Event) => void; // Pass event back
}

// Helper function to format date/time
const formatEventDateTime = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return 'Date TBD';
  // Combine date and time, handle potential missing time
  const dateTimeStr = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  try {
    // Basic formatting, consider a library like date-fns for robustness
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return 'Invalid Date'; // Check if date is valid
    return date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Invalid Date';
  }
};

export const MapPopup = ({ map, event, onClose, onViewDetails }: MapPopupProps) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null); // Ref for the container div

  useEffect(() => {
    if (!event?.coordinates) return;

    // --- Create Popup Content with React ---
    const PopupContent = () => (
      <Card className="w-64 border-none shadow-none rounded-none"> {/* Adjust width and remove card styles */}
        <CardHeader className="p-3">
          <CardTitle className="text-base leading-tight">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-sm">
          {event.category && (
            <p className="text-xs text-muted-foreground mb-2">
              Category: {event.category}
            </p>
          )}
          {(event.date || event.time) && ( // Use date and time
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              <span>{formatEventDateTime(event.date, event.time)}</span>
            </div>
          )}
          {event.location && ( // Use location
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <MapPinIcon className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
          )}
          {onViewDetails && (
            <Button
              size="sm" // Keep size prop
              className="w-full h-8"
              id={`popup-details-btn-${event.id}`}
              // Workaround for TS error: Cast props to any
              {...({} as any)}
            >
              View Details
            </Button>
          )}
        </CardContent>
      </Card>
    );

    // Render React component to string
    const popupHtml = ReactDOMServer.renderToString(<PopupContent />);

    // Create a container div to attach the event listener later
    if (!containerRef.current) {
        containerRef.current = document.createElement('div');
    }
    containerRef.current.innerHTML = popupHtml;


    // --- Create or Update Mapbox Popup ---
    if (popupRef.current) {
      // If popup exists, update its content and location
      popupRef.current.setLngLat([event.coordinates[0], event.coordinates[1]]);
      // Workaround for TS error: Cast popup to any before calling setDOMContent
      (popupRef.current as any).setDOMContent(containerRef.current);
    } else {
      // Create new popup
      popupRef.current = new mapboxgl.Popup({
        closeOnClick: false,
        offset: 25, // Adjust offset if needed
        className: 'date-ai-popup', // Add custom class for styling
      })
        .setLngLat([event.coordinates[0], event.coordinates[1]])
         // Workaround for TS error: Cast popup to any before calling setDOMContent
        .setDOMContent(containerRef.current as any)
        .addTo(map);

      // Add close listener only once
      popupRef.current.on('close', onClose);
    }

    // --- Add Event Listener for the Button ---
    // We need to re-attach the listener every time content updates
    const buttonElement = containerRef.current.querySelector(`#popup-details-btn-${event.id}`);
    if (buttonElement && onViewDetails) {
        const clickHandler = () => {
            onViewDetails(event); // Pass the event back
            popupRef.current?.remove(); // Close popup after click
        };
        // Remove previous listener if any before adding new one
        buttonElement.removeEventListener('click', clickHandler);
        buttonElement.addEventListener('click', clickHandler);
    }


    // --- Cleanup ---
    return () => {
      // Don't remove the popup here if it's just updating
      // It will be removed when the component unmounts or onClose is called
    };

  }, [map, event, onClose, onViewDetails]); // Rerun effect if event changes

  // Effect to remove popup when component unmounts or event becomes null
  useEffect(() => {
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, []);

  return null; // Component manages the popup directly
};
