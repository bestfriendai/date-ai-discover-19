import React from 'react';

const WelcomeHeader: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center">
      <div className="bg-gray-900 bg-opacity-90 p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-2xl font-bold mb-4">Welcome to DateAI</h2>
        <p className="mb-6">
          Discover events and parties happening around you. Use the search button in the top left or click "Find My Location" to get started.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => {
              // This would trigger the location search
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    console.log('Location found:', position.coords);
                    // This would be handled by the parent component
                  },
                  (error) => {
                    console.error('Error getting location:', error);
                  }
                );
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Find My Location
          </button>
          <button
            onClick={() => {
              // This would open the search panel
              console.log('Open search panel');
              // This would be handled by the parent component
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Search Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
