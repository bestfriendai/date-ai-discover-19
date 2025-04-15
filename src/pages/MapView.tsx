
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import EventsSidebar from '@/components/events/EventsSidebar';
import EventDetail from '@/components/events/EventDetail';
import MapComponent from '@/components/map/MapComponent';

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
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Function to handle event selection
  const handleEventSelect = (event: any) => {
    setSelectedEvent(event);
    setRightSidebarOpen(true);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Sidebar - Events List */}
        {leftSidebarOpen && (
          <div className="w-[380px] bg-card border-r border-border">
            <EventsSidebar 
              onClose={() => setLeftSidebarOpen(false)} 
              onEventSelect={handleEventSelect}
            />
          </div>
        )}
        
        {/* Main Map Area */}
        <div className="flex-1 relative">
          <MapComponent onEventSelect={handleEventSelect} />
          
          {/* Toggle button for left sidebar when closed */}
          {!leftSidebarOpen && (
            <button 
              onClick={() => setLeftSidebarOpen(true)}
              className="absolute top-4 left-4 z-10 bg-card rounded-md p-2 shadow-md"
            >
              <span className="sr-only">Open sidebar</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
          )}
        </div>
        
        {/* Right Sidebar - Event Details */}
        {rightSidebarOpen && (
          <div className="w-[400px] bg-card border-l border-border">
            <EventDetail 
              event={selectedEvent || mockEvent} 
              onClose={() => setRightSidebarOpen(false)} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
