import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Itinerary } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Edit, Trash2, SparklesIcon, Calendar } from 'lucide-react';
import { getItineraries, getItinerary, createItinerary, updateItinerary, deleteItinerary, generateAIItinerary } from '@/services/itineraryService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const DatePlan: React.FC = () => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null); // Keep for display if needed, but navigation handles editing
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDate, setAiDate] = useState(new Date().toISOString().split('T')[0]); // Initialize with today's date
  const [aiLocation, setAiLocation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate
  const { user } = useAuth();
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Sign in required</h2>
        <p className="mb-4 text-muted-foreground">You must be signed in to view your date plans.</p>
        <Button onClick={() => navigate('/')} className="gap-2">
          Sign In
        </Button>
      </div>
    );
  }

  // Fetch all itineraries on mount
  useEffect(() => {
    fetchAllItineraries();
  }, []);

  const fetchAllItineraries = async () => {
    setLoading(true);
    try {
      const data = await getItineraries();
      setItineraries(data);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to edit page on select/click
  const handleEditItinerary = (id: string) => {
    navigate(`/plan/edit/${id}`);
  };

  const handleCreateItinerary = async () => {
    setCreating(true);
    try {
      const name = prompt('Enter itinerary name:');
      if (!name) return;
      const today = new Date().toISOString().split('T')[0];
      const newItinerary = await createItinerary({ name, date: today });
      if (newItinerary) {
        setItineraries((prev) => [...prev, newItinerary]);
        // Navigate to edit page for the new itinerary
        navigate(`/plan/edit/${newItinerary.id}`);
      }
    } catch (error) {
      console.error('Error creating itinerary:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteItinerary = async (id: string) => {
    if (!window.confirm('Delete this itinerary?')) return;
    setLoading(true);
    try {
      const success = await deleteItinerary(id);
      if (success) {
        setItineraries((prev) => prev.filter((it) => it.id !== id));
        if (selectedItinerary?.id === id) setSelectedItinerary(null);
      }
    } catch (error) {
      console.error('Error deleting itinerary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!aiPrompt.trim() || !aiDate) {
      toast({ title: 'Please provide a prompt and date.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      // Call the AI itinerary generation service
      const newItinerary = await generateAIItinerary(aiPrompt, aiDate, aiLocation);

      if (newItinerary?.id) {
        toast({ title: 'Itinerary generated!', description: 'Review and edit your new plan.' });
        navigate(`/plan/edit/${newItinerary.id}`); // Navigate to the edit page
      } else {
        toast({ title: 'Generation failed', description: 'Could not generate an itinerary. Try a different prompt.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error generating AI itinerary:', error);
      toast({ title: 'Error', description: 'An error occurred during generation.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold">Generate Plan with AI</CardTitle>
                <CardDescription>Describe the date you want to plan, and AI will suggest events.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/plan/ai-generator')}>
                <SparklesIcon className="mr-2 h-4 w-4" />
                Advanced Generator
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Tell me about your ideal date...</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Find me a cozy restaurant and a comedy show for Friday evening"
                rows={3}
                disabled={isGenerating}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai-date">Date</Label>
                <Input id="ai-date" type="date" value={aiDate} onChange={(e) => setAiDate(e.target.value)} disabled={isGenerating} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-location">Location (Optional)</Label>
                <Input id="ai-location" type="text" value={aiLocation} onChange={(e) => setAiLocation(e.target.value)} placeholder="e.g., Downtown NYC" disabled={isGenerating} />
              </div>
            </div>
            <Button onClick={handleGeneratePlan} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SparklesIcon className="mr-2 h-4 w-4" />}
              Generate Itinerary
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">My Date Plans</CardTitle>
            <Button onClick={handleCreateItinerary} disabled={creating || loading} size="sm">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              New Itinerary
            </Button>
          </CardHeader>
          <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : itineraries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="mb-2">You haven't created any date plans yet.</p>
              <Button onClick={handleCreateItinerary} disabled={creating}>
                Create Your First Itinerary
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {itineraries.map((it) => (
                <li key={it.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium">{it.name}</span>
                    {it.date && <span className="text-sm text-muted-foreground">{new Date(it.date).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditItinerary(it.id)} aria-label={`Edit ${it.name}`}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteItinerary(it.id)} aria-label={`Delete ${it.name}`}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default DatePlan;
