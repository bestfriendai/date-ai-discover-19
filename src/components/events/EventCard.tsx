
import React from 'react';
import { Event } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, MapPin, Clock } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  return (
    <Card 
      className="w-64 flex-shrink-0 hover:bg-accent/50 transition cursor-pointer"
      onClick={() => onClick && onClick(event)}
    >
      <CardContent className="p-3">
        <div className="h-32 w-full rounded-md overflow-hidden bg-muted mb-3">
          <img
            src={event.image || 'https://via.placeholder.com/400'}
            alt={event.title || 'Event'}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{event.title}</h4>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>{event.date}</span>
            {event.time && (
              <>
                <span className="mx-1">•</span>
                <Clock className="h-3 w-3" />
                <span>{event.time}</span>
              </>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCard;
