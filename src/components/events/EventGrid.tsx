
import { AnimatedCard } from '../animations/AnimatedCard';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, StarIcon } from '@/lib/icons';
import type { Event } from '@/types';

interface EventGridProps {
  events: Event[];
}

const EventGrid = ({ events }: EventGridProps) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No events found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event, index) => (
        <AnimatedCard key={event.id} delay={index * 0.1}>
          <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
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
          </div>
        </AnimatedCard>
      ))}
    </div>
  );
};

export default EventGrid;
