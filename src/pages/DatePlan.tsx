
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import ItineraryList from '@/components/itinerary/ItineraryList';
import ItineraryBuilder from '@/components/itinerary/ItineraryBuilder';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { getItineraries, getItinerary, createItinerary, updateItinerary } from '@/services/itineraryService';
import type { Itinerary } from '@/types';
import { useToast } from '@/hooks/use-toast';

const DatePlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log('[DatePlan] Rendering with id param:', id);

  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch itineraries on component mount
  useEffect(() => {
    console.log('[DatePlan] Fetching itineraries effect running');
    const fetchItineraries = async () => {
      try {
        setLoading(true);
        const data = await getItineraries();
        setItineraries(data);
      } catch (error) {
        console.error('Error fetching itineraries:', error);
        toast({
          title: "Error",
          description: "Failed to load itineraries. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchItineraries();
  }, [toast]);

  // Fetch specific itinerary if ID is provided
  useEffect(() => {
    console.log('[DatePlan] Itinerary ID effect running with id:', id);
    if (id && id !== 'new') {
      const fetchItinerary = async () => {
        try {
          console.log('Fetching itinerary with ID:', id);
          const data = await getItinerary(id);
          console.log('Fetched itinerary data:', data);
          if (data) {
            setSelectedItinerary(data);
          } else {
            navigate('/plan');
            toast({
              title: "Not Found",
              description: "The requested itinerary could not be found.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error fetching itinerary:', error);
          navigate('/plan');
          toast({
            title: "Error",
            description: "Failed to load itinerary. Please try again.",
            variant: "destructive"
          });
        }
      };

      fetchItinerary();
    } else if (id === 'new') {
      // Create a new empty itinerary
      const today = new Date();
      setSelectedItinerary({
        id: `new-${Date.now()}`,
        name: 'New Itinerary',
        description: '',
        date: today.toISOString().split('T')[0],
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }, [id, navigate, toast]);

  // Handle saving an itinerary
  const handleSaveItinerary = async (itinerary: Itinerary) => {
    console.log('[DatePlan] Saving itinerary:', itinerary);
    try {
      let savedId: string | undefined = itinerary.id;
      if (itinerary.id.startsWith('new-')) {
        // Remove id, createdAt, updatedAt for creation
        const { id, createdAt, updatedAt, ...createData } = itinerary as any;
        const created = await createItinerary(createData);
        savedId = created?.id;
      } else {
        await updateItinerary(itinerary.id, itinerary);
        savedId = itinerary.id;
      }

      // Refresh the itineraries list
      const updatedItineraries = await getItineraries();
      setItineraries(updatedItineraries);

      // If this was a new itinerary, navigate to the saved one
      if (itinerary.id.startsWith('new-') && savedId) {
        navigate(`/plan/${savedId}`);
      }
      // Do not return anything (void)
    } catch (error) {
      console.error('Error saving itinerary:', error);
      throw error;
    }
  };

  // Create a new itinerary
  const handleCreateNew = () => {
    navigate('/plan/new');
  };

  // Render the appropriate view based on whether an itinerary is selected
  const renderContent = () => {
    if (id) {
      return selectedItinerary ? (
        <ItineraryBuilder
          itinerary={selectedItinerary}
          onSave={handleSaveItinerary}
        />
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return itineraries.length > 0 ? (
      <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">My Itineraries</h2>
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            New Itinerary
          </Button>
        </div>
        <ItineraryList itineraries={itineraries} />
      </>
    ) : (
      <>
        <EmptyState
          icon="calendar"
          title="No itineraries yet"
          description="Create your first itinerary to plan the perfect date."
          actionLabel="Create Itinerary"
          actionOnClick={handleCreateNew}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 p-3 xs:p-4 sm:p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-4">
              <div className="mb-2 xs:mb-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 xs:w-10 xs:h-10 text-primary"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <div>
                <h1 className="text-2xl xs:text-3xl font-bold">Date Planner</h1>
                <p className="text-sm xs:text-base text-muted-foreground">Create your perfect date experience</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePlan;
