import React, { useState } from 'react';
import type { Event, EventFilters } from '@/types';

interface MapDebugOverlayProps {
  events: Event[];
  mapLoaded: boolean;
  mapError: string | null;
  viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  filters: EventFilters;
}

export const MapDebugOverlay: React.FC<MapDebugOverlayProps> = ({
  events,
  mapLoaded,
  mapError,
  viewState,
  filters,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Only show in development mode
  if (import.meta.env.PROD) return null;
  
  return (
    <div className="absolute bottom-4 left-4 z-50">
      <div className="bg-gray-900 bg-opacity-90 rounded-lg shadow-lg text-xs overflow-hidden">
        <div 
          className="p-2 bg-gray-800 cursor-pointer flex justify-between items-center"
          onClick={() => setExpanded(!expanded)}
        >
          <span>Debug Info {mapError ? '(Error)' : ''}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {expanded && (
          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {/* Map Status */}
            <div>
              <div className="font-semibold">Map Status:</div>
              <div className="pl-2">
                <div>Loaded: {mapLoaded ? 'Yes' : 'No'}</div>
                {mapError && <div className="text-red-500">Error: {mapError}</div>}
              </div>
            </div>
            
            {/* View State */}
            <div>
              <div className="font-semibold">View State:</div>
              <div className="pl-2">
                <div>Lat: {viewState.latitude.toFixed(6)}</div>
                <div>Lng: {viewState.longitude.toFixed(6)}</div>
                <div>Zoom: {viewState.zoom.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Filters */}
            <div>
              <div className="font-semibold">Filters:</div>
              <div className="pl-2">
                <div>Categories: {filters.categories?.join(', ') || 'None'}</div>
                <div>Keyword: {filters.keyword || 'None'}</div>
                <div>Location: {filters.location || 'None'}</div>
                <div>Radius: {filters.radius || 'Default'}</div>
                <div>Date Range: {
                  filters.dateRange?.from 
                    ? `${filters.dateRange.from.toLocaleDateString()} - ${filters.dateRange.to?.toLocaleDateString() || 'None'}`
                    : 'None'
                }</div>
              </div>
            </div>
            
            {/* Events */}
            <div>
              <div className="font-semibold">Events:</div>
              <div className="pl-2">
                <div>Count: {events.length}</div>
                <div>Party Events: {events.filter(e => e.isPartyEvent).length}</div>
                <div>With Coordinates: {events.filter(e => e.coordinates).length}</div>
                <div>Sources: {
                  Object.entries(
                    events.reduce((acc, event) => {
                      const source = event.source || 'unknown';
                      acc[source] = (acc[source] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([source, count]) => `${source} (${count})`).join(', ')
                }</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
