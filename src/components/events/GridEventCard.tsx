
import { CalendarDaysIcon, ClockIcon, MapPinIcon, StarIcon } from '@/lib/icons';
import { AnimatedCard } from '../animations/AnimatedCard';
import { EventCardProps } from './types';

const GridEventCard = ({ event, onClick, isSelected }: EventCardProps) => {
  return (
    <AnimatedCard>
      <button
        onClick={() => onClick?.(event)}
        className={`w-full text-left transition-colors ${
          isSelected ? 'bg-accent' : 'bg-card hover:bg-accent/50'
        } border border-border rounded-lg overflow-hidden`}
      >
        <div className="h-40 overflow-hidden bg-muted">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        </div>
        <div className="p-4">
          <h3 className="font-medium mb-2 line-clamp-2">{event.title}</h3>
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <CalendarDaysIcon className="w-4 h-4 mr-1" />
            {event.date} • <ClockIcon className="w-4 h-4 mx-1" />
            {event.time}
          </div>
          <div className="flex items-center">
            <div className="text-xs bg-muted rounded px-2 py-1 mr-2 flex items-center gap-1">
              {event.category}
              {typeof event.rank === 'number' && (
                <span className="flex items-center text-yellow-500">
                  <StarIcon className="w-3 h-3 fill-current" />
                  {Math.round(event.rank)}
                </span>
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <MapPinIcon className="w-3 h-3 mr-1" />
              <span className="truncate max-w-[150px]">{event.location}</span>
            </div>
          </div>
        </div>
      </button>
    </AnimatedCard>
  );
};

export default GridEventCard;
