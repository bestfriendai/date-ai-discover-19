
import React, { useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin as MapPinIcon, Heart, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapPopupProps {
  map: mapboxgl.Map;
  event: Event;
  onClose: () => void;
  onViewDetails?: (event: Event) => void;
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!event?.coordinates) return;

    // --- Create Popup Content with React ---
    const PopupContent = () => (
      <Card className="w-72 border-none shadow-xl rounded-xl overflow-hidden animate-fade-in">
        {/* Event image as banner */}
        {event.image && (
          <div className="h-28 w-full bg-gray-200 relative">
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
              absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold shadow
              ${event.category?.toLowerCase() === 'music' ? 'bg-blue-500/90 text-white'
                : event.category?.toLowerCase() === 'sports' ? 'bg-green-500/90 text-white'
                : event.category?.toLowerCase() === 'arts' || event.category?.toLowerCase() === 'theatre' ? 'bg-pink-500/90 text-white'
                : event.category?.toLowerCase() === 'family' ? 'bg-yellow-400/90 text-gray-900'
                : event.category?.toLowerCase() === 'food' || event.category?.toLowerCase() === 'restaurant' ? 'bg-orange-500/90 text-white'
                : 'bg-gray-700/90 text-white'
              }
            `}>
              {event.category}
            </div>
            {/* Price badge */}
            {event.price && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-white/90 text-xs font-bold text-gray-800 shadow">
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
            <div className="text-xs text-[hsl(var(--sidebar-foreground))]/80 mb-2 line-clamp-3">
              {event.description.slice(0, 120)}
              {event.description.length > 120 ? '…' : ''}
            </div>
          )}
          {/* Action buttons */}
          <div className="flex gap-2 mt-2">
            {onViewDetails && (
              <Button
                size="sm"
                className="flex-1 h-8"
                id={`popup-details-btn-${event.id}`}
                variant="default"
              >
                View Details
              </Button>
            )}
            {/* Add to Plan button */}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              aria-label="Add to Plan"
              id={`popup-add-plan-btn-${event.id}`}
              tabIndex={0}
            >
              <Plus className="h-4 w-4" />
            </Button>
            {/* Favorite button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Favorite"
              id={`popup-favorite-btn-${event.id}`}
              tabIndex={0}
            >
              <Heart className="h-4 w-4" />
            </Button>
            {/* External link button if URL exists */}
            {event.url && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Open event website"
                id={`popup-external-btn-${event.id}`}
                tabIndex={0}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
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
      // If popup exists, update its location
      popupRef.current.setLngLat([event.coordinates[0], event.coordinates[1]]);

      // Use setHTML instead of setDOMContent for TypeScript compatibility
      popupRef.current.setHTML(popupHtml);
    } else {
      // Create new popup
      popupRef.current = new mapboxgl.Popup({
        closeOnClick: false,
        offset: 25,
        className: 'date-ai-popup',
      })
        .setLngLat([event.coordinates[0], event.coordinates[1]])
        .setHTML(popupHtml)
        .addTo(map);

      // Add close listener only once
      popupRef.current.on('close', onClose);
    }

    // --- Add Event Listeners for the Buttons ---
    // We need to re-attach the listeners every time content updates

    // View Details button
    const detailsButton = document.getElementById(`popup-details-btn-${event.id}`);
    if (detailsButton && onViewDetails) {
        const detailsClickHandler = () => {
            onViewDetails(event);
            popupRef.current?.remove();
        };
        // Remove previous listener if any before adding new one
        detailsButton.removeEventListener('click', detailsClickHandler);
        detailsButton.addEventListener('click', detailsClickHandler);
    }

    // Add to Plan button
    const addPlanButton = document.getElementById(`popup-add-plan-btn-${event.id}`);
    if (addPlanButton) {
        const addPlanClickHandler = () => {
            console.log('Add to plan clicked:', event.id);
            // TODO: Implement add to plan functionality
            // This would open the AddToPlanModal or similar
        };
        addPlanButton.removeEventListener('click', addPlanClickHandler);
        addPlanButton.addEventListener('click', addPlanClickHandler);
    }

    // Favorite button
    const favoriteButton = document.getElementById(`popup-favorite-btn-${event.id}`);
    if (favoriteButton) {
        const favoriteClickHandler = () => {
            console.log('Favorite clicked:', event.id);
            // TODO: Implement favorite functionality
        };
        favoriteButton.removeEventListener('click', favoriteClickHandler);
        favoriteButton.addEventListener('click', favoriteClickHandler);
    }

    // External link button
    const externalButton = document.getElementById(`popup-external-btn-${event.id}`);
    if (externalButton && event.url) {
        const externalClickHandler = () => {
            window.open(event.url, '_blank');
        };
        externalButton.removeEventListener('click', externalClickHandler);
        externalButton.addEventListener('click', externalClickHandler);
    }

    // --- Cleanup ---
    return () => {
      // Don't remove the popup here if it's just updating
      // It will be removed when the component unmounts or onClose is called
    };

  }, [map, event, onClose, onViewDetails]);

  // Effect to remove popup when component unmounts or event becomes null
  useEffect(() => {
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, []);

  return null; // Component manages the popup directly
};
