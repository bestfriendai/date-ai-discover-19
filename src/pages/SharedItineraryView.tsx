import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Itinerary } from '@/types';
import { getItinerary } from '@/services/itineraryService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const SharedItineraryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchItinerary(id);
  }, [id]);

  const fetchItinerary = async (itineraryId: string) => {
    setLoading(true);
    setError(null);
    try {
      // getItinerary should work for public itineraries thanks to RLS
      const data = await getItinerary(itineraryId);
      if (data && (data.is_public || (data as any).user_id === (await supabase.auth.getUser()).data.user?.id)) {
        setItinerary(data);
      } else if (data) {
        setError('This itinerary is private.');
      } else {
        setError('Itinerary not found.');
      }
    } catch (error) {
      console.error('Error fetching shared itinerary:', error);
      setError('Could not load itinerary.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <div className="max-w-md mx-auto p-6 bg-card border rounded-lg shadow-sm">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link to="/" className="text-primary hover:underline">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    // This case should ideally be covered by the error state
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <div className="max-w-md mx-auto p-6 bg-card border rounded-lg shadow-sm">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Itinerary Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested itinerary could not be found.</p>
          <Link to="/" className="text-primary hover:underline">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{itinerary.name}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {new Date(itinerary.date).toLocaleDateString()}
          </CardDescription>
          {itinerary.description && <p className="text-sm text-muted-foreground mt-2">{itinerary.description}</p>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {itinerary.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items in this itinerary.
              </div>
            ) : (
              <ul className="space-y-4">
                {itinerary.items
                  .sort((a, b) => a.order - b.order) // Ensure items are sorted by order
                  .map((item) => (
                    <li key={item.id} className="p-4 border rounded-lg bg-muted/30">
                      <div className="font-semibold text-lg mb-1">{item.title || item.notes}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {item.location}
                          </div>
                        )}
                      </div>
                      {item.notes && item.title !== item.notes && (
                        <p className="text-sm text-foreground/80 italic mb-2">{item.notes}</p>
                      )}
                      {/* Optionally link to event details page if it's an EVENT type */}
                      {item.type === 'EVENT' && item.eventId && (
                        <Link to={`/map?selectedEventId=${item.eventId}`} className="text-sm text-primary hover:underline">
                          View Event Details
                        </Link>
                      )}
                    </li>
                  ))
                }
              </ul>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/" className="text-sm text-primary hover:underline">
            Create your own Date Plan!
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SharedItineraryView;
