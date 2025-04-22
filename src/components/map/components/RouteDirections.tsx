import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Navigation, Car, Bus, Bike, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteDirectionsProps {
  origin?: [number, number]; // [longitude, latitude]
  originName?: string;
  destination?: [number, number]; // [longitude, latitude]
  destinationName?: string;
  mapboxToken?: string;
  onClose?: () => void;
}

type TransportMode = 'driving' | 'walking' | 'cycling' | 'transit';

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver?: {
    type: string;
    modifier?: string;
  };
}

interface Route {
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
}

const RouteDirections: React.FC<RouteDirectionsProps> = ({
  origin,
  originName = 'Current Location',
  destination,
  destinationName = 'Destination',
  mapboxToken,
  onClose
}) => {
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch directions when transport mode or locations change
  useEffect(() => {
    if (!origin || !destination) return;

    // Use the provided token or fall back to the environment variable
    const token = mapboxToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError('Mapbox token is required for directions');
      return;
    }

    const fetchDirections = async () => {
      setLoading(true);
      setError(null);

      try {
        // Format coordinates for Mapbox Directions API
        const originStr = `${origin[0]},${origin[1]}`;
        const destinationStr = `${destination[0]},${destination[1]}`;

        // Build the API URL
        let url = `https://api.mapbox.com/directions/v5/mapbox/`;

        // Map our transport modes to Mapbox's profile IDs
        switch (transportMode) {
          case 'driving':
            url += 'driving/';
            break;
          case 'walking':
            url += 'walking/';
            break;
          case 'cycling':
            url += 'cycling/';
            break;
          case 'transit':
            // Mapbox doesn't directly support transit, fallback to walking
            url += 'walking/';
            break;
        }

        url += `${originStr};${destinationStr}`;
        url += `?steps=true&geometries=geojson&access_token=${token}`;
        url += '&overview=full&annotations=duration,distance,speed';

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error(data.message || 'No route found');
        }

        // Process the route data
        const routeData = data.routes[0];
        const steps = routeData.legs[0].steps.map((step: any) => ({
          instruction: step.maneuver.instruction || 'Continue',
          distance: step.distance,
          duration: step.duration,
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier
          }
        }));

        setRoute({
          distance: routeData.distance,
          duration: routeData.duration,
          steps
        });
      } catch (err) {
        console.error('Error fetching directions:', err);
        setError('Could not fetch directions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDirections();
  }, [origin, destination, transportMode, mapboxToken]);

  // Format duration in minutes and hours
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)} sec`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  };

  // Format distance in meters and kilometers
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Get icon for transport mode
  const getTransportIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'driving':
        return <Car className="h-4 w-4" />;
      case 'walking':
        return <Navigation className="h-4 w-4" />;
      case 'cycling':
        return <Bike className="h-4 w-4" />;
      case 'transit':
        return <Bus className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Directions</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="font-medium truncate">{originName}</div>
          <ArrowRight className="h-3 w-3 flex-shrink-0" />
          <div className="font-medium truncate">{destinationName}</div>
        </div>

        <div className="flex gap-2 mt-2">
          <Select value={transportMode} onValueChange={(value) => setTransportMode(value as TransportMode)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select transport mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="driving">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  <span>Driving</span>
                </div>
              </SelectItem>
              <SelectItem value="walking">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <span>Walking</span>
                </div>
              </SelectItem>
              <SelectItem value="cycling">
                <div className="flex items-center gap-2">
                  <Bike className="h-4 w-4" />
                  <span>Cycling</span>
                </div>
              </SelectItem>
              <SelectItem value="transit">
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4" />
                  <span>Transit</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-6 text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setTransportMode('driving')}>
              Try Driving Instead
            </Button>
          </div>
        ) : route ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getTransportIcon(transportMode)}
                <span className="font-medium">{formatDistance(route.distance)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(route.duration)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {route.steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 flex justify-center">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{step.instruction}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span>{formatDistance(step.distance)}</span>
                      <span>•</span>
                      <span>{formatDuration(step.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin?.[1]},${origin?.[0]}&destination=${destination?.[1]},${destination?.[0]}&travelmode=${transportMode === 'cycling' ? 'bicycling' : transportMode}`, '_blank')}>
                Open in Google Maps
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>Select a transport mode to see directions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RouteDirections;
