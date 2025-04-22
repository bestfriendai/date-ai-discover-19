import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, MapPin, Sparkles, Clock, DollarSign, Compass } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const AIItineraryGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [location, setLocation] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to use the AI Itinerary Generator',
        variant: 'destructive'
      });
      navigate('/login');
    }
  }, [user, navigate]);

  // Additional preferences
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>('');

  const preferences = [
    { id: 'food', label: 'Food & Dining' },
    { id: 'music', label: 'Music & Concerts' },
    { id: 'arts', label: 'Arts & Culture' },
    { id: 'outdoors', label: 'Outdoor Activities' },
    { id: 'nightlife', label: 'Nightlife' },
    { id: 'sports', label: 'Sports & Recreation' },
    { id: 'family', label: 'Family-Friendly' },
    { id: 'romantic', label: 'Romantic' },
  ];

  const handlePreferenceToggle = (preferenceId: string) => {
    setSelectedPreferences(prev =>
      prev.includes(preferenceId)
        ? prev.filter(id => id !== preferenceId)
        : [...prev, preferenceId]
    );
  };

  const handleGenerateItinerary = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to generate an itinerary',
        variant: 'destructive'
      });
      return;
    }

    if (!date) {
      toast({
        title: 'Date required',
        description: 'Please select a date for your itinerary',
        variant: 'destructive'
      });
      return;
    }

    if (!location) {
      toast({
        title: 'Location required',
        description: 'Please enter a location for your itinerary',
        variant: 'destructive'
      });
      return;
    }

    if (prompt.length < 10) {
      toast({
        title: 'More details needed',
        description: 'Please provide more details about what you want to do',
        variant: 'destructive'
      });
      return;
    }

    if (selectedPreferences.length === 0) {
      toast({
        title: 'Preferences required',
        description: 'Please select at least one preference',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Format the date as YYYY-MM-DD
      const formattedDate = format(date, 'yyyy-MM-dd');

      // Build the prompt with all the details
      let fullPrompt = prompt;

      if (budget) {
        fullPrompt += ` Budget: ${budget}.`;
      }

      if (selectedPreferences.length > 0) {
        fullPrompt += ` I'm interested in: ${selectedPreferences.map(p => {
          const pref = preferences.find(item => item.id === p);
          return pref ? pref.label.toLowerCase() : p;
        }).join(', ')}.`;
      }

      // Call the generate-itinerary function
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: {
          prompt: fullPrompt,
          date: formattedDate,
          location: location
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Itinerary generated!',
        description: `Created with ${data.itemCount} activities`,
      });

      // Navigate to the edit page for the new itinerary
      navigate(`/plan/edit/${data.id}`);

    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast({
        title: 'Error generating itinerary',
        description: error.message || 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Itinerary Generator
          </CardTitle>
          <CardDescription>
            Let AI create a personalized itinerary based on your preferences
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <DatePicker
                date={date}
                setDate={setDate}
                className="w-full"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., New York City, NY"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              What would you like to do?
            </Label>
            <Textarea
              id="prompt"
              placeholder="Describe your ideal day or evening. For example: 'I want a romantic evening with dinner and a show' or 'Looking for a fun day with outdoor activities and good food'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-1">
              <Compass className="h-4 w-4" />
              Preferences
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {preferences.map((preference) => (
                <div key={preference.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`preference-${preference.id}`}
                    checked={selectedPreferences.includes(preference.id)}
                    onCheckedChange={() => handlePreferenceToggle(preference.id)}
                    disabled={loading}
                  />
                  <Label
                    htmlFor={`preference-${preference.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {preference.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Budget (Optional)
            </Label>
            <Select
              value={budget}
              onValueChange={setBudget}
              disabled={loading}
            >
              <SelectTrigger id="budget">
                <SelectValue placeholder="Select a budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No preference</SelectItem>
                <SelectItem value="budget">Budget-friendly (Under $50)</SelectItem>
                <SelectItem value="moderate">Moderate ($50-$150)</SelectItem>
                <SelectItem value="upscale">Upscale ($150-$300)</SelectItem>
                <SelectItem value="luxury">Luxury ($300+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            onClick={handleGenerateItinerary}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Itinerary...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Itinerary
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AIItineraryGenerator;
