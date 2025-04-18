
import { useState, useCallback } from 'react';
import { Event } from '@/types';
import { searchEvents } from '@/services/eventService';
import { formatISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { EventFilters } from '../components/MapControls';

export const useEventSearch = () => {
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const [lastSearchParams, setLastSearchParams] = useState<any>(null);

  const fetchEvents = useCallback(async (
    filters: EventFilters,
    centerCoords?: { latitude: number; longitude: number },
    radiusOverride?: number
  ) => {
    if (isEventsLoading) {
      console.log('[EVENTS] Already loading events, skipping fetch request');
      return;
    }
    
    setIsEventsLoading(true);
    console.log('[EVENTS] Starting event fetch with coordinates:', centerCoords);
    
    try {
      if (!centerCoords) {
        console.warn('[EVENTS] Cannot fetch events: No location coordinates available.');
        toast({
          title: "Location Unavailable",
          description: "Could not determine location to fetch events. Please allow location access or search for a location.",
          variant: "default",
        });
        setRawEvents([]);
        setEvents([]);
        return;
      }
      
      console.log('[EVENTS] Fetching events for:', centerCoords, 
        'radius:', radiusOverride || filters.distance);
        
      const searchParams = {
        latitude: centerCoords.latitude,
        longitude: centerCoords.longitude,
        radius: radiusOverride !== undefined ? radiusOverride : filters.distance,
        startDate: filters.dateRange?.from ? formatISO(filters.dateRange.from, { representation: 'date' }) : undefined,
        endDate: filters.dateRange?.to ? formatISO(filters.dateRange.to, { representation: 'date' }) : undefined,
        categories: filters.categories,
        keyword: filters.keyword,
        location: filters.location,
      };
      
      console.log('[EVENTS] Search params:', searchParams);
      setLastSearchParams(searchParams);
      
      const result = await searchEvents(searchParams);
      
      if (!result || !result.events) {
        throw new Error('Invalid API response');
      }
      
      console.log('[EVENTS] Received', result.events.length, 'events from API');
      
      if (result.events.length === 0) {
        toast({
          title: "No events found",
          description: "Try adjusting your search criteria or location.",
          variant: "default",
        });
      } else {
        toast({
          title: "Events loaded",
          description: `Found ${result.events.length} events in this area.`,
          variant: "default",
        });
      }
      
      setRawEvents(result.events);
      setEvents(result.events);
      
    } catch (error) {
      console.error('[EVENTS] Error fetching events:', error);
      toast({
        title: "Failed to load events",
        description: "An error occurred while loading events. Please try again.",
        variant: "destructive",
      });
      setRawEvents([]);
      setEvents([]);
    } finally {
      setIsEventsLoading(false);
    }
  }, [isEventsLoading]);

  return {
    events,
    rawEvents,
    isEventsLoading,
    fetchEvents,
    setEvents,
    lastSearchParams
  };
};
