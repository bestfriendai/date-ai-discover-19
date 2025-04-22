import { AnimatedCard } from '../animations/AnimatedCard';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  image: string;
}

import useInfiniteScroll from '@/hooks/useInfiniteScroll'; // Import the hook
import { useEffect, useRef } from 'react'; // Import useEffect and useRef

interface EventGridProps {
  fetchFunction: (params: any) => Promise<{ events: Event[], totalEvents?: number }>;
  initialParams: any;
}

const EventGrid = ({ fetchFunction, initialParams }: EventGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null); // Ref for the grid container

  const {
    data: events, // Rename data to events for consistency
    loading,
    error,
    hasMore,
    loadMore
  } = useInfiniteScroll({
    fetchFunction,
    initialParams
  });

  // Scroll listener for infinite scrolling
  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = gridElement;
      const scrollThreshold = 200; // Load more when 200px from the bottom

      if (scrollHeight - scrollTop - clientHeight < scrollThreshold && hasMore && !loading) {
        loadMore();
      }
    };

    gridElement.addEventListener('scroll', handleScroll);

    return () => {
      gridElement.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loading, loadMore]); // Dependencies for the effect

  if (error) {
    return (
      <div className="text-center py-10 text-destructive">
        <p>Error loading events: {error.message}</p>
      </div>
    );
  }

  if (events.length === 0 && !loading) { // Check loading state as well
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No events found</p>
      </div>
    );
  }

  return (
    <> {/* Use fragment to return multiple elements */}
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto h-full"> {/* Add ref and make it scrollable */}
        {events.map((event, index) => (
          <AnimatedCard key={event.id} delay={index * 0.05}> {/* Reduced delay for faster animation */}
            <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
              <div className="h-40 overflow-hidden bg-muted">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="font-medium mb-2 line-clamp-2">{event.title}</h3>
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  {event.date} • <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {event.time}
                </div>
                <div className="flex items-center">
                  <div className="text-xs bg-muted rounded px-2 py-1 mr-2">{event.category}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span className="truncate max-w-[150px]">{event.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>
      {loading && ( // Loading indicator
        <div className="text-center py-4">
          <p className="text-muted-foreground">Loading more events...</p>
        </div>
      )}
      {!hasMore && events.length > 0 && ( // "No more events" message
        <div className="text-center py-4">
          <p className="text-muted-foreground">No more events found.</p>
        </div>
      )}
    </>
  );
};

export default EventGrid;
