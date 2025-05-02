import React from 'react';
import type { Event } from '@/types';

interface MapSidebarsProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedEvent: Event | null;
  events: Event[];
  isLoading: boolean;
  onLeftSidebarClose: () => void;
  onRightSidebarClose: () => void;
  onEventSelect: (event: Event | null) => void;
}

export const MapSidebars: React.FC<MapSidebarsProps> = ({
  leftSidebarOpen,
  rightSidebarOpen,
  selectedEvent,
  events,
  isLoading,
  onLeftSidebarClose,
  onRightSidebarClose,
  onEventSelect,
}) => {
  return (
    <>
      {/* Left Sidebar - Event List */}
      <div className={`fixed inset-y-0 left-0 z-20 w-80 bg-gray-900 transform transition-transform duration-300 ease-in-out ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold">Events</h2>
            <button 
              onClick={onLeftSidebarClose}
              className="p-2 rounded-full hover:bg-gray-800"
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
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
                          onError={(e) => {
                            // Fallback for broken images
                            (e.target as HTMLImageElement).src = '/event-default.png';
                          }}
                        />
                      </div>
                    )}
                    <h3 className="font-bold text-lg">{event.title}</h3>
                    <p className="text-sm text-gray-300">{event.date} {event.time}</p>
                    <p className="text-sm text-gray-400 mt-1">{event.location}</p>
                    
                    {event.isPartyEvent && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-purple-800 rounded-full text-xs">
                          Party
                        </span>
                      </div>
                    )}
                  </div>
                ))}
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
              aria-label="Close details"
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
                      onError={(e) => {
                        // Fallback for broken images
                        (e.target as HTMLImageElement).src = '/event-default.png';
                      }}
                    />
                  </div>
                )}
                
                <h2 className="text-2xl font-bold mb-2">{selectedEvent.title}</h2>
                
                {selectedEvent.isPartyEvent && (
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-purple-800 rounded-full text-sm">
                      Party Event
                    </span>
                    {selectedEvent.partySubcategory && (
                      <span className="inline-block px-3 py-1 bg-purple-700 rounded-full text-sm ml-2 capitalize">
                        {selectedEvent.partySubcategory.replace('-', ' ')}
                      </span>
                    )}
                  </div>
                )}
                
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
                    onClick={() => {
                      // Center map on event
                      if (selectedEvent.coordinates) {
                        // This would be handled by the parent component
                        console.log('Center on event:', selectedEvent.coordinates);
                      }
                    }}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Center on Map
                  </button>
                </div>
                
                {selectedEvent.source && (
                  <div className="mt-4 text-right text-xs text-gray-500">
                    Source: {selectedEvent.source}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Select an event to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
