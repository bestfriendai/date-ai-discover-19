
import type { Event } from '@/types';

interface EventMarkerProps {
  event: Event;
}

export const EventMarker = ({ event }: EventMarkerProps) => {
  return (
    <div className="relative cursor-pointer group">
      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg transform-gpu transition-transform group-hover:scale-110">
        <div className="w-4 h-4 bg-background rounded-full" />
      </div>
      <div className="w-2 h-2 bg-primary absolute -bottom-1 left-1/2 transform -translate-x-1/2 rotate-45" />
    </div>
  );
};
