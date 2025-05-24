
import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from '@/hooks/use-toast';
import { env } from '@/env.mjs';

interface MapState {
  map: mapboxgl.Map | null;
  mapError: string | null;
  mapLoaded: boolean;
}

export const useMapInitialization = (
  mapContainer: React.RefObject<HTMLDivElement>,
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  },
  mapStyle: string,
  onMapLoad: () => void
) => {
  const [state, setState] = useState<MapState>({
    map: null,
    mapError: null,
    mapLoaded: false
  });

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        if (typeof mapboxgl === 'undefined') {
          console.error('[MAP_DEBUG] CRITICAL: mapboxgl is undefined!');
          setState(prev => ({ ...prev, mapError: "Map library failed to load." }));
          return;
        }

        if (!mapContainer.current) {
          console.error('[MAP_DEBUG] Map container ref is null!');
          setState(prev => ({ ...prev, mapError: "Map container not found." }));
          return;
        }

        // Get Mapbox token from environment variables with validation
        let mapboxToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;
        
        console.log('[MAP_DEBUG] Token check:', {
          tokenExists: !!mapboxToken,
          tokenLength: mapboxToken?.length || 0,
          tokenPrefix: mapboxToken?.substring(0, 3) || 'none'
        });

        // Validate token format
        if (!mapboxToken || !mapboxToken.startsWith('pk.')) {
          console.warn('[MAP_DEBUG] Invalid or missing Mapbox token');
          setState(prev => ({ 
            ...prev, 
            mapError: "Invalid Mapbox token. Please check your configuration and add a valid Mapbox access token." 
          }));
          
          toast({
            title: "Map Configuration Error",
            description: "Mapbox access token is missing or invalid. Please add a valid token to use the map.",
            variant: "destructive"
          });
          return;
        }

        console.log('[MAP_DEBUG] Setting Mapbox token and initializing map');
        mapboxgl.accessToken = mapboxToken;

        // Verify the token is set correctly
        if (!mapboxgl.accessToken || mapboxgl.accessToken !== mapboxToken) {
          console.error('[MAP_DEBUG] Failed to set Mapbox token correctly');
          setState(prev => ({ ...prev, mapError: "Failed to configure Mapbox access token." }));
          return;
        }

        const newMap = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyle,
          center: [viewState.longitude, viewState.latitude],
          zoom: viewState.zoom,
          pitch: viewState.pitch,
          bearing: viewState.bearing,
          attributionControl: false,
          preserveDrawingBuffer: true,
          fadeDuration: 0,
          maxZoom: 18,
          minZoom: 2,
          trackResize: true,
          antialias: false
        });

        newMap.on('load', () => {
          if (!isMounted) return;
          console.log('[MAP_DEBUG] Map load event fired');
          setState(prev => ({ ...prev, mapLoaded: true }));
          onMapLoad();
        });

        newMap.on('error', (e: any) => {
          console.error('[MAP_DEBUG] Mapbox specific error:', e);
          const errorMessage = e.error ? e.error.message : 'Unknown map error';
          
          // Check for token-related errors specifically
          if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('unauthorized')) {
            setState(prev => ({ 
              ...prev, 
              mapError: 'Invalid Mapbox access token. Please check your token and try again.' 
            }));
            
            toast({
              title: "Mapbox Token Error",
              description: "The Mapbox access token is invalid or expired. Please update your token.",
              variant: "destructive"
            });
          } else {
            setState(prev => ({ ...prev, mapError: `Map error: ${errorMessage}` }));
          }
        });

        try {
          newMap.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
          newMap.addControl(
            new mapboxgl.GeolocateControl({
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: true,
              showUserHeading: true
            }),
            'bottom-right'
          );
        } catch (controlError) {
          console.error('[MAP] Error adding map controls:', controlError);
        }

        setState(prev => ({ ...prev, map: newMap }));

      } catch (error: any) {
        if (!isMounted) return;

        const errorMessage = error instanceof Error
          ? `Map initialization failed: ${error.message}`
          : "Map initialization failed. Could not load the map.";

        console.error('[MAP_DEBUG] Map initialization error:', error);
        setState(prev => ({ ...prev, mapError: errorMessage }));
        
        toast({
          title: "Map initialization failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (state.map) {
        state.map.remove();
      }
    };
  }, [mapContainer, mapStyle, viewState, onMapLoad]);

  return state;
};
