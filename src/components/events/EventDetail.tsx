
import { Button } from '@/components/ui/button';

interface EventDetailProps {
  event: {
    id: string;
    title: string;
    description?: string;
    date: string;
    time: string;
    location: string;
    category: string;
    image: string;
  };
  onClose: () => void;
}

const EventDetail = ({ event, onClose }: EventDetailProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-xl font-bold">Event Details</h2>
        <button onClick={onClose} className="p-2 rounded-md hover:bg-muted">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="h-48 bg-muted">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Set fallback image if the original fails to load
              (e.target as HTMLImageElement).onerror = null; // Prevent infinite loop if fallback also fails
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
        
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="text-sm px-3 py-1 bg-muted rounded-full">{event.category}</div>
            
            <button className="ml-auto text-primary hover:text-primary/70">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
          </div>
          
          <div className="border border-border rounded-md p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date</p>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  <p>{event.date}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time</p>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <p>{event.time}</p>
                </div>
              </div>
              
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <p>{event.location}</p>
                </div>
              </div>
            </div>
          </div>
          
          {event.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          )}
          
          <div className="flex gap-4">
            <Button className="flex-1">Buy Tickets</Button>
            <Button variant="outline" className="flex-1">Add to Plan</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
