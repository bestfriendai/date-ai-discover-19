import React, { useState } from 'react';
import { EventFilters } from '@/types';

interface MapControlsAreaProps {
  leftSidebarOpen: boolean;
  showSearch: boolean;
  isEventsLoading: boolean;
  filters: EventFilters;
  onLeftSidebarToggle: () => void;
  onSearchToggle: () => void;
  onSearch: (filters: EventFilters) => void;
  onSearchThisArea: () => void;
  mapHasMoved: boolean;
  hasMoreEvents: boolean;
  totalEvents: number;
  loadedEvents: number;
  onLoadMore: () => void;
}

export const MapControlsArea: React.FC<MapControlsAreaProps> = ({
  leftSidebarOpen,
  showSearch,
  isEventsLoading,
  filters,
  onLeftSidebarToggle,
  onSearchToggle,
  onSearch,
  onSearchThisArea,
  mapHasMoved,
  hasMoreEvents,
  totalEvents,
  loadedEvents,
  onLoadMore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLocation, setSearchLocation] = useState(filters.location || '');
  const [searchRadius, setSearchRadius] = useState(filters.radius || 30);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      ...filters,
      keyword: searchTerm,
      location: searchLocation,
      radius: searchRadius
    });
  };

  return (
    <>
      {/* Top Controls */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <button
          onClick={onLeftSidebarToggle}
          className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors shadow-lg"
          aria-label={leftSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <button
          onClick={onSearchToggle}
          className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors shadow-lg"
          aria-label={showSearch ? "Hide search" : "Show search"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="absolute top-16 left-4 z-10 bg-gray-900 p-4 rounded-lg shadow-lg w-80">
          <form onSubmit={handleSearch}>
            <div className="space-y-3">
              <div>
                <label htmlFor="searchTerm" className="block text-sm font-medium mb-1">
                  Keyword
                </label>
                <input
                  id="searchTerm"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for events"
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="searchLocation" className="block text-sm font-medium mb-1">
                  Location
                </label>
                <input
                  id="searchLocation"
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="City, state, or address"
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="searchRadius" className="block text-sm font-medium mb-1">
                  Radius (miles)
                </label>
                <input
                  id="searchRadius"
                  type="number"
                  min="1"
                  max="100"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={isEventsLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEventsLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search This Area Button */}
      {mapHasMoved && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={onSearchThisArea}
            disabled={isEventsLoading}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEventsLoading ? 'Searching...' : 'Search This Area'}
          </button>
        </div>
      )}

      {/* Load More Button */}
      {hasMoreEvents && !isEventsLoading && (
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={onLoadMore}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg"
          >
            Load More Events
          </button>
        </div>
      )}

      {/* Event Count */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900 py-1 px-3 rounded-full text-sm">
        {isEventsLoading ? (
          <span>Loading...</span>
        ) : (
          <span>{loadedEvents} events found</span>
        )}
      </div>
    </>
  );
};
