import React from 'react';

interface MapDebugOverlayProps {
  eventsCount: number;
  clustersCount: number;
  markersCount: number;
  isVisible?: boolean;
}

export const MapDebugOverlay: React.FC<MapDebugOverlayProps> = ({
  eventsCount,
  clustersCount,
  markersCount,
  isVisible = true
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="absolute top-4 right-4 z-20 bg-black/70 text-white text-xs p-2 rounded">
      <div className="flex flex-col gap-1">
        <div>Events: {eventsCount}</div>
        <div>Clusters: {clustersCount}</div>
        <div>Markers: {markersCount}</div>
      </div>
    </div>
  );
};
