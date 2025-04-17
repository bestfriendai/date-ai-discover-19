import React, { memo, useMemo } from 'react';
import { MapPin, Music, Trophy, Palette, Users, Utensils, CalendarDays } from 'lucide-react'; // Import icons
import { cn } from '@/lib/utils';
import type { ClusterFeature } from '../clustering/useSupercluster'; // Import ClusterFeature type

// Pre-define category icons for better performance
const CATEGORY_ICONS = {
  music: Music,
  sports: Trophy,
  arts: Palette,
  theatre: Palette,
  family: Users,
  food: Utensils,
  restaurant: Utensils,
  default: CalendarDays
};

// Pre-define category colors for better performance
const CATEGORY_COLORS = {
  music: "bg-blue-500/80",
  sports: "bg-green-500/80",
  arts: "bg-pink-500/80",
  theatre: "bg-pink-500/80",
  family: "bg-yellow-400/80",
  food: "bg-orange-500/80",
  restaurant: "bg-orange-500/80",
  default: "bg-gray-700/80"
};

// Selected state styles
const SELECTED_STYLES = {
  bg: "bg-primary/40 ring-2 ring-primary shadow-lg shadow-primary/30",
  text: "text-primary",
  scale: "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
};

// Default state styles
const DEFAULT_STYLES = {
  text: "text-white",
  scale: "scale-100"
};

interface EventMarkerProps {
  event: ClusterFeature; // Accept ClusterFeature instead of Event
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
    // Get category (lowercase and fallback to default)
    const category = (event.properties.category || 'default').toLowerCase();

    // Get icon component
    const IconComponent = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

    // Get background color
    const bgColor = isSelected ? SELECTED_STYLES.bg : (CATEGORY_COLORS[category] || CATEGORY_COLORS.default);

    // Get text color
    const textColor = isSelected ? SELECTED_STYLES.text : DEFAULT_STYLES.text;

    // Get scale
    const scale = isSelected ? SELECTED_STYLES.scale : DEFAULT_STYLES.scale;

    return { IconComponent, bgColor, textColor, scale };
  }, [event.properties.category, isSelected]);

  // Destructure the memoized styles
  const { IconComponent, bgColor, textColor, scale } = markerStyles;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110 focus:outline-none p-1 rounded-full flex items-center justify-center border border-border/50 shadow-md backdrop-blur-sm",
        bgColor,
        scale
      )}
      aria-label={`Event: ${title}`}
      title={title}
      style={isSelected ? { zIndex: 10 } : {}}
    >
      {isCluster ? (
        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{count}</span>
      ) : (
        <IconComponent
          className={cn(
            "h-4 w-4",
            textColor
          )}
          strokeWidth={2}
        />
      )}
    </button>
  );
});

export default EventMarker;
