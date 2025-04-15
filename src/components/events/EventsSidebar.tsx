
import { useState } from 'react';

// Mock data - this would come from an API in a real app
const mockEvents = [
  {
    id: '1',
    title: 'Loudoun United FC vs. Pittsburgh Riverhounds',
    date: 'Fri, Apr 18',
    time: '04:30 PM',
    location: 'Segra Field',
    category: 'sports',
    image: '/lovable-uploads/abdea098-9a65-4c79-8fad-c2ad27c07525.png'
  },
  {
    id: '2',
    title: 'Charity Gayle',
    date: 'Thu, May 1',
    time: '07:00 PM',
    location: 'Cornerstone Chapel - Leesburg',
    category: 'music',
    image: '/lovable-uploads/dbedd343-8e17-47f1-873d-e473200d7dc8.png'
  },
  {
    id: '3',
    title: 'Loudoun United FC vs. Lexington SC',
    date: 'Fri, May 9',
    time: '06:00 PM',
    location: 'Segra Field',
    category: 'sports',
    image: '/lovable-uploads/abdea098-9a65-4c79-8fad-c2ad27c07525.png'
  }
];

interface EventsSidebarProps {
  onClose: () => void;
  onEventSelect?: (event: any) => void;
}

const EventsSidebar = ({ onClose, onEventSelect }: EventsSidebarProps) => {
  const [location, setLocation] = useState('New York, USA');
  const [events, setEvents] = useState(mockEvents);
  const [view, setView] = useState<'list' | 'grid'>('list');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Events</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <div className="text-sm text-muted-foreground mb-4">{location}</div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{events.length} Events</div>
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
            <button className="p-1.5 rounded hover:bg-muted/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            <button className="p-1.5 rounded hover:bg-muted/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {events.map(event => (
          <div 
            key={event.id} 
            className="p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onEventSelect && onEventSelect(event)}
          >
            <div className="flex">
              <div className="w-16 h-16 rounded overflow-hidden mr-3 bg-muted flex-shrink-0">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1 line-clamp-2">{event.title}</h3>
                <div className="flex items-center text-xs text-muted-foreground mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  {event.date} • <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {event.time}
                </div>
                <div className="flex items-center">
                  <div className="text-xs bg-muted rounded px-1.5 py-0.5 mr-1">{event.category}</div>
                  <div className="flex items-center text-xs text-muted-foreground ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span className="truncate max-w-[120px]">{event.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsSidebar;
