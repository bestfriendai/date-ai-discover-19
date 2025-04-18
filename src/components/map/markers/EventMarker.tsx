// src/components/map/markers/EventMarker.tsx
import React, { memo, useMemo } from 'react';
import { MapPin, Music, Trophy, Palette, Users, Utensils, CalendarDays, PartyPopper } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Event } from '../../../types';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
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
  party: PartyPopper,
  other: CalendarDays,
  default: CalendarDays,
};

// We're now using Tailwind classes directly instead of hex colors

// Selected state styles
const SELECTED_STYLES = {
  bg: 'bg-primary ring-2 ring-primary-foreground shadow-lg shadow-primary/30',
  text: 'text-primary-foreground',
  scale: 'scale-125 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  animation: 'animate-pulse',
};

// Default state styles
const DEFAULT_STYLES = {
  text: 'text-white',
  scale: 'scale-100',
  animation: '',
};

// Note: Hover styles are applied directly in the className using Tailwind's hover: prefix

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

    // Use Tailwind classes for colors instead of dynamic bg-[${baseColor}]
    let bgColorClass = '';
    if (isSelected) {
      bgColorClass = SELECTED_STYLES.bg;
    } else {
      // Map category to Tailwind color classes
      switch(category) {
        case 'music': bgColorClass = 'bg-blue-600'; break;
        case 'sports': bgColorClass = 'bg-green-600'; break;
        case 'arts':
        case 'theatre': bgColorClass = 'bg-pink-600'; break;
        case 'family': bgColorClass = 'bg-yellow-600'; break;
        case 'food':
        case 'restaurant': bgColorClass = 'bg-orange-600'; break;
        case 'party': bgColorClass = 'bg-purple-600'; break;
        default: bgColorClass = 'bg-gray-600';
      }
    }

    const textColor = isSelected ? SELECTED_STYLES.text : DEFAULT_STYLES.text;
    const scale = isSelected ? SELECTED_STYLES.scale : DEFAULT_STYLES.scale;
    const animation = isSelected ? SELECTED_STYLES.animation : DEFAULT_STYLES.animation;
    return { IconComponent, bgColor: bgColorClass, textColor, scale, animation, category };
  }, [category, isSelected]);

  const { IconComponent, bgColor, textColor, scale, animation } = markerStyles;

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
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              'cursor-pointer transition-all duration-200 ease-in-out hover:scale-110 focus:outline-none p-1 rounded-full flex items-center justify-center border border-border/50 shadow-md backdrop-blur-sm',
              bgColor,
              scale,
              animation,
              {
                'w-6 h-6 sm:w-7 sm:h-7': true, // Slightly larger on desktop
                'z-20': isSelected,
                'z-10': !isSelected,
                'hover:shadow-lg': true,
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
  );
});

EventMarker.displayName = 'EventMarker';

export default EventMarker;
