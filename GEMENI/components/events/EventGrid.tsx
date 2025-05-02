
import { Event } from '@/types';
import ListEventCard from './ListEventCard';
import GridEventCard from './GridEventCard';

interface EventGridProps {
  events: Event[];
  viewMode?: 'grid' | 'list';
  onEventSelect?: (event: Event) => void;
  selectedEvent?: Event | null;
}

const EventGrid = ({ events, viewMode = 'grid', onEventSelect, selectedEvent }: EventGridProps) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No events found</p>
      </div>
    );
  }

  const gridClassName = viewMode === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'space-y-4';

  const CardComponent = viewMode === 'grid' ? GridEventCard : ListEventCard;

  return (
    <div className={gridClassName}>
      {events.map((event) => (
        <CardComponent
          key={event.id}
          event={event}
          onClick={onEventSelect}
          isSelected={selectedEvent?.id === event.id}
        />
      ))}
    </div>
  );
};

export default EventGrid;
