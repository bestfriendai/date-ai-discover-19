
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

  const fetchEvents = useCallback(async (
    filters: EventFilters,
    centerCoords?: { latitude: number; longitude: number },
    radiusOverride?: number
  ) => {
    if (isEventsLoading) return;
    
    setIsEventsLoading(true);
    try {
      if (!centerCoords) {
        console.warn('[MAP] Cannot fetch events: No location coordinates available.');
        toast({
          title: "Location Unavailable",
          description: "Could not determine location to fetch events. Please allow location access or search for a location.",
          variant: "default",
        });
        setRawEvents([]);
        setEvents([]);
        return;
      }
      
      console.log('[MAP] Fetching events for:', centerCoords, 
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
      
      const result = await searchEvents(searchParams);
      
      if (!result || !result.events) {
        throw new Error('Invalid API response');
      }
      
      setRawEvents(result.events);
      setEvents(result.events);
      
    } catch (error) {
      console.error('[MAP] Error fetching events:', error);
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
    setEvents
  };
};
