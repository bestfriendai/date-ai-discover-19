import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from '../../../hooks/use-toast';
import PerformanceMonitor from '../../../utils/performanceMonitor';
import { getApiKey } from '../../../config/env';

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

        // For OpenStreetMap style, we don't need a Mapbox token
        // But we'll set it to an empty string to avoid Mapbox GL JS warnings
        console.log('[MAP_DEBUG] Setting Mapbox token and initializing map');
        mapboxgl.accessToken = ''; // Empty string for OpenStreetMap style

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
          // Log the error but don't set it in state to prevent blocking the map
          // We'll show a warning instead of an error
          if (e.error && e.error.message.includes('access token')) {
            setState(prev => ({ ...prev, mapError: 'Using OpenStreetMap tiles with limited features' }));
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
