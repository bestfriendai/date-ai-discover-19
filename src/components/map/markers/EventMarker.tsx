import React from 'react';
import { MapPin } from 'lucide-react'; // Assuming lucide-react is installed
import { cn } from '@/lib/utils';

interface EventMarkerProps {
  isSelected?: boolean;
  onClick?: () => void;
}

const EventMarker = ({ isSelected = false, onClick }: EventMarkerProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110 focus:outline-none",
        isSelected ? "scale-110" : "scale-100"
      )}
      aria-label="Event Location"
    >
      <MapPin
        className={cn(
          "h-6 w-6 drop-shadow-md",
          isSelected
            ? "text-primary fill-primary/80"
            : "text-red-600 fill-red-600/30" // Default event color
        )}
        strokeWidth={1.5}
      />
    </button>
  );
};

export default EventMarker;
