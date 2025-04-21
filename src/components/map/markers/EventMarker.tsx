// src/components/map/markers/EventMarker.tsx
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Music, Heart, Calendar, MapPin, Star,
  Ticket, Utensils, Users, PartyPopper, Theater, Trophy
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Event } from '../../../types';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../../ui/tooltip';
import { format } from 'date-fns';

// Enhanced category icons with more specific options
const categoryIcon = {
  music: Music,
  arts: Theater,
  sports: Trophy,
  family: Heart,
  food: Utensils,
  party: PartyPopper,
  concert: Music,
  festival: Sparkles,
  conference: Users,
  exhibition: Sparkles,
  theatre: Theater,
  theater: Theater,
  default: Ticket,
};

// Enhanced category colors with gradients for better visual appeal
const categoryColor = {
  music: 'bg-gradient-to-br from-indigo-500 to-blue-600',
  arts: 'bg-gradient-to-br from-pink-500 to-rose-600',
  sports: 'bg-gradient-to-br from-emerald-500 to-green-600',
  family: 'bg-gradient-to-br from-amber-400 to-yellow-500',
  food: 'bg-gradient-to-br from-orange-400 to-orange-600',
  party: 'bg-gradient-to-br from-violet-500 to-purple-600',
  concert: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  festival: 'bg-gradient-to-br from-fuchsia-500 to-purple-600',
  conference: 'bg-gradient-to-br from-sky-500 to-blue-600',
  exhibition: 'bg-gradient-to-br from-rose-500 to-pink-600',
  theatre: 'bg-gradient-to-br from-pink-500 to-rose-600',
  theater: 'bg-gradient-to-br from-pink-500 to-rose-600',
  default: 'bg-gradient-to-br from-slate-500 to-gray-600',
};

// Helper function to format date and time
const formatDateTime = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return '';

  try {
    // Check if dateStr is in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      // Format the date in a more readable format
      return format(date, 'EEE, MMM d') + (timeStr ? ` at ${timeStr}` : '');
    }

    // If not ISO format, return as is with time if available
    return dateStr + (timeStr ? ` at ${timeStr}` : '');
  } catch (e) {
    return dateStr + (timeStr ? ` at ${timeStr}` : '');
  }
};

interface EventMarkerProps {
  event: Event;
  isSelected?: boolean;
  onClick?: (event: Event) => void;
}

const EventMarker = memo(({ event, isSelected = false, onClick }: EventMarkerProps) => {
  const title = event.title || 'Unknown Event';
  const category = (event.category || 'default').toLowerCase();
  const formattedDate = formatDateTime(event.date, event.time);

  // Enhanced tooltip with more event details
  const tooltipContent = useMemo(() => (
    <div className="max-w-[250px]">
      <div className="font-semibold text-sm">{title}</div>

      {formattedDate && (
        <div className="text-xs flex items-center mt-1 text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1 inline" />
          {formattedDate}
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

      {category && (
        <div className="mt-1 flex items-center">
          <div className="text-xs px-1.5 py-0.5 rounded-full font-medium"
               style={{
                 background: `linear-gradient(to right, var(--${getCategoryColor(category)}), var(--${getCategoryColor(category)}-foreground))`,
                 color: 'white',
                 opacity: 0.9
               }}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </div>
        </div>
      )}
    </div>
  ), [title, formattedDate, event.venue, event.price, category]);

  const handleClick = () => {
    if (onClick) {
      onClick(event);
    }
  };

  // Helper function to get CSS variable names for category colors
  function getCategoryColor(cat: string): string {
    switch(cat) {
      case 'music': return 'color-indigo';
      case 'arts': return 'color-pink';
      case 'sports': return 'color-emerald';
      case 'family': return 'color-amber';
      case 'food': return 'color-orange';
      case 'party': return 'color-violet';
      default: return 'color-slate';
    }
  }

  return (
    <Tooltip delayDuration={isSelected ? 0 : 200}>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          onClick={handleClick}
          className={cn(
            'cursor-pointer transition-all duration-300 ease-out focus:outline-none rounded-full flex items-center justify-center',
            'border shadow-lg backdrop-blur-sm',
            categoryColor[category] || categoryColor.default,
            isSelected ?
              'scale-125 border-white z-30 shadow-lg' :
              'border-white/30 hover:scale-110 hover:border-white/70 z-10 shadow-md',
            'w-8 h-8 sm:w-9 sm:h-9'
          )}
          aria-label={`Event: ${event.title}`}
          animate={isSelected ? {
            scale: 1.25,
            boxShadow: '0 0 15px 2px rgba(255,255,255,0.3)'
          } : {
            scale: 1,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
          whileHover={{
            scale: isSelected ? 1.25 : 1.15,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          whileTap={{ scale: 0.95 }}
        >
          {(() => {
            const Icon = categoryIcon[category] || categoryIcon.default;
            return <Icon className="h-4 w-4 text-white drop-shadow-md" strokeWidth={2.5} />;
          })()}

          {/* Pulse animation for selected markers */}
          {isSelected && (
            <>
              <motion.span
                className="absolute rounded-full bg-white/30"
                initial={{ opacity: 0.7, scale: 1, width: '100%', height: '100%' }}
                animate={{ opacity: 0, scale: 1.8 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.span
                className="absolute rounded-full bg-white/20"
                initial={{ opacity: 0.7, scale: 1, width: '100%', height: '100%' }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </>
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="p-3 rounded-xl shadow-xl border border-border/50">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
});

EventMarker.displayName = 'EventMarker';

export default EventMarker;
