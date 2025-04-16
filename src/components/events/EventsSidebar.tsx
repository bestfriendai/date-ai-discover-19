
import { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import type { Event } from '@/types'; // Import Event type

// Mock data - this would come from an API in a real app
const mockEvents = [
  {
    id: '1',
    title: 'Hamilton',
    date: 'Sat, May 17',
    time: '07:00 PM',
    location: 'Richard Rodgers Theatre-NY',
    category: 'arts & theatre',
    image: '/lovable-uploads/hamilton.jpg'
  },
  {
    id: '2',
    title: 'Harry Potter and the Cursed Child',
    date: 'Mon, May 19',
    time: '07:00 PM',
    location: 'Lyric Theatre - NY',
    category: 'arts & theatre',
    image: '/lovable-uploads/harry-potter.jpg'
  },
  {
    id: '3',
    title: 'Hamilton',
    date: 'Mon, May 19',
    time: '07:00 PM',
    location: 'Richard Rodgers Theatre-NY',
    category: 'arts & theatre',
    image: '/lovable-uploads/hamilton.jpg'
  },
  {
    id: '4',
    title: 'Harry Potter and the Cursed Child',
    date: 'Tue, May 20',
    time: '07:00 PM',
    location: 'Lyric Theatre - NY',
    category: 'arts & theatre',
    image: '/lovable-uploads/harry-potter.jpg'
  },
  {
    id: '5',
    title: 'Hamilton',
    date: 'Tue, May 20',
    time: '07:00 PM',
    location: 'Richard Rodgers Theatre-NY',
    category: 'arts & theatre',
    image: '/lovable-uploads/hamilton.jpg'
  },
  {
    id: '6',
    title: 'Harry Potter and the Cursed Child',
    date: 'Wed, May 21',
    time: '07:00 PM',
    location: 'Lyric Theatre - NY',
    category: 'arts & theatre',
    image: '/lovable-uploads/harry-potter.jpg'
  }
];

interface EventsSidebarProps {
  onClose: () => void;
  onEventSelect?: (event: Event) => void; // Use Event type
  isLoading?: boolean; // Add isLoading prop
  events: Event[]; // Add events prop (will replace mock data later)
}

const EventsSidebar = ({ onClose, onEventSelect, isLoading, events }: EventsSidebarProps) => {
  // const [location, setLocation] = useState('New York, USA'); // Remove mock state
  // const [events, setEvents] = useState(mockEvents); // Remove mock state
  const [view, setView] = useState<'list' | 'grid'>('list');

  // Determine the number of events to display or skeletons to show
  const displayEvents = isLoading ? [] : events; // Use passed events when not loading
  const skeletonCount = 5; // Number of skeletons to show while loading

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-bold">Events</h2>
            <div className="ml-2 px-2 py-1 bg-blue-600/10 text-blue-600 rounded-full text-xs font-medium">
              {isLoading ? '...' : events.length} Events
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="text-sm text-muted-foreground mb-4">St. George Theatre</div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded ${view === 'list' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded ${view === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </button>
          </div>
          <button className="p-1.5 rounded-full bg-background/80 border border-border/50 hover:bg-muted/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Show Skeletons while loading
          Array.from({ length: skeletonCount }).map((_, index) => (
            <div key={index} className="p-4 border-b border-border">
              <div className="flex">
                <Skeleton className="w-16 h-16 rounded-md mr-3 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : displayEvents.length > 0 ? (
          // Show actual events when loaded
          displayEvents.map(event => (
            <div
              key={event.id}
              className="p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onEventSelect && onEventSelect(event)}
            >
              <div className="flex">
                <div className="w-16 h-16 rounded-md overflow-hidden mr-3 bg-muted flex-shrink-0">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { // Add fallback for sidebar image too
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1 line-clamp-2">{event.title}</h3>
                  <div className="flex items-center text-xs text-muted-foreground mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    {event.date} • <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {event.time}
                  </div>
                  <div className="flex items-center">
                    <div className="text-xs bg-muted rounded px-1.5 py-0.5 mr-1 capitalize">{event.category}</div>
                    <div className="flex items-center text-xs text-muted-foreground ml-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="truncate max-w-[120px]">{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
           // Show empty state if not loading and no events
           <div className="p-6 text-center text-muted-foreground">
             No events found for the current view or filters.
           </div>
        )}
      </div>
    </div>
  );
};

export default EventsSidebar;
