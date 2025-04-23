import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { FeaturesList } from './FeaturesList';
import { Sparkles } from 'lucide-react';

// Define the features data
const featuresData = [
  {
    name: 'Interactive Map',
    description: 'Explore events on an interactive map with custom markers for different event types.',
    available: true,
    tooltip: 'Pan, zoom, and click on markers to see event details.'
  },
  {
    name: 'Party Events',
    description: 'Discover parties, concerts, and social gatherings in your area.',
    available: true,
  },
  {
    name: 'Event Filtering',
    description: 'Filter events by category, date, and distance.',
    available: true,
  },
  {
    name: 'Event Details',
    description: 'View comprehensive details about each event including time, location, and description.',
    available: true,
  },
  {
    name: 'Date Planning',
    description: 'Create and save date plans with multiple events.',
    available: true,
  },
  {
    name: 'AI Chat Assistant',
    description: 'Get personalized date recommendations from our AI assistant.',
    available: true,
  },
  {
    name: 'Favorites',
    description: 'Save your favorite events for later.',
    available: true,
  },
  {
    name: 'Multiple Event Sources',
    description: 'Events from Ticketmaster, PredictHQ, and more.',
    available: true,
  },
  {
    name: 'Personalized Recommendations',
    description: 'Get event recommendations based on your preferences and past interests.',
    available: false,
    comingSoon: true,
  },
  {
    name: 'Social Sharing',
    description: 'Share events and date plans with friends.',
    available: false,
    comingSoon: true,
  },
  {
    name: 'Event Notifications',
    description: 'Get notified about upcoming events that match your interests.',
    available: false,
    comingSoon: true,
  }
];

interface FeaturesModalProps {
  trigger?: React.ReactNode;
}

export const FeaturesModal: React.FC<FeaturesModalProps> = ({ trigger }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Features</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>DateAI Features</DialogTitle>
          <DialogDescription>
            Discover all the features available in DateAI
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <FeaturesList 
            features={featuresData} 
            onClose={() => setOpen(false)} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeaturesModal;
