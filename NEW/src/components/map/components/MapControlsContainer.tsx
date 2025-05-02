import React, { useState } from 'react';
import type { EventFilters } from '@/types';

interface MapControlsContainerProps {
  mapLoaded: boolean;
  viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  filters: EventFilters;
  currentMapStyle: string;
  locationRequested: boolean;
  onLocationSearch: (location: string) => void;
  onMapStyleChange: (style: string) => void;
  onFindMyLocation: () => void;
}

export const MapControlsContainer: React.FC<MapControlsContainerProps> = ({
  mapLoaded,
  viewState,
  filters,
  currentMapStyle,
  locationRequested,
  onLocationSearch,
  onMapStyleChange,
  onFindMyLocation,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onLocationSearch(searchInput.trim());
    }
  };
  
  const mapStyles = {
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    streets: 'mapbox://styles/mapbox/streets-v12'
  };
  
  // Get current style name
  const getCurrentStyleName = () => {
    const entry = Object.entries(mapStyles).find(([_, url]) => url === currentMapStyle);
    return entry ? entry[0] : 'dark';
  };
  
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
      {/* Search Box */}
      <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <form onSubmit={handleSearchSubmit} className="flex">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search location..."
            className="p-2 bg-gray-800 text-white w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>
      </div>
      
      {/* Map Controls */}
      <div className="flex space-x-2">
        {/* Find My Location */}
        <button
          onClick={onFindMyLocation}
          disabled={locationRequested || !mapLoaded}
          className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50"
          aria-label="Find my location"
        >
          {locationRequested ? (
            <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
        
        {/* Map Style */}
        <div className="relative">
          <button
            onClick={() => setShowStyleOptions(!showStyleOptions)}
            className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors shadow-lg"
            aria-label="Change map style"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
          
          {showStyleOptions && (
            <div className="absolute right-0 mt-2 bg-gray-900 rounded-lg shadow-lg overflow-hidden w-32">
              {Object.entries(mapStyles).map(([name, url]) => (
                <button
                  key={name}
                  onClick={() => {
                    onMapStyleChange(url);
                    setShowStyleOptions(false);
                  }}
                  className={`w-full text-left p-2 hover:bg-gray-800 transition-colors capitalize ${
                    getCurrentStyleName() === name ? 'bg-blue-900' : ''
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Coordinates Display */}
      {mapLoaded && (
        <div className="bg-gray-900 py-1 px-2 rounded-lg text-xs">
          {viewState.latitude.toFixed(6)}, {viewState.longitude.toFixed(6)} | Zoom: {viewState.zoom.toFixed(1)}
        </div>
      )}
    </div>
  );
};
