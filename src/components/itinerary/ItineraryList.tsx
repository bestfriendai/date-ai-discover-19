
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Itinerary } from '@/types';

interface ItineraryListProps {
  itineraries: Itinerary[];
}

const ItineraryList = ({ itineraries }: ItineraryListProps) => {
  if (itineraries.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {itineraries.map(itinerary => (
        <Link
          key={itinerary.id}
          to={`/plan/${itinerary.id}`}
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          <h3 className="font-semibold mb-1">{itinerary.name}</h3>
          {itinerary.description && (
            <p className="text-sm text-muted-foreground mb-3">{itinerary.description}</p>
          )}
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              {formatDate(itinerary.date)}
            </div>
            <div className="text-sm text-muted-foreground">
              {itinerary.items.length} {itinerary.items.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ItineraryList;
