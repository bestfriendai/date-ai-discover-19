import { useState } from 'react';
import Header from '@/components/layout/Header';
import EventsSidebar from '@/components/events/EventsSidebar';
import EventDetail from '@/components/events/EventDetail';
import MapComponent from '@/components/map/MapComponent';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Event } from '@/types';

// Mock event for demo purposes
const mockEvent = {
  id: '1',
  title: 'Loudoun United FC vs. Pittsburgh Riverhounds',
  description: 'Join us for an exciting soccer match between Loudoun United FC and Pittsburgh Riverhounds at Segra Field. Enjoy a thrilling sports event with family and friends.',
  date: 'Fri, Apr 18',
  time: '04:30 PM',
  location: 'Segra Field',
  category: 'sports',
  image: '/lovable-uploads/abdea098-9a65-4c79-8fad-c2ad27c07525.png'
};

const MapView = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  // Function to handle event selection
  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setRightSidebarOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />
      <div className="flex-1 flex relative overflow-hidden pt-16">
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <motion.div
              initial={{ x: -380 }}
              animate={{ x: 0 }}
              exit={{ x: -380 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="w-full max-w-[380px] sm:w-[380px] bg-card/50 backdrop-blur-xl border-r border-border/50 relative z-20 overflow-y-auto h-full fixed sm:static left-0 top-0 sm:relative"
              style={{ height: '100%', maxHeight: '100vh' }}
            >
              <EventsSidebar
                onClose={() => setLeftSidebarOpen(false)}
                onEventSelect={handleEventSelect}
                isLoading={isEventsLoading}
                events={events}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 relative">
          <MapComponent
            onEventSelect={handleEventSelect}
            onLoadingChange={setIsEventsLoading}
            onEventsChange={setEvents}
          />

          {/* Toggle button for left sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="absolute top-4 left-4 z-30 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background/90 rounded-full w-12 h-12 flex items-center justify-center sm:w-10 sm:h-10"
            aria-label={leftSidebarOpen ? "Close events sidebar" : "Open events sidebar"}
          >
            {leftSidebarOpen ? <ChevronLeft className="h-6 w-6 sm:h-4 sm:w-4" /> : <ChevronRight className="h-6 w-6 sm:h-4 sm:w-4" />}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="w-full max-w-[400px] sm:w-[400px] bg-card/50 backdrop-blur-xl border-l border-border/50 relative z-20 overflow-y-auto h-full fixed sm:static right-0 top-0 sm:relative"
              style={{ height: '100%', maxHeight: '100vh' }}
            >
              <EventDetail
                event={selectedEvent || mockEvent}
                onClose={() => setRightSidebarOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MapView;
