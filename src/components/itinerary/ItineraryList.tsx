
import { Button } from '@/components/ui/button';

interface Itinerary {
  id: string;
  name: string;
  description: string;
  date: string;
  numEvents: number;
}

interface ItineraryListProps {
  itineraries: Itinerary[];
}

const ItineraryList = ({ itineraries }: ItineraryListProps) => {
  if (itineraries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Itineraries</h2>
        <Button size="sm" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          New Itinerary
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {itineraries.map(itinerary => (
          <div key={itinerary.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <h3 className="font-semibold mb-1">{itinerary.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{itinerary.description}</p>
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                {itinerary.date}
              </div>
              <div className="text-sm text-muted-foreground">
                {itinerary.numEvents} events
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryList;
