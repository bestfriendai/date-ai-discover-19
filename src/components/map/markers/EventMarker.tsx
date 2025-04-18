import React, { memo, useMemo } from 'react';
import { MapPin, Music, Trophy, Palette, Users, Utensils, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClusterFeature } from '../clustering/useSupercluster';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

// Pre-define category icons for better performance
const CATEGORY_ICONS = {
  music: Music,
  sports: Trophy,
  arts: Palette,
  theatre: Palette,
  family: Users,
  food: Utensils,
  restaurant: Utensils,
  default: CalendarDays,
};

// Pre-define category colors for better performance
const CATEGORY_COLORS = {
  music: 'bg-blue-500/80',
  sports: 'bg-green-500/80',
  arts: 'bg-pink-500/80',
  theatre: 'bg-pink-500/80',
  family: 'bg-yellow-400/80',
  food: 'bg-orange-500/80',
  restaurant: 'bg-orange-500/80',
  default: 'bg-gray-700/80',
};

// Selected state styles
const SELECTED_STYLES = {
  bg: 'bg-primary/40 ring-2 ring-primary shadow-lg shadow-primary/30',
  text: 'text-primary',
  scale: 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
};

// Default state styles
const DEFAULT_STYLES = {
  text: 'text-white',
  scale: 'scale-100',
};

interface EventMarkerProps {
  event: ClusterFeature;
  isSelected?: boolean;
  onClick?: () => void;
}

const EventMarker = memo(({ event, isSelected = false, onClick }: EventMarkerProps) => {
  // Determine if this is a cluster or an event
  const isCluster = !!event.properties.cluster;
  const count = event.properties.point_count;
  const title = event.properties.title || 'Cluster';

  // Use memoized values for better performance
  const markerStyles = useMemo(() => {
    const category = (event.properties.category || 'default').toLowerCase();
    const IconComponent = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
    const bgColor = isSelected ? SELECTED_STYLES.bg : CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
    const textColor = isSelected ? SELECTED_STYLES.text : DEFAULT_STYLES.text;
    const scale = isSelected ? SELECTED_STYLES.scale : DEFAULT_STYLES.scale;
    return { IconComponent, bgColor, textColor, scale, category };
  }, [event.properties.category, isSelected]);

  const { IconComponent, bgColor, textColor, scale, category } = markerStyles;

  // Tooltip content for clusters and events
  const tooltipContent = isCluster ? (
    <div>
      <div className="font-semibold">Cluster of {count} events</div>
      <div className="text-xs text-muted-foreground">Click to zoom in and expand</div>
    </div>
  ) : (
    <div>
      <div className="font-semibold">{title}</div>
      {event.properties.category && (
        <div className="text-xs text-muted-foreground capitalize">{event.properties.category}</div>
      )}
      {event.properties.date && (
        <div className="text-xs">{event.properties.date}</div>
      )}
      {event.properties.venue && (
        <div className="text-xs">{event.properties.venue}</div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110 focus:outline-none p-1 rounded-full flex items-center justify-center border border-border/50 shadow-md backdrop-blur-sm',
              bgColor,
              scale
            )}
            aria-label={isCluster ? `Cluster of ${count} events` : `Event: ${title}`}
            style={isSelected ? { zIndex: 10 } : {}}
          >
            {isCluster ? (
              <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{count}</span>
            ) : (
              <IconComponent className={cn('h-4 w-4', textColor)} strokeWidth={2} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default EventMarker;
