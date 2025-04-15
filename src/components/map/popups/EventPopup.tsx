
import type { Event } from '@/types';
import { Button } from '@/components/ui/button';

interface EventPopupProps {
  event: Event;
  onViewDetails?: () => void;
}

export const EventPopup = ({ event, onViewDetails }: EventPopupProps) => {
  return (
    <div className="p-2 max-w-[200px]">
      <h3 className="font-semibold text-sm mb-1">{event.title}</h3>
      <div className="text-xs text-muted-foreground mb-2">
        Category: {event.category}
      </div>
      {onViewDetails && (
        <Button 
          variant="default" 
          size="sm" 
          onClick={onViewDetails}
          className="w-full"
        >
          View Details
        </Button>
      )}
    </div>
  );
};
