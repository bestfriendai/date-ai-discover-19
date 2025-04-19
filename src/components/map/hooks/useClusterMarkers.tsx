
import { useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

export function useClusterMarkers(map: mapboxgl.Map | null, events: Event[], zoomThreshold: number = 11) {
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [isClusterSourceInitialized, setIsClusterSourceInitialized] = useState(false);

  // Create GeoJSON from events
  const createGeoJSON = useCallback((eventList: Event[]) => {
    const validEvents = eventList.filter(event => 
      event.coordinates && 
      Array.isArray(event.coordinates) && 
      event.coordinates.length === 2
    );

    const features = validEvents.map(event => ({
      type: 'Feature' as const,
      properties: {
        id: event.id,
        title: event.title,
        category: event.category,
        date: event.date,
        image: event.image,
        price: event.price,
        location: event.location,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: event.coordinates as [number, number]
      }
    }));

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, []);

  // Handle clearing all cluster layers and sources
  const clearClusterLayers = useCallback(() => {
    if (!map) return;

    try {
      const layers = ['clusters', 'cluster-count', 'unclustered-point'];
      
      // Remove layers
      layers.forEach(layer => {
        if (map.getLayer(layer)) {
          // Use try-catch to handle potential errors with removeLayer
          try {
            // @ts-ignore - Type definition issue with mapbox-gl
            map.removeLayer(layer);
          } catch (e) {
            console.warn(`[useClusterMarkers] Error removing layer ${layer}:`, e);
          }
        }
      });

      // Remove source
      if (map.getSource('events')) {
        try {
          // @ts-ignore - Type definition issue with mapbox-gl
          map.removeSource('events');
        } catch (e) {
          console.warn('[useClusterMarkers] Error removing source:', e);
        }
      }

      setIsClusterSourceInitialized(false);
    } catch (e) {
      console.error('[useClusterMarkers] Error in clearClusterLayers:', e);
    }
  }, [map]);

  // Initialize the cluster source and layers
  const initializeClusterLayers = useCallback(() => {
    if (!map || !events.length || isClusterSourceInitialized) return;

    try {
      // Return if the map style isn't fully loaded
      if (!map.isStyleLoaded()) {
        map.once('style.load', initializeClusterLayers);
        return;
      }

      // Clear any existing layers and sources first
      clearClusterLayers();

      // Add cluster source
      map.addSource('events', {
        type: 'geojson',
        data: createGeoJSON(events),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster layers
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#8b5cf6', // Purple for small clusters
            10, 
            '#7c3aed', // Darker purple for medium clusters
            30, 
            '#6d28d9'  // Even darker for large clusters
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // Small
            10,
            25, // Medium
            30,
            30  // Large
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.5)',
          'circle-stroke-opacity': 0.8
        }
      });

      // Add cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 14,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add unclustered point layer
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            'music', '#3b82f6',      // blue
            'sports', '#22c55e',     // green
            'arts', '#ec4899',       // pink
            'family', '#eab308',     // yellow
            'food', '#f97316',       // orange
            'party', '#a855f7',      // purple
            '#6b7280'                // default gray
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'white',
          'circle-opacity': 0.9
        }
      });

      setIsClusterSourceInitialized(true);
      console.log('[useClusterMarkers] Cluster layers initialized');
    } catch (error) {
      console.error('[useClusterMarkers] Error initializing cluster layers:', error);
    }
  }, [map, events, createGeoJSON, clearClusterLayers, isClusterSourceInitialized]);

  // Update source data when events change
  useEffect(() => {
    if (!map || !events.length || !isClusterSourceInitialized) return;

    try {
      const source = map.getSource('events') as mapboxgl.GeoJSONSource;
      if (source && source.setData) {
        source.setData(createGeoJSON(events));
        console.log('[useClusterMarkers] Updated cluster source data');
      }
    } catch (error) {
      console.error('[useClusterMarkers] Error updating cluster source data:', error);
    }
  }, [map, events, createGeoJSON, isClusterSourceInitialized]);

  // Initialize or clean up when map or clustering option changes
  useEffect(() => {
    if (!map) return;

    if (clusteringEnabled) {
      initializeClusterLayers();
    } else {
      clearClusterLayers();
    }

    // Cleanup on unmount
    return () => {
      clearClusterLayers();
    };
  }, [map, clusteringEnabled, clearClusterLayers, initializeClusterLayers]);

  // Toggle clustering functionality
  const toggleClustering = useCallback(() => {
    setClusteringEnabled(prev => !prev);
  }, []);

  // Click handler for cluster expansion
  const handleClusterClick = useCallback((e: any) => {
    if (!map) return;

    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id;
    if (!clusterId) return;
    
    const source = map.getSource('events') as any;
    if (!source || !source.getClusterExpansionZoom) return;

    try {
      source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;

        map.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom + 0.5,
          duration: 500
        });
      });
    } catch (error) {
      console.error('[useClusterMarkers] Error expanding cluster:', error);
    }
  }, [map]);

  // Set up event handlers
  useEffect(() => {
    if (!map || !clusteringEnabled || !isClusterSourceInitialized) return;

    const handleCursorEnter = () => { 
      if (map.getCanvas) map.getCanvas().style.cursor = 'pointer';
    };
    
    const handleCursorLeave = () => { 
      if (map.getCanvas) map.getCanvas().style.cursor = '';
    };

    // Custom event handler for both clusters and points
    const handleMapClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (features.length) {
        handleClusterClick(e);
      }
    };

    try {
      // Add event listeners
      map.on('click', handleMapClick);
      
      // Add cursor interaction handlers
      map.on('mouseenter', handleCursorEnter);
      map.on('mouseleave', handleCursorLeave);
    } catch (e) {
      console.warn('[useClusterMarkers] Error setting up event handlers:', e);
    }

    // Return cleanup function
    return () => {
      try {
        map.off('click', handleMapClick);
        map.off('mouseenter', handleCursorEnter);
        map.off('mouseleave', handleCursorLeave);
      } catch (e) {
        console.warn('[useClusterMarkers] Error removing event handlers:', e);
      }
    };
  }, [map, clusteringEnabled, handleClusterClick, isClusterSourceInitialized]);

  return {
    clusteringEnabled,
    toggleClustering,
    isClusterSourceInitialized
  };
}
