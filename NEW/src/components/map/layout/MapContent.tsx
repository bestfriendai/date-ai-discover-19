import React from 'react';
import MapComponent from '../MapComponent';
import type { Event, EventFilters } from '@/types';

interface MapContentProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedEvent: Event | null;
  showSearch: boolean;
  mapHasMoved: boolean;
  mapLoaded: boolean;
  events: Event[];
  isEventsLoading: boolean;
  filters: any;
  hasMoreEvents?: boolean;
  totalEvents?: number;
  onLeftSidebarClose: () => void;
  onLeftSidebarToggle: () => void;
  onRightSidebarClose: () => void;
  onShowSearchToggle: () => void;
  onEventSelect: (event: Event | null) => void;
  onAdvancedSearch: (filters: any) => void;
  onSearchThisArea: () => void;
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void;
  onFetchEvents: (filters: any, coords: { latitude: number; longitude: number }, radius?: number) => void;
  onLoadMore: () => void;
  onAddToPlan: (event: Event) => void;
}

export const MapContent: React.FC<MapContentProps> = ({
  leftSidebarOpen,
  rightSidebarOpen,
  selectedEvent,
  showSearch,
  mapHasMoved,
  mapLoaded,
  events,
  isEventsLoading,
  filters,
  hasMoreEvents = false,
  totalEvents = 0,
  onLeftSidebarClose,
  onLeftSidebarToggle,
  onRightSidebarClose,
  onShowSearchToggle,
  onEventSelect,
  onAdvancedSearch,
  onSearchThisArea,
  onMapMoveEnd,
  onMapLoad,
  onFetchEvents,
  onLoadMore,
  onAddToPlan,
}) => {
  return (
    <>
      {/* Left Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-20 w-80 bg-gray-900 transform transition-transform duration-300 ease-in-out ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold">Events</h2>
            <button 
              onClick={onLeftSidebarClose}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isEventsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-4">
                {events.map(event => (
                  <div 
                    key={event.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedEvent?.id === event.id ? 'bg-blue-900' : 'bg-gray-800 hover:bg-gray-700'}`}
                    onClick={() => onEventSelect(event)}
                  >
                    {event.image && (
                      <div className="mb-2 rounded overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title} 
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-bold text-lg">{event.title}</h3>
                    <p className="text-sm text-gray-300">{event.date} {event.time}</p>
                    <p className="text-sm text-gray-400 mt-1">{event.location}</p>
                  </div>
                ))}
                
                {hasMoreEvents && (
                  <button
                    onClick={onLoadMore}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Load More
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No events found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your search filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Event Details */}
      <div className={`fixed inset-y-0 right-0 z-20 w-80 bg-gray-900 transform transition-transform duration-300 ease-in-out ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold">Event Details</h2>
            <button 
              onClick={onRightSidebarClose}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {selectedEvent ? (
              <div>
                {selectedEvent.image && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={selectedEvent.image} 
                      alt={selectedEvent.title} 
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                
                <h2 className="text-2xl font-bold mb-2">{selectedEvent.title}</h2>
                
                <div className="mb-4">
                  <div className="flex items-center text-gray-300 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span>{selectedEvent.date} {selectedEvent.time}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>
                
                {selectedEvent.description && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-300">{selectedEvent.description}</p>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  {selectedEvent.url && (
                    <a 
                      href={selectedEvent.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors"
                    >
                      Event Website
                    </a>
                  )}
                  
                  <button 
                    onClick={() => onAddToPlan(selectedEvent)}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Add to Plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Select an event to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <MapComponent
          onEventSelect={onEventSelect}
          onLoadingChange={() => {}}
          events={events}
          selectedEvent={selectedEvent}
          isLoading={isEventsLoading}
          filters={filters}
          mapLoaded={mapLoaded}
          onMapMoveEnd={onMapMoveEnd}
          onMapLoad={onMapLoad}
          onFetchEvents={onFetchEvents}
          onAddToPlan={onAddToPlan}
        />

        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-10 flex space-x-2">
          <button
            onClick={onLeftSidebarToggle}
            className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <button
            onClick={onShowSearchToggle}
            className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Search This Area Button */}
        {mapHasMoved && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <button
              onClick={onSearchThisArea}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg"
            >
              Search This Area
            </button>
          </div>
        )}

        {/* Event Count */}
        <div className="absolute bottom-4 left-4 z-10 bg-gray-900 py-1 px-3 rounded-full text-sm">
          {isEventsLoading ? (
            <span>Loading...</span>
          ) : (
            <span>{events.length} events found</span>
          )}
        </div>
      </div>
    </>
  );
};
