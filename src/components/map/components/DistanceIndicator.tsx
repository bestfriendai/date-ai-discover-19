import React from 'react';
import { CarIcon, NavigationIcon } from '@/lib/icons';

export interface DistanceData {
  distance: number; // distance in kilometers
  duration?: number; // duration in minutes (optional)
  mode?: 'walking' | 'driving';
}

interface DistanceIndicatorProps {
  data: DistanceData;
  userCoordinates?: [number, number];
  destinationCoordinates?: [number, number];
  className?: string;
}

export function DistanceIndicator({ 
  data,
  className = ''
}: DistanceIndicatorProps) {
  const { distance, duration, mode = 'driving' } = data;
  
  // Format distance for display
  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`; // Convert to meters if less than 1km
    } else if (km < 10) {
      return `${km.toFixed(1)} km`; // 1 decimal place for shorter distances
    } else {
      return `${Math.round(km)} km`; // Round to nearest km for longer distances
    }
  };
  
  // Format duration for display
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };
  
  return (
    <div className={`inline-flex items-center gap-1 text-xs font-medium bg-background/90 backdrop-blur-sm text-foreground px-2 py-1 rounded-full shadow-sm border border-border/50 ${className}`}>
      {mode === 'driving' ? (
        <CarIcon className="h-3 w-3 text-blue-500" />
      ) : (
        <NavigationIcon className="h-3 w-3 text-green-500" />
      )}
      <span>{formatDistance(distance)}</span>
      {duration && (
        <>
          <span className="text-muted-foreground mx-0.5">•</span>
          <span>{formatDuration(duration)}</span>
        </>
      )}
    </div>
  );
}
