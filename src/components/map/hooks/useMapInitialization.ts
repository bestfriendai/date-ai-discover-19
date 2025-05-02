
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PerformanceMonitor from '@/utils/performanceMonitor';

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
      PerformanceMonitor.startMeasure('mapInitialization', {
        initialViewState: { ...viewState }
      });

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

        // Try to fetch token from Supabase function
        let mapboxToken;
        try {
          console.log('[MAP_DEBUG] Attempting to fetch Mapbox token from Supabase');
          const { data, error } = await supabase.functions.invoke('get-mapbox-token');

          if (error) {
            console.error('[MAP_DEBUG] Error fetching Mapbox token from Supabase:', error);
            throw error;
          }

          if (data && data.MAPBOX_TOKEN) {
            console.log('[MAP_DEBUG] Successfully retrieved Mapbox token from Supabase');
            mapboxToken = data.MAPBOX_TOKEN;
          } else {
            console.warn('[MAP_DEBUG] No token returned from Supabase function');
            throw new Error('No token returned from server');
          }
        } catch (tokenError) {
          console.warn('[MAP_DEBUG] Falling back to default token:', tokenError);
          // Fallback to environment variables, window variable, or hardcoded value
          if (import.meta.env.VITE_MAPBOX_TOKEN) {
            console.log('[MAP_DEBUG] Using Mapbox token from environment variables');
            mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
          }
          else if ((window as any).FALLBACK_MAPBOX_TOKEN) {
            console.log('[MAP_DEBUG] Using fallback Mapbox token from window');
            mapboxToken = (window as any).FALLBACK_MAPBOX_TOKEN;
          }
          else {
            console.log('[MAP_DEBUG] Using hardcoded Mapbox token');
            mapboxToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';
          }
        }

        // Validate token format (basic check)
        if (!mapboxToken.startsWith('pk.')) {
          console.warn('[MAP_DEBUG] Warning: Mapbox token does not start with expected prefix (pk.)');
        }

        console.log('[MAP_DEBUG] Setting Mapbox token and initializing map');
        mapboxgl.accessToken = mapboxToken;

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
          setState(prev => ({ ...prev, mapError: `Map error: ${errorMessage}` }));
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

        PerformanceMonitor.endMeasure('mapInitialization', {
          success: false,
          error: errorMessage,
          errorType: error.name || 'Unknown Error',
          browserInfo: navigator.userAgent
        });
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      state.map?.remove();
    };
  }, [mapContainer, mapStyle, viewState, onMapLoad]);

  return state;
};
