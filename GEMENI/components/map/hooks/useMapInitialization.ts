import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from '../../../hooks/use-toast';
import PerformanceMonitor from '../../../utils/performanceMonitor';
import { getApiKey } from '@/config/env';
import { supabase } from '@/integrations/supabase/client';

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

        // First try to get the Mapbox token from Supabase function
        let mapboxToken = '';
        try {
          console.log('[MAP_DEBUG] Attempting to fetch Mapbox token from Supabase');
          const { data, error } = await supabase.functions.invoke('get-mapbox-token');
          
          if (error) {
            console.error('[MAP_DEBUG] Error fetching Mapbox token from Supabase:', error);
          } else if (data && data.token) {
            mapboxToken = data.token;
            console.log('[MAP_DEBUG] Successfully retrieved Mapbox token from Supabase function');
          }
        } catch (supabaseError) {
          console.error('[MAP_DEBUG] Exception when fetching Mapbox token:', supabaseError);
        }
        
        // If Supabase function failed, fall back to environment variable
        if (!mapboxToken) {
          console.log('[MAP_DEBUG] Falling back to environment variable for Mapbox token');
          mapboxToken = getApiKey('mapbox');
        }
        
        if (!mapboxToken) {
          console.warn('[MAP_DEBUG] No Mapbox token found, using fallback token');
          // Use a fallback token for both development and production
          // This is the DateAI Mapbox token that should work for basic functionality
          mapboxgl.accessToken = 'pk.eyJ1IjoiZGF0ZWFpIiwiYSI6ImNsczRxZnZ4ajAwYjQwMXF5MGlxbTF5d2wifQ.pLNnH8rzLZkgNY_aBJZrwg';

          // Show a warning toast to the user
          toast({
            title: "Using Default Mapbox Token",
            description: "Using a default Mapbox token. Some features may be limited.",
            variant: "default"
          });
        } else {
          console.log('[MAP_DEBUG] Using Mapbox token:', mapboxToken ? 'Set' : 'Not set');
          console.log('[MAP_DEBUG] Token length:', mapboxToken.length);
          console.log('[MAP_DEBUG] Token format valid:', mapboxToken.startsWith('pk.'));
          
          // Set the token
          try {
            mapboxgl.accessToken = mapboxToken;
            console.log('[MAP_DEBUG] Successfully set Mapbox token');
          } catch (tokenError) {
            console.error('[MAP_DEBUG] Error setting Mapbox token:', tokenError);
          }
        }

        // Create map with detailed error handling
        let newMap: mapboxgl.Map;
        try {
          console.log('[MAP_DEBUG] Creating new Mapbox map with style:', mapStyle);

          // Try with a simpler style first to test token validity
          const initialStyle = 'mapbox://styles/mapbox/streets-v12';
          console.log('[MAP_DEBUG] Using initial style:', initialStyle);

          // Create the map with proper type-safe options
          newMap = new mapboxgl.Map({
            container: mapContainer.current,
            style: initialStyle, // Start with a simple style
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom,
            pitch: viewState.pitch,
            bearing: viewState.bearing,
            attributionControl: false,
            antialias: true,
            // maxPitch is not in the type definitions but is a valid option
            // @ts-ignore
            maxPitch: 85,
            minZoom: 2,
            maxZoom: 20,
            preserveDrawingBuffer: true
          });

          // Add navigation control
          newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          // Add attribution control in bottom-right
          // Use proper type casting for AttributionControl
          newMap.addControl(new (mapboxgl as any).AttributionControl({
            compact: true
          }), 'bottom-right');

          // Add geolocate control
          newMap.addControl(
            new mapboxgl.GeolocateControl({
              positionOptions: {
                enableHighAccuracy: true
              },
              trackUserLocation: true,
              showUserHeading: true
            }),
            'top-right'
          );

          // Set the map in state
          if (isMounted) {
            setState(prev => ({ ...prev, map: newMap }));
          }

          // Listen for map load event
          newMap.on('load', () => {
            console.log('[MAP_DEBUG] Map loaded successfully');
            
            // Switch to the requested style after the map loads
            if (mapStyle !== initialStyle) {
              console.log('[MAP_DEBUG] Switching to requested style:', mapStyle);
              try {
                newMap.setStyle(mapStyle);
              } catch (styleError: any) {
                console.error('[MAP_DEBUG] Error setting map style:', styleError);
                // If custom style fails, fall back to a standard style
                try {
                  newMap.setStyle('mapbox://styles/mapbox/dark-v11');
                } catch (fallbackError: any) {
                  console.error('[MAP_DEBUG] Error setting fallback style:', fallbackError);
                }
              }
            }

            // Mark map as loaded
            if (isMounted) {
              setState(prev => ({ ...prev, mapLoaded: true }));
              onMapLoad();
            }

            PerformanceMonitor.endMeasure('mapInitialization', {
              mapLoaded: true,
              mapError: null
            });
          });

          // Handle map errors
          newMap.on('error', (e) => {
            console.error('[MAP_DEBUG] Map error:', e);
            if (isMounted) {
              setState(prev => ({ ...prev, mapError: `Map error: ${e.error?.message || 'Unknown error'}` }));
            }
          });

        } catch (mapError: any) {
          console.error('[MAP_DEBUG] Error creating Mapbox map:', mapError);
          if (isMounted) {
            setState(prev => ({ ...prev, mapError: `Failed to initialize map: ${mapError.message}` }));
          }

          PerformanceMonitor.endMeasure('mapInitialization', {
            mapLoaded: false,
            mapError: mapError.message
          });
        }
      } catch (error: any) {
        console.error('[MAP_DEBUG] Unexpected error in map initialization:', error);
        if (isMounted) {
          setState(prev => ({ ...prev, mapError: `Unexpected error: ${error.message}` }));
        }

        PerformanceMonitor.endMeasure('mapInitialization', {
          mapLoaded: false,
          mapError: error.message
        });
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      isMounted = false;
      if (state.map) {
        console.log('[MAP_DEBUG] Removing map on unmount');
        state.map.remove();
      }
    };
  }, [mapContainer, viewState.latitude, viewState.longitude, viewState.zoom, mapStyle, onMapLoad, skipInitialization]);

  return state;
};
