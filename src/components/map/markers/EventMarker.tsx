
import type { Event } from '@/types';
import { cn } from '@/lib/utils';

interface EventMarkerProps {
  event: Event;
  selected?: boolean;
}

export const EventMarker = ({ event, selected }: EventMarkerProps) => {
  return (
    <div className="relative cursor-pointer group">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shadow-lg transform-gpu transition-transform group-hover:scale-110",
        selected ? "bg-secondary" : "bg-primary"
      )}>
        <div className="w-4 h-4 bg-background rounded-full" />
      </div>
      <div className={cn(
        "w-2 h-2 absolute -bottom-1 left-1/2 transform -translate-x-1/2 rotate-45",
        selected ? "bg-secondary" : "bg-primary"
      )} />
    </div>
  );
};
