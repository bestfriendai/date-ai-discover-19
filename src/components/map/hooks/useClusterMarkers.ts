// src/components/map/hooks/useClusterMarkers.tsx
import { useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types'; // Corrected import path
import * as GeoJSON from 'geojson'; // Import GeoJSON types

export interface ClusterFeature extends GeoJSON.Feature<GeoJSON.Point> {
  properties: {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string | number;
    [key: string]: any;
  }
}


export function useClusterMarkers(map: mapboxgl.Map | null, events: Event[], zoomThreshold: number = 11) {
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [isClusterSourceInitialized, setIsClusterSourceInitialized] = useState(false);

  // Create GeoJSON from events - use only events with valid coordinates
  const createGeoJSON = useCallback((eventList: Event[]): GeoJSON.FeatureCollection => {
    const validEvents = eventList.filter(event =>
      event.coordinates &&
      Array.isArray(event.coordinates) &&
      event.coordinates.length === 2 &&
      typeof event.coordinates[0] === 'number' &&
      typeof event.coordinates[1] === 'number' &&
      !isNaN(event.coordinates[0]) &&
      !isNaN(event.coordinates[1]) &&
       // Basic check for realistic coordinates
      event.coordinates[0] >= -180 && event.coordinates[0] <= 180 &&
      event.coordinates[1] >= -90 && event.coordinates[1] <= 90
    );

    const features: GeoJSON.Feature[] = validEvents.map(event => ({
      type: 'Feature',
      // Include necessary properties for popup/detail view and clustering reduce logic
      properties: {
        id: event.id,
        title: event.title,
        category: event.category || 'event', // Ensure category exists
        date: event.date,
        image: event.image,
        price: event.price, // Include price for cluster aggregation if needed
        location: event.location,
        url: event.url,
        venue: event.venue,
        source: event.source,
        // Add any other properties needed for cluster popup rendering or detail view
        cluster: false, // Initial state, supercluster will set this
      },
      geometry: {
        type: 'Point',
        coordinates: event.coordinates as [number, number] // Ensure type matches
      }
    }));

     console.log(`[useClusterMarkers] Created GeoJSON for ${features.length} valid events.`);

    return {
      type: 'FeatureCollection',
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
          try {
            // @ts-ignore - Mapbox types might need update or this is a known pattern
            map.removeLayer(layer);
            console.log(`[useClusterMarkers] Removed layer: ${layer}`);
          } catch (e) {
            console.warn(`[useClusterMarkers] Error removing layer ${layer}:`, e);
          }
        }
      });

      // Remove source
      if (map.getSource('events')) { // Source ID used here
        try {
          // @ts-ignore - Mapbox types might need update
          map.removeSource('events');
           console.log('[useClusterMarkers] Removed source: events');
        } catch (e) {
          console.warn('[useClusterMarkers] Error removing source:', e);
        }
      }

      setIsClusterSourceInitialized(false);
      console.log('[useClusterMarkers] Cluster layers cleared.');
    } catch (e) {
      console.error('[useClusterMarkers] Error in clearClusterLayers:', e);
    }
  }, [map]);

  // Initialize the cluster source and layers
  const initializeClusterLayers = useCallback(() => {
    if (!map || !events.length || isClusterSourceInitialized) {
       if (map && !map.isStyleLoaded()) {
          map.once('style.load', initializeClusterLayers);
           console.log('[useClusterMarkers] Waiting for style load to initialize cluster layers.');
       } else if (map && events.length === 0) {
           console.log('[useClusterMarkers] No events to initialize cluster layers with.');
           clearClusterLayers(); // Ensure layers are cleared if events become empty
       }
       return;
    }

    try {
      // Return if the map style isn't fully loaded yet
      if (!map.isStyleLoaded()) {
        map.once('style.load', initializeClusterLayers);
         console.log('[useClusterMarkers] Style not loaded, deferring cluster layer initialization.');
        return;
      }

       // Check if layers already exist before adding
       if (map.getLayer('clusters') || map.getSource('events')) {
           console.log('[useClusterMarkers] Cluster source or layers already exist, skipping re-initialization.');
           setIsClusterSourceInitialized(true); // Assume it's initialized if layers are present
           return;
       }

      console.log('[useClusterMarkers] Adding cluster source and layers...');

      // Add cluster source
      map.addSource('events', {
        type: 'geojson',
        data: createGeoJSON(events),
        cluster: true,
        clusterMaxZoom: 14, // Max zoom level to cluster points
        clusterRadius: 50, // Radius in pixels to cluster points within
         // Add properties to aggregate data for clusters if needed
        clusterProperties: {
             // Example: count events by category in clusters
             // categoryCount: ['+', ['get', 'category']] // This requires 'map' and 'reduce' functions in Supercluster options, which is not standard GeoJSON source
             // A better approach is to use the `reduce` option in Supercluster when using the hook directly,
             // or rely on the default 'point_count' property provided by Mapbox clustering.
        }
      });

      // Add cluster layers
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'], // Filter for clusters (features with point_count property)
        paint: {
          // Dynamic color based on point count
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#8b5cf6', // Purple for small clusters (<10 points)
            10,
            '#7c3aed', // Darker purple for medium clusters (10-29 points)
            30,
            '#6d28d9'  // Even darker for large clusters (>=30 points)
          ],
          // Dynamic radius based on point count
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // Radius 20 for <10 points
            10,
            25, // Radius 25 for 10-29 points
            30,
            30  // Radius 30 for >=30 points
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
        filter: ['has', 'point_count'], // Filter for clusters
        layout: {
          'text-field': '{point_count_abbreviated}', // Display abbreviated point count
          'text-size': 14,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], // Specify fonts
          'text-allow-overlap': true // Allow text to overlap markers
        },
        paint: {
          'text-color': '#ffffff' // White text color
        }
      });

      // Add unclustered point layer (individual events)
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']], // Filter for features *without* point_count property
        paint: {
          // Dynamic color based on category
          'circle-color': [
            'match',
            ['get', 'category'], // Get the 'category' property from the feature
            'music', '#3b82f6',      // blue
            'sports', '#22c55e',     // green
            'arts', '#ec4899',       // pink
            'theatre', '#ec4899',    // pink
            'family', '#eab308',     // yellow
            'food', '#f97316',       // orange
            'restaurant', '#f97316', // orange
            'party', '#a855f7',      // purple
            '#6b7280'                // default gray for 'other' or unknown categories
          ],
          'circle-radius': 8, // Radius for individual points
          'circle-stroke-width': 2, // Stroke width
          'circle-stroke-color': 'white', // White stroke
          'circle-opacity': 0.9 // Opacity
        }
      });

      setIsClusterSourceInitialized(true);
      console.log('[useClusterMarkers] Cluster layers initialized successfully.');
    } catch (error) {
      console.error('[useClusterMarkers] Error initializing cluster layers:', error);
      clearClusterLayers(); // Attempt to clean up if initialization fails
    }
  }, [map, events, createGeoJSON, clearClusterLayers, isClusterSourceInitialized]); // Depend on map, events, and callbacks

  // Update source data when events change (only if initialized)
  useEffect(() => {
    if (!map || !isClusterSourceInitialized) {
        console.log('[useClusterMarkers] Map or cluster source not initialized, skipping data update.');
        return;
    }

    try {
      const source = map.getSource('events') as mapboxgl.GeoJSONSource; // Source ID used here
      if (source && source.setData) {
        source.setData(createGeoJSON(events)); // Update data with latest events
        console.log('[useClusterMarkers] Updated cluster source data.');
      } else {
         console.warn('[useClusterMarkers] Cluster source not found when trying to update data.');
         // If source is missing but initialized state is true, might indicate an issue.
         // Could attempt re-initialization or rely on the main effect.
      }
    } catch (error) {
      console.error('[useClusterMarkers] Error updating cluster source data:', error);
    }
  }, [map, events, createGeoJSON, isClusterSourceInitialized]); // Depend on map, events, callback, and initialized state


  // Effect to manage initialization and cleanup based on clusteringEnabled state
  useEffect(() => {
    if (!map) {
       console.log('[useClusterMarkers] Map not available for clustering effect.');
       return;
    }

    console.log(`[useClusterMarkers] Clustering enabled state changed: ${clusteringEnabled}.`);

    if (clusteringEnabled) {
      // If clustering is enabled, initialize the layers
       // Pass the map instance to the initialization callback
      initializeClusterLayers();
    } else {
      // If clustering is disabled, clear the layers
      clearClusterLayers();
    }

    // Cleanup function: This runs when the effect re-runs or when the component unmounts
    return () => {
       console.log('[useClusterMarkers] Effect cleanup triggered (clustering state changed or unmount).');
       // Ensure layers are cleared when clustering is turned off or component unmounts
       clearClusterLayers();
    };
  }, [map, clusteringEnabled, initializeClusterLayers, clearClusterLayers]); // Effect depends on map, clusteringEnabled, and useCallback-wrapped functions

  // Toggle clustering functionality
  const toggleClustering = useCallback(() => {
    console.log('[useClusterMarkers] Toggling clustering enabled state.');
    setClusteringEnabled(prev => !prev);
  }, []);

  // The click handlers for the Mapbox layers ('clusters', 'unclustered-point')
  // are now attached and removed in MapComponent's useEffect hook,
  // controlled by `clusteringEnabled` and `isClusterSourceInitialized`.
  // These handlers (`handleClusterClick`, `handleUnclusteredPointClick`)
  // should be defined in MapComponent and passed down or managed there.
  // The Supercluster instance itself isn't directly exposed anymore, as Mapbox handles it.

  // If you needed the Supercluster instance for other reasons (e.g., querying points within a cluster manually),
  // you would use the useSupercluster hook instead of Mapbox's built-in clustering,
  // or query the GeoJSON source directly if Mapbox provides methods for that (less common).
  // For now, we assume Mapbox's built-in click events are sufficient.


  return {
    clusteringEnabled,
    toggleClustering,
    isClusterSourceInitialized // Exported state to signal when Mapbox layers are ready
  };
}