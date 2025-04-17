import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { searchEvents } from '@/services/eventService';
import { addFavorite, removeFavorite, isFavorite } from '@/services/favoriteService';
import { useAuth } from '@/contexts/AuthContext';
import AddToPlanModal from './AddToPlanModal';
import { toast } from '@/hooks/use-toast';
import { Event } from '@/types';
import { ExternalLink, MapPin, Calendar, Clock, Heart, Plus, Share2, Ticket } from 'lucide-react';

interface EventDetailProps {
  event: Event;
  onClose: () => void;
}

const EventDetail = ({ event, onClose }: EventDetailProps) => {
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const { user } = useAuth();

  // Check if event is favorited on component mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user) {
        try {
          const result = await isFavorite(event.id);
          setFavorited(result);
        } catch (error) {
          console.error('Error checking favorite status:', error);
        }
      }
    };

    checkFavoriteStatus();
  }, [event.id, user]);

  // Toggle favorite status
  const handleToggleFavorite = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save favorites.',
        variant: 'destructive'
      });
      return;
    }

    setFavoriteLoading(true);
    try {
      if (favorited) {
        await removeFavorite(event.id);
        setFavorited(false);
        toast({
          title: 'Removed from Favorites',
          description: 'Event removed from your favorites.'
        });
      } else {
        await addFavorite(event);
        setFavorited(true);
        toast({
          title: 'Added to Favorites',
          description: 'Event added to your favorites.'
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToPlan = () => {
    setShowItineraryModal(true);
  };

  // Fetch related events
  useEffect(() => {
    const fetchRelatedEvents = async () => {
      try {
        setLoadingRelated(true);
        // Search for events in the same category
        const results = await searchEvents({
          categories: [event.category],
          // These parameters are handled in the service layer
          // @ts-ignore - limit and excludeIds are valid parameters
          limit: 3,
          excludeIds: [event.id],
          // Ensure we request all fields needed for full cards
          fields: ['id', 'title', 'image', 'category', 'date', 'location', 'price', 'url', 'description']
        });

        // Handle the response structure
        if (results && results.events) {
          setRelatedEvents(results.events);
        }
      } catch (error) {
        console.error('Error fetching related events:', error);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelatedEvents();
  }, [event.id, event.category]);

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

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" className="capitalize">{event.category}</Badge>
            {event.source && <Badge variant="outline" className="capitalize">{event.source}</Badge>}
            {event.price && <Badge variant="outline" className="capitalize">{event.price}</Badge>}
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleAddToPlan}
              aria-label="Add to plan"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {event.url && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(event.url, '_blank')}
                aria-label="Visit website"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: event.title,
                    text: `Check out this event: ${event.title}`,
                    url: window.location.href,
                  }).catch(err => console.error('Error sharing:', err));
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied", description: "Event link copied to clipboard" });
                }
              }}
              aria-label="Share event"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="border border-[hsl(var(--sidebar-border))] rounded-md p-4 mb-6 bg-[hsl(var(--sidebar-accent))]/40">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Date</p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <p>{event.date}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Time</p>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <p>{event.time}</p>
                </div>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Location</p>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <p>{event.location}</p>
                </div>
              </div>

              {event.venue && event.venue !== event.location && (
                <div className="col-span-2">
                  <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Venue</p>
                  <p>{event.venue}</p>
                </div>
              )}

              {event.coordinates && (
                <div className="col-span-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      // Open in Google Maps
                      const [lng, lat] = event.coordinates!;
                      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
                    }}
                  >
                    <MapPin className="h-3 w-3 mr-1" /> View on Map
                  </Button>
                </div>
              )}
            </div>
          </div>

          {event.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--sidebar-primary))]">About</h3>
              <p className="text-[hsl(var(--sidebar-foreground))]/80">{event.description}</p>
            </div>
          )}

          <div className="flex gap-4">
            {event.url && (
              <Button
                className="flex-1 bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] hover:bg-[hsl(var(--sidebar-primary))]/90 transition"
                onClick={() => window.open(event.url, '_blank')}
              >
                <Ticket className="h-4 w-4 mr-2" /> Buy Tickets
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-primary))] hover:bg-[hsl(var(--sidebar-accent))]/60 transition"
              onClick={handleAddToPlan}
            >
              <Plus className="h-4 w-4 mr-2" /> Add to Plan
            </Button>
          </div>

          {/* Related Events Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--sidebar-primary))]">Related Events</h3>

            {loadingRelated ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : relatedEvents.length > 0 ? (
              <div className="space-y-3">
                {relatedEvents.map((relatedEvent) => (
                  <Card key={relatedEvent.id} className="overflow-hidden hover:bg-[hsl(var(--sidebar-accent))]/20 transition cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <div className="h-16 w-16 rounded-md overflow-hidden bg-[hsl(var(--sidebar-accent))]">
                          <img
                            src={relatedEvent.image}
                            alt={relatedEvent.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).onerror = null;
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-2">{relatedEvent.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[hsl(var(--sidebar-foreground))]/70">
                            <Calendar className="h-3 w-3" />
                            <span>{relatedEvent.date}</span>
                            {relatedEvent.location && (
                              <><span className="mx-1">·</span><MapPin className="h-3 w-3 inline" /> {relatedEvent.location}</>
                            )}
                          </div>
                          {relatedEvent.price && (
                            <div className="text-xs text-[hsl(var(--sidebar-foreground))]/60 mt-1">
                              Price: {relatedEvent.price}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-[hsl(var(--sidebar-foreground))]/70 text-sm">No related events found.</p>
            )}
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
