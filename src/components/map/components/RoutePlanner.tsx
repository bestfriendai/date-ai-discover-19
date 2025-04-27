
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, Car, AlertCircle, CheckCircle } from '@/lib/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DistanceData } from './DistanceIndicator';

interface RoutePlannerProps {
  eventName: string;
  destinationCoordinates: [number, number];
  userCoordinates?: [number, number];
  onGetDirections: (mode: 'walking' | 'driving') => void;
  distanceData?: DistanceData;
}

export function RoutePlanner({
  eventName,
  destinationCoordinates,
  userCoordinates,
  onGetDirections,
  distanceData
}: RoutePlannerProps) {
  const [mode, setMode] = useState<'walking' | 'driving'>('driving');
  const [routeRequested, setRouteRequested] = useState(false);

  const handleGetDirections = () => {
    setRouteRequested(true);
    onGetDirections(mode);
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return 'Unknown';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="bg-background/90 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 p-4 w-full max-w-sm">
      <h3 className="font-semibold text-sm mb-3">Directions to {eventName}</h3>
      
      {!userCoordinates ? (
        <div className="flex items-center gap-2 p-3 bg-yellow-100/20 text-yellow-800 dark:text-yellow-400 rounded-md mb-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">Enable location to get directions</p>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex gap-3 mb-3">
            <Button 
              variant={mode === 'driving' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setMode('driving')}
            >
              <Car className="h-4 w-4" />
              Driving
              {distanceData && mode === 'driving' && (
                <span className="text-xs opacity-90">{formatTime(distanceData.duration)}</span>
              )}
            </Button>
            <Button 
              variant={mode === 'walking' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setMode('walking')}
            >
              <Navigation className="h-4 w-4" />
              Walking
              {distanceData && mode === 'walking' && (
                <span className="text-xs opacity-90">{formatTime(distanceData.duration)}</span>
              )}
            </Button>
          </div>
          
          {routeRequested ? (
            <div className="flex items-center gap-2 p-3 bg-green-100/20 text-green-800 dark:text-green-400 rounded-md">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs">Directions loaded!</p>
            </div>
          ) : (
            <Button 
              variant="default" 
              className="w-full justify-center"
              onClick={handleGetDirections}
            >
              Get Directions
            </Button>
          )}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
        <p className="mb-1">Destination: {destinationCoordinates.map(c => c.toFixed(5)).join(', ')}</p>
        {userCoordinates && (
          <p>Your location: {userCoordinates.map(c => c.toFixed(5)).join(', ')}</p>
        )}
      </div>
    </div>
  );
}
