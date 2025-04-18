import { useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin as MapPinIcon, Plus, ExternalLink } from 'lucide-react';
import { createRoot, type Root } from 'react-dom/client';

interface UseMapPopupProps {
  map: mapboxgl.Map | null;
  event: Event | null;
  onClose: () => void;
  onViewDetails?: (event: Event) => void;
  onAddToPlan?: (event: Event) => void;
}

// Helper function to format date/time
const formatEventDateTime = (dateStr?: string, timeStr?: string) => {
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
  // Ref to hold the React root for rendering popup content
  const popupContentRootRef = useRef<Root | null>(null);
  // Ref to hold the DOM element Mapbox creates for the popup content
  const popupContentContainerRef = useRef<HTMLDivElement | null>(null);

  const closePopup = useCallback(() => {
      console.log('[useMapPopup] Closing popup');
      // Unmount the React tree first
      popupContentRootRef.current?.unmount();
      popupContentRootRef.current = null;
      popupContentContainerRef.current = null;

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

    console.log('[useMapPopup] Event with coordinates received, opening popup:', event.id);

    // Function to render or update the React content in the popup
    const renderPopupContent = () => {
        // Create the DOM container if it doesn't exist yet
        if (!popupContentContainerRef.current) {
            popupContentContainerRef.current = document.createElement('div');
            // You can add classes to style this container
             popupContentContainerRef.current.className = 'date-ai-popup-content-wrapper';
        }

        // Create or get the React root
        if (!popupContentRootRef.current) {
            popupContentRootRef.current = createRoot(popupContentContainerRef.current);
        }

        // Render the React component into the container
        // This component contains all the interactive elements (buttons)
        popupContentRootRef.current.render(
            <PopupContentComponent
                event={event}
                onViewDetails={() => onViewDetails && onViewDetails(event)}
                onAddToPlan={() => onAddToPlan && onAddToPlan(event)}
            />
        );
    };

    // Create the Mapbox popup instance if it doesn't exist
    if (!popupRef.current) {
      console.log('[useMapPopup] Creating new Mapbox popup instance');
      popupRef.current = new mapboxgl.Popup({
        closeOnClick: false, // Prevent closing when map is clicked
        closeButton: true,
        offset: 25,
        className: 'date-ai-popup-container', // Optional class for styling
      })
        // We set the DOM element immediately, before setting LngLat
        .setDOMContent(popupContentContainerRef.current!)
        .addTo(map);

        // Set the close listener ONLY ONCE when the popup is first added
        // Use closePopup, which also handles React cleanup
        popupRef.current.on('close', closePopup);

    } else {
        console.log('[useMapPopup] Reusing existing Mapbox popup instance');
        // Update the DOM content in case it was cleared
        popupRef.current.setDOMContent(popupContentContainerRef.current!);
    }

    // Always update the popup's location and render/update its content
    console.log('[useMapPopup] Setting popup LngLat and rendering content');
    popupRef.current.setLngLat(coordinates);
    renderPopupContent();

    // This effect's cleanup function handles cleanup when 'event' becomes null
    // or when the hook unmounts
    return () => {
        // Cleanup is handled by `closePopup` when the `close` event fires on the popup,
        // or when this hook's dependencies change resulting in event becoming null.
        console.log('[useMapPopup] Effect cleanup triggered (event change or unmount)');
    };

  }, [map, event, closePopup, onViewDetails, onAddToPlan]); // Include handlers as dependencies

  // Effect to remove popup when the hook unmounts
   useEffect(() => {
       return () => {
           console.log('[useMapPopup] Hook unmounting, ensuring popup is removed');
           closePopup();
       };
   }, [closePopup]);


  // A small helper component to render inside the Mapbox popup
  // This allows the content to be interactive React JSX
  const PopupContentComponent = ({
      event,
      onViewDetails,
      onAddToPlan,
  }: {
      event: Event;
      onViewDetails: () => void;
      onAddToPlan: () => void;
  }) => (
      <Card className="w-72 border-none shadow-xl rounded-xl overflow-hidden animate-fade-in bg-card text-card-foreground">
        {/* Event image as banner */}
        {event.image && (
          <div className="h-28 w-full bg-muted relative">
            <img
              src={event.image}
              alt={event.title}
              className="object-cover w-full h-full"
              loading="lazy"
              style={{ borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}
              onError={e => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
            {/* Category badge with color */}
            <div className={`
              absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold shadow-md
              ${event.category?.toLowerCase() === 'music' ? 'bg-blue-600 text-white'
                : event.category?.toLowerCase() === 'sports' ? 'bg-green-600 text-white'
                : event.category?.toLowerCase() === 'arts' || event.category?.toLowerCase() === 'theatre' ? 'bg-pink-600 text-white'
                : event.category?.toLowerCase() === 'family' ? 'bg-yellow-600 text-black' // Yellow needs dark text
                : event.category?.toLowerCase() === 'food' || event.category?.toLowerCase() === 'restaurant' ? 'bg-orange-600 text-white'
                : event.category?.toLowerCase() === 'party' ? 'bg-purple-600 text-white' // New party color
                : 'bg-gray-600 text-white'
              }
            `}>
              {event.category}
            </div>
            {/* Price badge */}
            {event.price && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-background/90 text-xs font-bold text-foreground shadow-md">
                {event.price}
              </div>
            )}
          </div>
        )}
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-base leading-tight line-clamp-2">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-sm">
          {/* Date/time */}
          {(event.date || event.time) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              <span>{formatEventDateTime(event.date, event.time)}</span>
            </div>
          )}
          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPinIcon className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
          )}
          {/* Description snippet */}
          {event.description && (
            <div className="text-xs text-muted-foreground/80 mb-2 line-clamp-3">
              {event.description.slice(0, 120)}
              {event.description.length > 120 ? '…' : ''}
            </div>
          )}
          {/* Action buttons */}
          <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="flex-1 h-8"
                onClick={onViewDetails}
              >
                View Details
              </Button>
            {/* Add to Plan button */}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 flex-shrink-0" // Add flex-shrink-0 to prevent squishing
              onClick={onAddToPlan}
              aria-label="Add to Plan"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {/* External link button if URL exists */}
            {event.url && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => window.open(event.url, '_blank')}
                aria-label="Open event website"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
  );

  // The hook itself doesn't return JSX, it manages the side effect of showing/hiding the Mapbox popup
  return { popupRef, closePopup };
};