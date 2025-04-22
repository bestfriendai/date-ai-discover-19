import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { searchEvents } from '@/services/eventService';
import { addFavorite, removeFavorite, isFavorite, getFavorite, toggleReminders } from '@/services/favoriteService';
import reviewService, { Review } from '@/services/reviewService';
import RouteDirections from '@/components/map/components/RouteDirections';
import ShareEventCard from '@/components/events/ShareEventCard';
import { useAuth } from '@/contexts/AuthContext';
import AddToPlanModal from './AddToPlanModal';
import { toast } from '@/hooks/use-toast';
import { Event } from '@/types';
import { ExternalLink, MapPin, Calendar, Clock, Heart, Plus, Share2, Ticket, Star, Bell, Navigation } from 'lucide-react';

// Helper function to format party subcategory for display
const formatPartySubcategory = (subcategory: string): string => {
  switch(subcategory) {
    case 'day-party': return 'Day Party';
    case 'brunch': return 'Brunch';
    case 'club': return 'Club';
    case 'networking': return 'Networking';
    case 'celebration': return 'Celebration';
    case 'social': return 'Social';
    default: return subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
  }
};

interface EventDetailProps {
  event: Event;
  onClose: () => void;
}

const EventDetail = ({ event, onClose }: EventDetailProps) => {
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [userReviewText, setUserReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>(undefined);
  const { user } = useAuth();

  // Check if event is favorited on component mount and get reminder status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user) {
        try {
          // First check if it's a favorite
          const result = await isFavorite(event.id);
          setFavorited(result);

          if (result) {
            // If it's a favorite, get the full favorite object to check reminder status
            const favorite = await getFavorite(event.id);
            if (favorite) {
              setFavoriteId(favorite.id);
              setRemindersEnabled(favorite.reminders_enabled || false);
            }
          }
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
        setFavoriteId(null);
        setRemindersEnabled(false);
        toast({
          title: 'Removed from Favorites',
          description: 'Event removed from your favorites.'
        });
      } else {
        const success = await addFavorite(event);
        setFavorited(true);

        // Get the favorite ID for the newly added favorite
        if (success) {
          const favorite = await getFavorite(event.id);
          if (favorite) {
            setFavoriteId(favorite.id);
            setRemindersEnabled(favorite.reminders_enabled || false);
          }
        }

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

  // Get user's current location for directions
  const handleGetDirections = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Mapbox expects [longitude, latitude] format
          setUserLocation([position.coords.longitude, position.coords.latitude]);
          setShowDirections(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Could not get your current location. Please allow location access.',
            variant: 'destructive'
          });
        }
      );
    } else {
      toast({
        title: 'Location Not Supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive'
      });
    }
  };

  // Toggle reminders for this event
  const handleToggleReminders = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to set reminders.',
        variant: 'destructive'
      });
      return;
    }

    if (!favorited || !favoriteId) {
      toast({
        title: 'Favorite First',
        description: 'Please add this event to your favorites before setting reminders.',
        variant: 'destructive'
      });
      return;
    }

    setReminderLoading(true);
    try {
      const newReminderState = !remindersEnabled;
      const success = await toggleReminders(favoriteId, newReminderState);

      if (success) {
        setRemindersEnabled(newReminderState);
        toast({
          title: newReminderState ? 'Reminders Enabled' : 'Reminders Disabled',
          description: newReminderState
            ? 'You will receive a reminder before this event.'
            : 'You will no longer receive reminders for this event.'
        });
      } else {
        throw new Error('Failed to update reminder settings');
      }
    } catch (error) {
      console.error('Error toggling reminders:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reminder settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setReminderLoading(false);
    }
  };

  // Fetch reviews and average rating
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const fetchedReviews = await reviewService.getReviewsForEvent(event.id);
        setReviews(fetchedReviews);

        const avgRating = await reviewService.getAverageRatingForEvent(event.id);
        setAverageRating(avgRating);

        // Check if the current user has already reviewed this event
        if (user) {
          const currentUserReview = await reviewService.getUserReviewForEvent(event.id);
          if (currentUserReview) {
            setUserRating(currentUserReview.rating);
            setUserReviewText(currentUserReview.review_text || '');
          } else {
            setUserRating(0);
            setUserReviewText('');
          }
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        toast({ title: 'Error loading reviews', variant: 'destructive' });
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [event.id, user, toast]);

  // Handle submitting a review
  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to leave a review.', variant: 'destructive' });
      return;
    }
    if (userRating === 0) {
      toast({ title: 'Rating required', description: 'Please select a star rating.', variant: 'destructive' });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const submitted = await reviewService.submitReview({
        event_id: event.id,
        rating: userRating,
        review_text: userReviewText.trim() || undefined,
      });

      if (submitted) {
        toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
        // Re-fetch reviews to update the list and average
        const fetchedReviews = await reviewService.getReviewsForEvent(event.id);
        setReviews(fetchedReviews);

        const avgRating = await reviewService.getAverageRatingForEvent(event.id);
        setAverageRating(avgRating);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast({ title: 'Error submitting review', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmittingReview(false);
    }
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

        <div className="p-6 space-y-6"> {/* Added space-y-6 for consistent vertical spacing */}
          <div>
            <h2 className="text-2xl font-bold mb-2 text-[hsl(var(--sidebar-primary))]">{event.title}</h2>

            <div className="flex flex-wrap items-center gap-2"> {/* Removed mb-4 */}
              <Badge variant="secondary" className="capitalize">{event.category}</Badge>
              {event.category === 'party' && event.partySubcategory && (
                <Badge variant="secondary" className="capitalize bg-purple-600">
                  {formatPartySubcategory(event.partySubcategory)}
                </Badge>
              )}
              {event.source && <Badge variant="outline" className="capitalize">{event.source}</Badge>}
              {event.price && <Badge variant="outline" className="capitalize">{event.price}</Badge>}
            </div>
          </div>

          <div className="flex items-center gap-2"> {/* Removed mb-6 */}
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

            {favorited && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleReminders}
                disabled={reminderLoading || !favoriteId}
                aria-label={remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
              >
                <Bell className="h-4 w-4" fill={remindersEnabled ? "currentColor" : "none"} />
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleAddToPlan}
              aria-label="Add to plan"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {event.coordinates && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleGetDirections}
                aria-label="Get directions"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            )}

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
              onClick={() => setShowShareCard(true)}
              aria-label="Share event"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="border border-[hsl(var(--sidebar-border))] rounded-md p-4 bg-[hsl(var(--sidebar-accent))]/40"> {/* Removed mb-6 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Date</p>
                <div className="flex items-center text-[hsl(var(--sidebar-foreground))]"> {/* Added text color */}
                  <Calendar className="h-4 w-4 mr-2" />
                  <p>{event.date}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Time</p>
                <div className="flex items-center text-[hsl(var(--sidebar-foreground))]"> {/* Added text color */}
                  <Clock className="h-4 w-4 mr-2" />
                  <p>{event.time}</p>
                </div>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Location</p>
                <div className="flex items-center text-[hsl(var(--sidebar-foreground))]"> {/* Added text color */}
                  <MapPin className="h-4 w-4 mr-2" />
                  <p>{event.location}</p>
                </div>
              </div>

              {event.venue && event.venue !== event.location && (
                <div className="col-span-2">
                  <p className="text-sm text-[hsl(var(--sidebar-foreground))]/70 mb-1">Venue</p>
                  <p className="text-[hsl(var(--sidebar-foreground))]">{event.venue}</p> {/* Added text color */}
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
            <div> {/* Removed mb-6 */}
              <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--sidebar-primary))]">About</h3>
              <p className="text-[hsl(var(--sidebar-foreground))]">{event.description}</p> {/* Removed /80 opacity */}
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

          {/* Reviews & Ratings Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[hsl(var(--sidebar-primary))]">Reviews & Ratings</h3>

            {/* Display Average Rating */}
            {averageRating !== null && (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
                <span className="text-xl font-bold">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            )}
            {averageRating === null && reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">No ratings yet.</p>
            )}

            {/* Review Submission Form */}
            {user && (
              <Card className="bg-[hsl(var(--sidebar-accent))]/30 border-[hsl(var(--sidebar-border))]">
                <CardContent className="p-4 space-y-3">
                  <div className="font-medium">Leave a Review</div>
                  <div className="flex items-center gap-1">
                    {/* Simple Star Rating Input */}
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`h-5 w-5 cursor-pointer transition-colors ${
                          userRating >= star ? 'text-yellow-400 fill-current' : 'text-muted-foreground'
                        }`}
                        onClick={() => setUserRating(star)}
                      />
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your experience..."
                    value={userReviewText}
                    onChange={(e) => setUserReviewText(e.target.value)}
                    rows={2}
                    disabled={isSubmittingReview}
                  />
                  <Button onClick={handleSubmitReview} size="sm" disabled={isSubmittingReview || userRating === 0}>
                    {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </CardContent>
              </Card>
            )}
            {!user && (
              <p className="text-sm text-muted-foreground">Sign in to leave a review.</p>
            )}

            {/* Display Reviews */}
            <div className="space-y-4">
              {loadingReviews ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} className="border-b border-[hsl(var(--sidebar-border))] pb-4 last:border-b-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={review.user?.avatar_url} />
                        <AvatarFallback>{review.user?.full_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{review.user?.full_name || 'Anonymous'}</span>
                      {/* Display review rating */}
                      <div className="flex items-center gap-0.5 ml-auto">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              review.rating >= star ? 'text-yellow-400 fill-current' : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.review_text && <p className="text-sm text-[hsl(var(--sidebar-foreground))]/80">{review.review_text}</p>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : null}
            </div>
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
                          <div className="flex items-center gap-2 mt-1 text-xs text-[hsl(var(--sidebar-foreground))]"> {/* Adjusted text color */}
                            <Calendar className="h-3 w-3" />
                            <span>{relatedEvent.date}</span>
                            {relatedEvent.location && (
                                <><span className="mx-1">·</span><MapPin className="h-3 w-3 inline" /> {relatedEvent.location}</>
                            )}
                          </div>
                          {relatedEvent.price && (
                            <div className="text-xs text-[hsl(var(--sidebar-foreground))] mt-1"> {/* Adjusted text color */}
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
              <p className="text-[hsl(var(--sidebar-foreground))] text-sm">No related events found.</p>
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

      {/* Directions Modal */}
      {showDirections && userLocation && event.coordinates && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <RouteDirections
              origin={userLocation}
              originName="Your Location"
              destination={event.coordinates}
              destinationName={event.venue || event.location}
              mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              onClose={() => setShowDirections(false)}
            />
          </div>
        </div>
      )}

      {/* Share Event Modal */}
      {showShareCard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <ShareEventCard
              event={event}
              onClose={() => setShowShareCard(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default EventDetail;
