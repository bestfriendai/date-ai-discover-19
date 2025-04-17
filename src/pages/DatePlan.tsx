
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import ItineraryList from '@/components/itinerary/ItineraryList';
import ItineraryBuilder from '@/components/itinerary/ItineraryBuilder';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Sparkles, Loader2 } from 'lucide-react';
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

  // AI Itinerary Generation
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDate, setAiDate] = useState('');
  const [aiDuration, setAiDuration] = useState('3');
  const [aiBudget, setAiBudget] = useState('medium');

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
  const handleSaveItinerary = useCallback(async (itinerary: Itinerary) => {
    console.log('[DatePlan] Saving itinerary:', itinerary);
    try {
      let savedId: string | undefined = itinerary.id;
      if (itinerary.id.startsWith('new-')) {
        // Remove id, createdAt, updatedAt for creation
        const { id, createdAt, updatedAt, ...createData } = itinerary as any;
        const created = await createItinerary(createData);
        savedId = created?.id;

        toast({
          title: "Itinerary Created",
          description: "Your itinerary has been created successfully."
        });
      } else {
        // For existing itineraries, use the preserveItems flag to avoid deleting and recreating all items
        // This is important for maintaining item IDs when using drag-and-drop
        await updateItinerary(itinerary.id, {
          name: itinerary.name,
          description: itinerary.description,
          date: itinerary.date,
          items: itinerary.items,
          isPublic: itinerary.isPublic,
          preserveItems: true
        });
        savedId = itinerary.id;

        toast({
          title: "Itinerary Updated",
          description: "Your changes have been saved successfully."
        });
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
      toast({
        title: "Error",
        description: "Failed to save itinerary. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [navigate, toast]);

  // Create a new itinerary
  const handleCreateNew = () => {
    navigate('/plan/new');
  };

  // Open AI generation dialog
  const handleOpenAIDialog = () => {
    // Set default date to next Saturday
    const today = new Date();
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + (6 - today.getDay() + 7) % 7);
    setAiDate(nextSaturday.toISOString().split('T')[0]);

    // Reset other fields
    setAiPrompt('');
    setAiDuration('3');
    setAiBudget('medium');

    // Show dialog
    setShowAIDialog(true);
  };

  // Generate itinerary with AI
  const handleGenerateItinerary = async () => {
    if (!aiPrompt || !aiDate) {
      toast({
        title: "Missing information",
        description: "Please provide a description and date for your itinerary.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingItinerary(true);

    try {
      // In the future, this would call a Supabase Edge Function
      // For now, we'll simulate a delay and create a placeholder itinerary
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Create a placeholder itinerary with some items based on the prompt
      const newItinerary: Omit<Itinerary, 'id' | 'createdAt' | 'updatedAt'> = {
        name: `AI Generated: ${aiPrompt.split(' ').slice(0, 3).join(' ')}...`,
        description: `AI generated itinerary based on: "${aiPrompt}". Budget: ${aiBudget}, Duration: ${aiDuration} hours`,
        date: aiDate,
        items: [
          {
            id: `ai-item-${Date.now()}-1`,
            title: getRandomActivityTitle(aiPrompt, aiBudget),
            description: "AI generated activity",
            startTime: getTimeString(aiDate, 10, 0),
            endTime: getTimeString(aiDate, 11, 30),
            location: "AI suggested location",
            notes: "",
            type: "CUSTOM",
            order: 0
          },
          {
            id: `ai-item-${Date.now()}-2`,
            title: "Lunch at a local restaurant",
            description: "Enjoy a meal together",
            startTime: getTimeString(aiDate, 12, 0),
            endTime: getTimeString(aiDate, 13, 30),
            location: "Local restaurant",
            notes: "",
            type: "CUSTOM",
            order: 1
          },
          {
            id: `ai-item-${Date.now()}-3`,
            title: getRandomActivityTitle(aiPrompt, aiBudget),
            description: "AI generated activity",
            startTime: getTimeString(aiDate, 14, 0),
            endTime: getTimeString(aiDate, 16, 0),
            location: "AI suggested location",
            notes: "",
            type: "CUSTOM",
            order: 2
          }
        ]
      };

      // Save the itinerary
      const created = await createItinerary(newItinerary);

      if (created?.id) {
        // Refresh the itineraries list
        const updatedItineraries = await getItineraries();
        setItineraries(updatedItineraries);

        // Navigate to the new itinerary
        navigate(`/plan/${created.id}`);

        toast({
          title: "Itinerary Generated",
          description: "Your AI-generated itinerary is ready to customize!",
        });
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate itinerary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingItinerary(false);
      setShowAIDialog(false);
    }
  };

  // Helper function to get a random activity title based on the prompt
  const getRandomActivityTitle = (prompt: string, budget: string) => {
    const lowBudgetActivities = [
      "Walk in the park",
      "Visit a local museum",
      "Coffee at a cozy café",
      "Picnic by the lake",
      "Explore a farmers market"
    ];

    const mediumBudgetActivities = [
      "Movie and dinner",
      "Wine tasting experience",
      "Cooking class together",
      "Escape room challenge",
      "Boat ride on the river"
    ];

    const highBudgetActivities = [
      "Spa day experience",
      "Helicopter city tour",
      "Fine dining experience",
      "Theater show with VIP seats",
      "Private sunset cruise"
    ];

    let activities: string[];
    switch (budget) {
      case 'low':
        activities = lowBudgetActivities;
        break;
      case 'high':
        activities = highBudgetActivities;
        break;
      case 'medium':
      default:
        activities = mediumBudgetActivities;
    }

    // If the prompt contains certain keywords, try to match activities
    const promptLower = prompt.toLowerCase();
    const matchingActivities = activities.filter((activity: string) => {
      const activityLower = activity.toLowerCase();
      return promptLower.includes(activityLower) ||
             activityLower.split(' ').some((word: string) => promptLower.includes(word));
    });

    // Use matching activities if found, otherwise use the full list
    const finalActivities = matchingActivities.length > 0 ? matchingActivities : activities;
    return finalActivities[Math.floor(Math.random() * finalActivities.length)];
  };

  // Helper function to format time string
  const getTimeString = (dateStr: string, hours: number, minutes: number) => {
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
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
          <div className="flex gap-2">
            <Button
              onClick={handleOpenAIDialog}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </Button>
            <Button
              onClick={handleCreateNew}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              New Itinerary
            </Button>
          </div>
        </div>
        <ItineraryList itineraries={itineraries} />
      </>
    ) : (
      <>
        <EmptyState
          icon="calendar"
          title="No itineraries yet"
          description="Create your first itinerary to plan the perfect date, or let AI help you generate one."
          actionLabel="Create Itinerary"
          actionOnClick={handleCreateNew}
        />
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleOpenAIDialog}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
        </div>
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

      {/* AI Itinerary Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Itinerary with AI
            </DialogTitle>
            <DialogDescription>
              Describe your ideal date and let AI create an itinerary for you.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ai-prompt">What kind of date are you planning?</Label>
              <Textarea
                id="ai-prompt"
                placeholder="E.g., A romantic evening in the city with dinner and a show"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ai-date">Date</Label>
                <Input
                  id="ai-date"
                  type="date"
                  value={aiDate}
                  onChange={(e) => setAiDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ai-duration">Duration (hours)</Label>
                <Select value={aiDuration} onValueChange={setAiDuration}>
                  <SelectTrigger id="ai-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="8">Full day (8+ hours)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ai-budget">Budget</Label>
              <Select value={aiBudget} onValueChange={setAiBudget}>
                <SelectTrigger id="ai-budget">
                  <SelectValue placeholder="Select budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (under $50)</SelectItem>
                  <SelectItem value="medium">Medium ($50-$150)</SelectItem>
                  <SelectItem value="high">High ($150+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)}>Cancel</Button>
            <Button
              onClick={handleGenerateItinerary}
              disabled={generatingItinerary || !aiPrompt || !aiDate}
              className="gap-2"
            >
              {generatingItinerary ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Itinerary
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatePlan;
