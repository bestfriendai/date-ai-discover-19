// src/components/map/markers/EventMarker.tsx
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Music, Heart, Calendar, MapPin, Star } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Event } from '../../../types';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../../ui/tooltip';

// Helper to get icon and color by category
const categoryIcon = {
  music: Music,
  arts: Sparkles,
  sports: Star,
  family: Heart,
  food: Calendar,
  party: MapPin,
  default: MapPin,
};
const categoryColor = {
  music: 'bg-blue-500',
  arts: 'bg-pink-500',
  sports: 'bg-green-500',
  family: 'bg-yellow-400',
  food: 'bg-orange-500',
  party: 'bg-purple-500',
  default: 'bg-gray-500',
};

interface EventMarkerProps {
  event: Event;
  isSelected?: boolean;
  onClick?: (event: Event) => void;
}

const EventMarker = memo(({ event, isSelected = false, onClick }: EventMarkerProps) => {
  const title = event.title || 'Unknown Event';
  const category = (event.category || 'default').toLowerCase();

  const tooltipContent = useMemo(() => (
    <div>
      <div className="font-semibold">{title}</div>
      {event.date && (
        <div className="text-xs">{event.date}</div>
      )}
      {event.venue && (
        <div className="text-xs">{event.venue}</div>
      )}
    </div>
  ), [title, event.date, event.venue]);

  const handleClick = () => {
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          onClick={handleClick}
          className={cn(
            'cursor-pointer transition-all duration-200 ease-in-out focus:outline-none p-1 rounded-full flex items-center justify-center border border-border/50 shadow-md backdrop-blur-sm',
            categoryColor[category] || categoryColor.default,
            isSelected ? 'scale-125 ring-4 ring-primary z-30' : 'hover:scale-110 z-10',
            'w-7 h-7 sm:w-8 sm:h-8'
          )}
          aria-label={`Event: ${event.title}`}
          animate={isSelected ? { scale: 1.25 } : { scale: 1 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
        >
          {(() => {
            const Icon = categoryIcon[category] || categoryIcon.default;
            return <Icon className="h-5 w-5 text-white drop-shadow" strokeWidth={2.5} />;
          })()}
          {isSelected && (
            <motion.span
              className="absolute animate-ping bg-primary/20 rounded-full w-10 h-10 -z-10"
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.7 }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
});

EventMarker.displayName = 'EventMarker';

export default EventMarker;
