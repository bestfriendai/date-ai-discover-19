import { useState, useCallback, useEffect } from 'react';
import type { Event, EventFilters, Coordinate } from '@/types';
import { fetchEvents } from '@/services/eventService';
import { toast } from '../../../hooks/use-toast';

interface EventSearchResult {
  events: Event[];
  isEventsLoading: boolean;
  fetchEvents: (filters: EventFilters, coords?: Coordinate, radius?: number) => Promise<Event[]>;
  loadMoreEvents: () => Promise<void>;
  hasMore: boolean;
  totalEvents: number;
  sourceStats: Record<string, number> | null;
}

export const useEventSearch = (): EventSearchResult => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<EventFilters | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinate | null>(null);
  const [currentRadius, setCurrentRadius] = useState<number | undefined>(undefined);
  const [sourceStats, setSourceStats] = useState<Record<string, number> | null>(null);

  // Function to fetch events
  const fetchEventsHandler = useCallback(async (
    filters: EventFilters,
    coords?: Coordinate,
    radius?: number
  ): Promise<Event[]> => {
    try {
      setIsEventsLoading(true);
      
      // Save current search parameters for pagination
      setCurrentFilters(filters);
      setCurrentCoords(coords || null);
      setCurrentRadius(radius);
      setCurrentPage(1);
      
      // Use the direct RapidAPI integration
      const fetchedEvents = await fetchEvents(filters, coords, radius);
      
      // Update state with fetched events
      setEvents(fetchedEvents);
      setTotalEvents(fetchedEvents.length);
      setHasMore(fetchedEvents.length >= (filters.limit || 100));
      
      // Calculate source statistics
      const stats: Record<string, number> = {};
      fetchedEvents.forEach(event => {
        const source = event.source || 'unknown';
        stats[source] = (stats[source] || 0) + 1;
      });
      setSourceStats(stats);
      
      return fetchedEvents;
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch events. Please try again.',
        variant: 'destructive'
      });
      return [];
    } finally {
      setIsEventsLoading(false);
    }
  }, []);

  // Function to load more events
  const loadMoreEvents = useCallback(async () => {
    if (!currentFilters || !currentCoords || isEventsLoading) return;
    
    try {
      setIsEventsLoading(true);
      
      // Increment page number
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      // Fetch next page of events
      const moreEvents = await fetchEvents(
        { ...currentFilters, page: nextPage },
        currentCoords,
        currentRadius
      );
      
      // Append new events to existing ones
      setEvents(prev => [...prev, ...moreEvents]);
      setHasMore(moreEvents.length >= (currentFilters.limit || 100));
      setTotalEvents(prev => prev + moreEvents.length);
      
      // Update source statistics
      const newStats = { ...sourceStats };
      moreEvents.forEach(event => {
        const source = event.source || 'unknown';
        newStats[source] = (newStats[source] || 0) + 1;
      });
      setSourceStats(newStats);
      
    } catch (error) {
      console.error('Error loading more events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load more events. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsEventsLoading(false);
    }
  }, [currentFilters, currentCoords, currentRadius, currentPage, isEventsLoading, sourceStats]);

  return {
    events,
    isEventsLoading,
    fetchEvents: fetchEventsHandler,
    loadMoreEvents,
    hasMore,
    totalEvents,
    sourceStats
  };
};
