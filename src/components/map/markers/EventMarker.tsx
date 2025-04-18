// src/components/map/markers/EventMarker.tsx
import React, { memo, useMemo } from 'react';
import { MapPin, Music, Trophy, Palette, Users, Utensils, CalendarDays } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Event } from '../../../types';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../../ui/tooltip';

// Pre-define category icons for better performance
const CATEGORY_ICONS = {
  music: Music,
  sports: Trophy,
  arts: Palette,
  theatre: Palette,
  family: Users,
  food: Utensils,
  restaurant: Utensils,
  other: CalendarDays,
  default: CalendarDays,
};

// Pre-define category colors for better performance (using hex for Mapbox)
const CATEGORY_COLORS: { [key: string]: string } = {
  music: '#3b82f6', // blue-500
  sports: '#22c55e', // green-500
  arts: '#ec4899', // pink-500
  theatre: '#ec4899', // pink-500
  family: '#facc15', // yellow-400
  food: '#f97316', // orange-500
  restaurant: '#f97316', // orange-500
  other: '#6b7280', // gray-500
  default: '#3b82f6', // blue-500
};

// Selected state styles
const SELECTED_STYLES = {
  bg: 'bg-primary ring-2 ring-primary-foreground shadow-lg shadow-primary/30',
  text: 'text-primary-foreground',
  scale: 'scale-125 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
};

// Default state styles
const DEFAULT_STYLES = {
  text: 'text-white',
  scale: 'scale-100',
};

interface EventMarkerProps {
  event: Event;
  isSelected?: boolean;
  onClick?: (event: Event) => void;
}

const EventMarker = memo(({ event, isSelected = false, onClick }: EventMarkerProps) => {
  const title = event.title || 'Unknown Event';
  const category = (event.category || 'default').toLowerCase();

  const markerStyles = useMemo(() => {
    const IconComponent = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
    const baseColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
    const bgColor = isSelected ? SELECTED_STYLES.bg : `bg-[${baseColor}]`;
    const textColor = isSelected ? SELECTED_STYLES.text : DEFAULT_STYLES.text;
    const scale = isSelected ? SELECTED_STYLES.scale : DEFAULT_STYLES.scale;
    return { IconComponent, bgColor, textColor, scale, category };
  }, [category, isSelected]);

  const { IconComponent, bgColor, textColor, scale } = markerStyles;

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              'cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110 focus:outline-none p-1 rounded-full flex items-center justify-center border border-border/50 shadow-md backdrop-blur-sm',
              bgColor,
              scale,
              {
                'w-6 h-6': true,
                'z-20': isSelected,
                'z-0': !isSelected,
              }
            )}
            aria-label={`Event: ${title}`}
          >
            <IconComponent className={cn('h-4 w-4', textColor)} strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

EventMarker.displayName = 'EventMarker';

export default EventMarker;
