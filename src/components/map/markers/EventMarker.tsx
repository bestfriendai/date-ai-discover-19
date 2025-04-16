import React from 'react';
import { MapPin, Music, Trophy, Palette, Users, Utensils, CalendarDays } from 'lucide-react'; // Import icons
import { cn } from '@/lib/utils';
import type { Event } from '@/types'; // Import Event type

interface EventMarkerProps {
  event: Event; // Add event prop
  isSelected?: boolean;
  onClick?: () => void;
}

const EventMarker = ({ event, isSelected = false, onClick }: EventMarkerProps) => {

  // Function to get icon based on category
  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'music':
        return Music;
      case 'sports':
        return Trophy;
      case 'arts':
      case 'theatre': // Combine arts & theatre
        return Palette;
      case 'family':
        return Users;
      case 'food':
      case 'restaurant': // Combine food & restaurant
        return Utensils;
      default:
        return CalendarDays; // Default icon for other/uncategorized events
    }
  };

  const IconComponent = getCategoryIcon(event.category);

  // Category-based background color
  const getCategoryBg = (category: string, isSelected: boolean) => {
    if (isSelected) return "bg-primary/40 ring-2 ring-primary shadow-lg shadow-primary/30";
    switch (category?.toLowerCase()) {
      case 'music':
        return "bg-blue-500/80";
      case 'sports':
        return "bg-green-500/80";
      case 'arts':
      case 'theatre':
        return "bg-pink-500/80";
      case 'family':
        return "bg-yellow-400/80";
      case 'food':
      case 'restaurant':
        return "bg-orange-500/80";
      default:
        return "bg-gray-700/80";
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110 focus:outline-none p-1 rounded-full flex items-center justify-center border border-border/50 shadow-md backdrop-blur-sm",
        getCategoryBg(event.category, isSelected),
        isSelected ? "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "scale-100"
      )}
      aria-label={`Event: ${event.title}`}
      title={event.title}
      style={isSelected ? { zIndex: 10 } : {}}
    >
      <IconComponent
        className={cn(
          "h-4 w-4",
          isSelected
            ? "text-primary"
            : "text-white"
        )}
        strokeWidth={2}
      />
    </button>
  );
};

export default EventMarker;
