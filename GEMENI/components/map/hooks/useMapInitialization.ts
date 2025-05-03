import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from '../../../hooks/use-toast';
import PerformanceMonitor from '../../../utils/performanceMonitor';

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
  skipInitialization: boolean = false // Add option to skip initialization
) => {
  const [state, setState] = useState<MapState>({
    map: null,
    mapError: null,
    mapLoaded: false
  });

  useEffect(() => {
    let isMounted = true;

    // If skipInitialization is true, don't initialize Mapbox
    if (skipInitialization) {
      console.log('[MAP_DEBUG] Skipping Mapbox initialization as requested');
      return () => { isMounted = false; };
    }

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

        // Use the Mapbox token from our API key manager
        console.log('[MAP_DEBUG] Setting Mapbox token and initializing map');

        // Import the API key manager
        const { getApiKeySync, getApiKey, setApiKey } = await import('@/utils/apiKeyManager');

        // Try to get the token synchronously first (from cache)
        let mapboxToken = getApiKeySync('mapbox');

        // If not found in cache, try to get it asynchronously
        if (!mapboxToken) {
          console.log('[MAP_DEBUG] Mapbox token not found in cache, fetching asynchronously');
          try {
            mapboxToken = await getApiKey('mapbox');
          } catch (error) {
            console.error('[MAP_DEBUG] Error fetching Mapbox token:', error);
          }
        }

        // If still no token, try to use a fallback token
        if (!mapboxToken) {
          console.warn('[MAP_DEBUG] No Mapbox token found, using fallback token');
          // Use a fallback token for both development and production
          // This is a public Mapbox token that should work for basic functionality
          mapboxToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

          // Save this token to the cache so we don't have to fetch it again
          setApiKey('mapbox', mapboxToken);

          // Show a warning toast to the user
          toast({
            title: "Using Default Mapbox Token",
            description: "Using a default Mapbox token. Some features may be limited.",
            variant: "warning"
          });
        }

        console.log('[MAP_DEBUG] Using Mapbox token:', mapboxToken);
        console.log('[MAP_DEBUG] Token length:', mapboxToken.length);
        console.log('[MAP_DEBUG] Token format valid:', mapboxToken.startsWith('pk.'));

        // Set the token
        try {
          mapboxgl.accessToken = mapboxToken;
          console.log('[MAP_DEBUG] Successfully set Mapbox token');
        } catch (tokenError) {
          console.error('[MAP_DEBUG] Error setting Mapbox token:', tokenError);
        }

        // Create map with detailed error handling
        let newMap: mapboxgl.Map;
        try {
          console.log('[MAP_DEBUG] Creating new Mapbox map with style:', mapStyle);

          // Try with a simpler style first to test token validity
          const initialStyle = 'mapbox://styles/mapbox/streets-v12';
          console.log('[MAP_DEBUG] Using initial style:', initialStyle);

          newMap = new mapboxgl.Map({
            container: mapContainer.current,
            style: initialStyle, // Start with a simple style
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

          console.log('[MAP_DEBUG] Successfully created Mapbox map instance');
        } catch (mapError) {
          console.error('[MAP_DEBUG] Critical error creating Mapbox map:', mapError);

          // Show detailed error to user
          toast({
            title: "Map Creation Failed",
            description: `Error: ${mapError instanceof Error ? mapError.message : String(mapError)}`,
            variant: "destructive"
          });

          setState(prev => ({
            ...prev,
            mapError: `Failed to create map: ${mapError instanceof Error ? mapError.message : String(mapError)}`
          }));

          throw mapError; // Re-throw to be caught by the outer try-catch
        }

        newMap.on('load', () => {
          if (!isMounted) return;
          console.log('[MAP_DEBUG] Map load event fired');
          setState(prev => ({ ...prev, mapLoaded: true }));
          onMapLoad();
        });

        newMap.on('error', (e: any) => {
          console.error('[MAP_DEBUG] Mapbox specific error:', e);

          // Handle Mapbox errors more specifically
          if (e.error && e.error.message.includes('access token')) {
            console.error('[MAP_DEBUG] Mapbox access token error:', e.error.message);

            // Try to use a fallback token - this is a public Mapbox token that should work for basic functionality
            const fallbackToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';
            console.warn('[MAP_DEBUG] Trying fallback Mapbox token');

            // Clear any existing token from the cache
            import('@/utils/apiKeyManager').then(({ clearApiKey, setApiKey }) => {
              clearApiKey('mapbox');
              // Set the new fallback token
              setApiKey('mapbox', fallbackToken);
            });

            // Set the token directly on mapboxgl
            mapboxgl.accessToken = fallbackToken;

            // Reload the map with the new token
            try {
              newMap.setStyle(mapStyle);
              console.log('[MAP_DEBUG] Successfully reloaded map style with fallback token');
            } catch (styleError) {
              console.error('[MAP_DEBUG] Error reloading map style:', styleError);
              // Try a more basic style as a last resort
              try {
                newMap.setStyle('mapbox://styles/mapbox/streets-v12');
              } catch (basicStyleError) {
                console.error('[MAP_DEBUG] Failed to load basic style:', basicStyleError);
              }
            }

            toast({
              title: "Mapbox Token Issue",
              description: "Using a fallback Mapbox token. Some features may be limited.",
              variant: "warning"
            });
          } else if (e.error && e.error.message.includes('style')) {
            console.error('[MAP_DEBUG] Mapbox style error:', e.error.message);

            // Try to switch to a default style
            try {
              newMap.setStyle('mapbox://styles/mapbox/streets-v12');
              console.log('[MAP_DEBUG] Successfully switched to streets style');

              toast({
                title: "Mapbox Style Error",
                description: "There was an issue loading the map style. Using a default style instead.",
                variant: "warning"
              });
            } catch (styleError) {
              console.error('[MAP_DEBUG] Error switching to default style:', styleError);

              // Try an even more basic style
              try {
                newMap.setStyle('mapbox://styles/mapbox/basic-v9');
                console.log('[MAP_DEBUG] Successfully switched to basic style');
              } catch (basicStyleError) {
                console.error('[MAP_DEBUG] Failed to load basic style:', basicStyleError);

                toast({
                  title: "Mapbox Style Error",
                  description: "Could not load any map styles. Please check your internet connection.",
                  variant: "destructive"
                });
              }
            }
          } else {
            // Handle other Mapbox errors
            console.error('[MAP_DEBUG] Unhandled Mapbox error:', e.error?.message || 'Unknown error');

            toast({
              title: "Map Error",
              description: "An error occurred with the map. Some features may not work correctly.",
              variant: "destructive"
            });
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
  }, [mapContainer, mapStyle, viewState, onMapLoad, skipInitialization]);

  return state;
};
