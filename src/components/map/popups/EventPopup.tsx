import type { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Heart } from 'lucide-react';

interface EventPopupProps {
  event: Event;
  onViewDetails?: () => void;
  onAddToPlan?: () => void;
}

export const EventPopup = ({ event, onViewDetails, onAddToPlan }: EventPopupProps) => {
  return (
    <div className="p-2 max-w-[260px] min-w-[180px] text-foreground">
      {event.image && (
        <div className="mb-2 rounded-lg overflow-hidden bg-muted-foreground/10 h-24 flex items-center justify-center">
          <img src={event.image} alt={event.title} className="object-cover w-full h-full" style={{ minHeight: 64 }} />
        </div>
      )}
      <h3 className="font-semibold text-base mb-1 truncate" title={event.title}>{event.title}</h3>
      <div className="flex items-center text-xs text-muted-foreground mb-1 gap-2">
        <Calendar className="w-4 h-4 mr-1" />
        {event.time || event.date || 'Time TBD'}
      </div>
      <div className="flex items-center text-xs text-muted-foreground mb-2 gap-2">
        <MapPin className="w-4 h-4 mr-1" />
        {event.venue || event.location || 'Location TBD'}
      </div>
      <div className="text-xs mb-2">
        <span className="font-medium">Category:</span> {event.category}
      </div>
      {event.description && (
        <div className="text-xs text-muted-foreground mb-2 line-clamp-3">{event.description}</div>
      )}
      <div className="flex gap-2">
        {onAddToPlan && (
          <button
            className="flex-1 bg-primary text-primary-foreground rounded px-2 py-1 text-xs font-semibold hover:bg-primary/90 transition"
            onClick={onAddToPlan}
          >
            <Heart className="w-4 h-4 inline mr-1" /> Add to Plan
          </button>
        )}
        {onViewDetails && (
          <button
            className="flex-1 bg-muted text-foreground rounded px-2 py-1 text-xs font-semibold hover:bg-muted/80 border border-border"
            onClick={onViewDetails}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};
