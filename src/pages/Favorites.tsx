import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import EventGrid from '@/components/events/EventGrid';
import EmptyState from '@/components/shared/EmptyState';
import { getFavorites } from '@/services/favoriteService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-primary/10 p-6 rounded-full mb-4">
          <LogIn className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Sign in to view your favorites</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create an account or sign in to save and view your favorite events.
        </p>
        <Button onClick={() => navigate('/')} className="gap-2">
          Sign In
        </Button>
      </div>
    );
  }

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true);
        const favoritesData = await getFavorites();
        setFavorites(favoritesData);
      } catch (error) {
        console.error('Error loading favorites:', error);
        toast({
          title: 'Error',
          description: 'Failed to load favorites. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 p-3 xs:p-4 sm:p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-4">
              <div className="mb-2 xs:mb-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 xs:w-10 xs:h-10 text-primary"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </div>
              <div>
                <h1 className="text-2xl xs:text-3xl font-bold">Favorites</h1>
                <p className="text-sm xs:text-base text-muted-foreground">Your saved events</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading favorites...</span>
              </div>
            ) : favorites.length > 0 ? (
              <EventGrid events={favorites} />
            ) : (
              <EmptyState
                icon={<Heart className="h-12 w-12" />}
                title="No favorite events yet"
                description="Looks like you haven't saved any events. Why not explore the map and find something exciting for your next date?"
                actionLabel="Explore Events on Map"
                actionHref="/map"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Favorites;
