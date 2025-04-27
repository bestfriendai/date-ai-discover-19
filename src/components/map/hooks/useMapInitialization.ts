import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from '@/hooks/use-toast';
import PerformanceMonitor from '@/utils/performanceMonitor';
import errorReporter from '@/utils/errorReporter';

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
  onMapLoad: () => void,
  mapboxToken: string | null // Accept token as prop
) => {
  const [state, setState] = useState<MapState>({
    map: null,
    mapError: null,
    mapLoaded: false
  });
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null); // Use ref for map instance
  const initializationAttempted = useRef(false);
  const tokenRef = useRef<string | null>(null); // Store token in ref to track changes

  useEffect(() => {
    let isMounted = true;

    // Prevent initialization if container is not ready or token is missing
    if (!mapContainer.current) {
      console.log('[MAP_INIT] Map container ref not ready.');
      return;
    }
    
    // Check if token is valid and different from previous token
    if (!mapboxToken) {
      console.log('[MAP_INIT] Mapbox token not available.');
      setState(prev => ({ ...prev, mapError: 'Map token configuration error. Cannot load map.' }));
      return; // Don't proceed without a token
    }

    // If token hasn't changed and map exists, no need to reinitialize
    if (tokenRef.current === mapboxToken && mapInstanceRef.current) {
      console.log('[MAP_INIT] Token unchanged and map exists, skipping reinitialization.');
      return;
    }

    // Store new token
    tokenRef.current = mapboxToken;

    // Clean up previous map instance if it exists
    if (mapInstanceRef.current) {
      try {
        console.log('[MAP_INIT] Removing previous map instance before reinitializing.');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      } catch (error) {
        console.error('[MAP_INIT] Error removing previous map:', error);
      }
    }

    initializationAttempted.current = true;
    console.log('[MAP_INIT] Starting map initialization with token:', mapboxToken.substring(0, 8) + '...');

    PerformanceMonitor.startMeasure('mapInitialization', {
      initialViewState: { ...viewState },
      mapStyle,
      hasToken: true
    });

    try {
      // Validate token format (basic check)
      if (!mapboxToken.startsWith('pk.') && !mapboxToken.startsWith('sk.')) {
        console.warn('[MAP_INIT] WARNING: Token does not start with expected prefix (pk. or sk.)');
      }

      console.log('[MAP_INIT] Setting Mapbox token.');
      mapboxgl.accessToken = mapboxToken;

      console.log('[MAP_INIT] Creating map instance...');
      const map = new mapboxgl.Map({
        container: mapContainer.current!,
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
        antialias: false,
        transformRequest: (url, resourceType) => {
          // Log resource loading for debugging
          if (resourceType === 'Style' || resourceType === 'Source') {
            console.log(`[MAP_INIT] Loading ${resourceType}: ${url.split('?')[0]}`);
          }
          return { url };
        }
      });

      mapInstanceRef.current = map; // Store instance in ref

      // Set a timeout to detect if the map is taking too long to load
      const loadTimeoutId = setTimeout(() => {
        if (isMounted && !state.mapLoaded) {
          console.warn('[MAP_INIT] Map load timeout - map is taking longer than expected to initialize.');
          // Don't set error state yet, just log a warning
        }
      }, 10000); // 10 second timeout

      map.on('load', () => {
        clearTimeout(loadTimeoutId);
        if (!isMounted) return;
        
        console.log('[MAP_INIT] Map "load" event fired successfully.');
        setState(prev => ({ ...prev, mapLoaded: true, mapError: null, map })); // Update state with map instance
        onMapLoad();
        PerformanceMonitor.endMeasure('mapInitialization', { 
          success: true,
          loadTime: performance.now()
        });
      });

      map.on('error', (e: any) => {
        if (!isMounted) return;
        const errorMessage = e.error?.message || 'Unknown map error';
        console.error('[MAP_INIT] Mapbox specific error:', errorMessage, e);
        errorReporter('[MAP_INIT] Mapbox error event:', { error: errorMessage, details: e });
        
        setState(prev => ({ 
          ...prev, 
          mapError: `Map error: ${errorMessage}. This might be due to network issues or an invalid map configuration.` 
        }));
        
        PerformanceMonitor.endMeasure('mapInitialization', { 
          success: false, 
          error: errorMessage,
          errorType: 'mapbox_error_event'
        });
      });

      // Add a style load error handler
      map.on('styledata', () => {
        if (!isMounted) return;
        
        // Check if style loaded successfully
        if (map.isStyleLoaded()) {
          console.log('[MAP_INIT] Map style loaded successfully.');
        } else {
          console.warn('[MAP_INIT] Style may not have loaded completely.');
        }
      });

      try {
        console.log('[MAP_INIT] Adding map controls...');
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
          }),
          'bottom-right'
        );
        console.log('[MAP_INIT] Map controls added successfully.');
      } catch (controlError) {
        console.error('[MAP_INIT] Error adding map controls:', controlError);
        errorReporter('[MAP_INIT] Control error:', controlError);
        // Don't fail the whole map for control errors
      }

    } catch (error: any) {
      if (!isMounted) return;
      
      const errorMessage = error instanceof Error 
        ? `Map initialization failed: ${error.message}` 
        : "Unknown map initialization error.";
      
      console.error('[MAP_INIT] Map initialization error:', error);
      errorReporter('[MAP_INIT] Initialization error:', { error, stack: error?.stack });
      
      setState(prev => ({ ...prev, mapError: errorMessage }));
      
      toast({
        title: "Map Initialization Failed",
        description: "There was a problem loading the map. Please try refreshing the page.",
        variant: "destructive",
        duration: 8000
      });
      
      PerformanceMonitor.endMeasure('mapInitialization', {
        success: false, 
        error: errorMessage,
        errorType: 'initialization_exception'
      });
    }

    return () => {
      isMounted = false;
      console.log('[MAP_INIT] Cleaning up map instance.');
      
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          console.log('[MAP_INIT] Map instance removed successfully.');
        } catch (removeError) {
          console.error('[MAP_INIT] Error removing map during cleanup:', removeError);
          errorReporter('[MAP_INIT] Cleanup error:', removeError);
        }
        mapInstanceRef.current = null;
        setState({ map: null, mapError: null, mapLoaded: false }); // Reset state on cleanup
      }
    };
  }, [mapContainer, mapboxToken, mapStyle, onMapLoad]); // Remove viewState from dependencies to prevent unnecessary reinits

  // Return the state, potentially including the map instance once loaded
  return state;
};
