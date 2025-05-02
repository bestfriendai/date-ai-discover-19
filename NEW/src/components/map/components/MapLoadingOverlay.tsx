import React from 'react';

interface MapLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const MapLoadingOverlay: React.FC<MapLoadingOverlayProps> = ({
  isLoading,
  message = 'Loading map...'
}) => {
  if (!isLoading) return null;
  
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg">{message}</p>
      </div>
    </div>
  );
};
