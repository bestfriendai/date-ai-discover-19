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


  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110 focus:outline-none p-1 rounded-full flex items-center justify-center", // Added padding, rounded, flex for centering
        isSelected ? "scale-110 bg-primary/30 ring-2 ring-primary" : "scale-100 bg-background/80 backdrop-blur-sm shadow-md border border-border/50" // Added background, shadow, border for better visibility
      )}
      aria-label={`Event: ${event.title}`} // More descriptive aria-label
      title={event.title} // Add tooltip with event title
    >
      <IconComponent // Use dynamic icon component
        className={cn(
          "h-4 w-4", // Slightly smaller icon inside the button
          isSelected
            ? "text-primary"
            : "text-foreground/80" // Use foreground color for better theme compatibility
        )}
        strokeWidth={2} // Slightly thicker stroke
      />
    </button>
  );
};

export default EventMarker;
