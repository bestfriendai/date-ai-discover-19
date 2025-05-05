
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from './EventCard';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { searchEvents } from '@/services/eventService';
import { Event } from '@/types';

interface EventDetailProps {
  eventId?: string;
  event?: Event;
  onClose?: () => void;
}

export function EventDetail({ eventId, event: propEvent, onClose }: EventDetailProps) {
  const [event, setEvent] = useState<Event | null>(propEvent || null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(!propEvent);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadEvent = async () => {
      if (propEvent) {
        setEvent(propEvent);
        setLoading(false);
        return;
      }
      
      if (!eventId) return;
      setLoading(true);
      try {
        // Simulate fetching event data
        const mockEvent: Event = {
          id: eventId,
          title: 'Sample Event',
          description: 'This is a detailed description of the sample event.',
          date: '2023-12-15',
          time: '19:00',
          location: 'Sample Location',
          category: 'music',
          image: 'https://source.unsplash.com/random/800x600/?music',
          price: '25',
          coordinates: [-74.0060, 40.7128] as [number, number]
        };
        setEvent(mockEvent);
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId, propEvent]);

  // Function to load related events
  const loadRelatedEvents = async () => {
    if (!event) return;
    
    try {
      setLoadingRelated(true);
      
      const params = {
        query: event.title?.split(' ').slice(0, 2).join(' '),
        location: event.location,
        category: event.category,
        limit: 4,
        excludeIds: [event.id] 
      };
      
      const result = await searchEvents(params);
      setRelatedEvents(result.events || []);
    } catch (error) {
      console.error('Error loading related events:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  useEffect(() => {
    loadRelatedEvents();
  }, [event]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      return format(new Date(dateStr), 'EEE, MMM d, yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return `@ ${timeStr}`;
  };

  return (
    <Card className="w-full max-w-lg mx-auto my-8">
      <CardHeader>
        <CardTitle>
          {loading ? <Skeleton className="h-5 w-40" /> : event?.title}
        </CardTitle>
        <CardDescription>
          {loading ? (
            <Skeleton className="h-4 w-60" />
          ) : (
            <>
              <CalendarDays className="mr-2 h-4 w-4 inline-block" />
              {formatDate(event?.date)} {formatTime(event?.time)}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-[200px] w-full rounded-md" />
        ) : (
          <img
            src={event?.image || 'https://via.placeholder.com/400'}
            alt={event?.title || 'Event'}
            className="w-full aspect-video rounded-md object-cover"
          />
        )}
        <div className="space-y-2">
          <h4 className="text-sm font-bold">Details</h4>
          {loading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <p>{event?.description || 'No description available.'}</p>
          )}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold">
            <MapPin className="mr-2 h-4 w-4 inline-block" />
            Location
          </h4>
          {loading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <p>{event?.location || 'No location specified'}</p>
          )}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold">
            <Ticket className="mr-2 h-4 w-4 inline-block" />
            Price
          </h4>
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <p>{event?.price || 'Free'}</p>
          )}
        </div>
        {event?.category && (
          <div>
            <h4 className="text-sm font-bold">Category</h4>
            <Badge>{event.category}</Badge>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button onClick={onClose}>Close</Button>
      </CardFooter>

      {/* Related Events Section */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Related Events</h3>
        <div className="flex overflow-x-auto gap-4 py-2">
          {loadingRelated ? (
            <>
              <Skeleton className="w-64 h-40" />
              <Skeleton className="w-64 h-40" />
              <Skeleton className="w-64 h-40" />
            </>
          ) : relatedEvents.length > 0 ? (
            relatedEvents.map((relatedEvent) => (
              <EventCard
                key={relatedEvent.id}
                event={relatedEvent}
                onClick={() => navigate(`/events/${relatedEvent.id}`)}
              />
            ))
          ) : (
            <p>No related events found.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// Add default export to fix import issues
export default EventDetail;
