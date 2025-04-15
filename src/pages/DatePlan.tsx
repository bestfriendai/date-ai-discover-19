
import { useState } from 'react';
import Header from '@/components/layout/Header';
import ItineraryList from '@/components/itinerary/ItineraryList';
import EmptyState from '@/components/shared/EmptyState';

const DatePlan = () => {
  // In a real app, this would come from an API or state management
  const [itineraries, setItineraries] = useState([]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex items-center">
              <div className="mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-primary"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Date Planner</h1>
                <p className="text-muted-foreground">Create your perfect date experience</p>
              </div>
            </div>
            
            {itineraries.length > 0 ? (
              <ItineraryList itineraries={itineraries} />
            ) : (
              <EmptyState 
                icon="heart"
                title="No favorite events yet"
                description="Save some events to your favorites first to create a custom date plan."
                actionLabel="Browse Events"
                actionHref="/map"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePlan;
