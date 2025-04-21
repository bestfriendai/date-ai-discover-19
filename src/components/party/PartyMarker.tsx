import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Marker } from 'react-map-gl';
import { Event } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import PartySubcategoryBadge from './PartySubcategoryBadge';

interface PartyMarkerProps {
  event: Event;
  isSelected: boolean;
  onClick: () => void;
}

export const PartyMarker: React.FC<PartyMarkerProps> = ({
  event,
  isSelected,
  onClick
}) => {
  // Format date for display
  const formattedDate = useMemo(() => {
    if (!event.date) return '';
    try {
      const date = new Date(event.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return event.date;
    }
  }, [event.date]);

  // Get marker color based on party subcategory
  const getMarkerColor = (subcategory?: string) => {
    switch(subcategory) {
      case 'day-party': return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      case 'brunch': return 'bg-gradient-to-r from-orange-400 to-pink-500';
      case 'club': return 'bg-gradient-to-r from-purple-600 to-indigo-600';
      case 'networking': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'celebration': return 'bg-gradient-to-r from-pink-500 to-rose-500';
      case 'social': return 'bg-gradient-to-r from-teal-500 to-emerald-500';
      default: return 'bg-gradient-to-r from-violet-500 to-purple-500';
    }
  };

  // Get marker icon based on party subcategory
  const getMarkerIcon = (subcategory?: string) => {
    switch(subcategory) {
      case 'day-party': return '☀️';
      case 'brunch': return '🍳';
      case 'club': return '🎧';
      case 'networking': return '🤝';
      case 'celebration': return '🎉';
      case 'social': return '👥';
      default: return '🎊';
    }
  };

  // Enhanced tooltip with more event details
  const tooltipContent = useMemo(() => (
    <div className="max-w-[250px]">
      <div className="font-semibold text-sm">{event.title}</div>

      {formattedDate && (
        <div className="text-xs flex items-center mt-1 text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1 inline" />
          {formattedDate} {event.time && `• ${event.time}`}
        </div>
      )}

      {event.venue && (
        <div className="text-xs flex items-center mt-1 text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1 inline" />
          {event.venue}
        </div>
      )}

      {event.price && (
        <div className="text-xs flex items-center mt-1 text-muted-foreground">
          <Ticket className="h-3 w-3 mr-1 inline" />
          {event.price}
        </div>
      )}

      {/* Party subcategory badge */}
      <div className="mt-2">
        {event.partySubcategory && (
          <PartySubcategoryBadge subcategory={event.partySubcategory} size="sm" />
        )}
      </div>
    </div>
  ), [event, formattedDate]);

  // Only render if we have coordinates
  if (!event.coordinates || !Array.isArray(event.coordinates) || event.coordinates.length !== 2) {
    return null;
  }

  const [longitude, latitude] = event.coordinates;

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
    >
      <TooltipProvider delayDuration={isSelected ? 0 : 200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              type="button"
              onClick={onClick}
              className={cn(
                'cursor-pointer transition-all duration-300 ease-out focus:outline-none rounded-full flex items-center justify-center',
                'border shadow-lg backdrop-blur-sm',
                getMarkerColor(event.partySubcategory),
                isSelected ?
                  'scale-125 border-white z-30 shadow-lg' :
                  'border-white/30 hover:scale-110 hover:border-white/70 z-10 shadow-md',
                'w-10 h-10 sm:w-11 sm:h-11'
              )}
              aria-label={`Party Event: ${event.title}`}
              animate={isSelected ? {
                scale: 1.25,
                boxShadow: '0 0 15px 2px rgba(255,255,255,0.3)'
              } : {
                scale: 1,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              <span className="text-lg">{getMarkerIcon(event.partySubcategory)}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="z-50">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Marker>
  );
};

export default PartyMarker;
