
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

import { useState } from 'react';
import { toggleFavorite } from '@/services/eventService';
import AddToPlanModal from './AddToPlanModal';
import { toast } from '@/hooks/use-toast';

const EventDetail = ({ event, onClose }: EventDetailProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);

  const handleToggleFavorite = async () => {
    setFavoriteLoading(true);
    try {
      const newStatus = await toggleFavorite(event.id);
      setIsFavorite(newStatus);
      toast({ title: newStatus ? 'Added to Favorites' : 'Removed from Favorites', description: event.title });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update favorite status', variant: 'destructive' });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToPlan = () => {
    setShowItineraryModal(true);
  };

  return (
    <section
      className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] border-l border-[hsl(var(--sidebar-border))] shadow-lg rounded-l-xl"
      role="region"
      aria-label="Event Details"
      tabIndex={0}
    >
      <div className="p-4 border-b border-[hsl(var(--sidebar-border))] flex justify-between items-center">
        <h2 className="text-xl font-bold text-[hsl(var(--sidebar-primary))]">Event Details</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-md hover:bg-[hsl(var(--sidebar-accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]"
          aria-label="Close event details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="h-48 bg-[hsl(var(--sidebar-accent))] rounded-b-xl">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover rounded-b-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2 text-[hsl(var(--sidebar-primary))]">{event.title}</h2>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="text-sm px-3 py-1 bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] rounded-full">{event.category}</div>
            
            <button
              className="ml-auto text-[hsl(var(--sidebar-primary))] hover:text-[hsl(var(--sidebar-primary-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              )}
            </button>
          </div>
          
          <div className="border border-[hsl(var(--sidebar-border))] rounded-md p-4 mb-6 bg-[hsl(var(--sidebar-accent))]/40">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Date</p>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  <p>{event.date}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Time</p>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <p>{event.time}</p>
                </div>
              </div>
              
              <div className="col-span-2">
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Location</p>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <p>{event.location}</p>
                </div>
              </div>
            </div>
          </div>
          
          {event.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--sidebar-primary))]">About</h3>
              <p className="text-[hsl(var(--sidebar-foreground))]/80">{event.description}</p>
            </div>
          )}
          
          <div className="flex gap-4">
            <Button className="flex-1 bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] hover:bg-[hsl(var(--sidebar-primary))]/90 transition">Buy Tickets</Button>
            <Button variant="outline" className="flex-1 border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-primary))] hover:bg-[hsl(var(--sidebar-accent))]/60 transition" onClick={handleAddToPlan}>Add to Plan</Button>
          </div>
        </div>
      </div>
      {showItineraryModal && (
        <AddToPlanModal
          event={event}
          open={showItineraryModal}
          onClose={() => setShowItineraryModal(false)}
        />
      )}
    </section>
  );
};

export default EventDetail;
