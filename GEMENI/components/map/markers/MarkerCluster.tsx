
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

interface MarkerClusterProps {
  map: mapboxgl.Map;
  events: Event[];
  onClusterClick: (clusterId: number, coordinates: [number, number]) => void;
  onMarkerClick: (event: Event) => void;
}

const MarkerCluster = ({ map, events, onClusterClick, onMarkerClick }: MarkerClusterProps) => {
  const sourceId = 'events-source';
  const clusterId = 'event-clusters';
  const unclusteredId = 'unclustered-events';
  const initialized = useRef(false);

  useEffect(() => {
    if (!map || !events.length || initialized.current) return;

    // Setup the GeoJSON source for clustering
    const setupSource = () => {
      if (map.getSource(sourceId)) return;

      // Convert events to GeoJSON
      const features = events.map(event => ({
        type: 'Feature' as const,
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: event.coordinates as [number, number]
        }
      }));

      // Add source with clustering enabled
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster layer
      map.addLayer({
        id: clusterId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#7c3aed', // Purple for small clusters
            10, 
            '#6d28d9', // Darker purple for medium clusters
            30, 
            '#5b21b6'  // Even darker for large clusters
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
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 16,
          'text-font': ['Open Sans Bold'],
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add unclustered point layer (base points)
      map.addLayer({
        id: unclusteredId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            'music', '#3b82f6',      // blue
            'sports', '#22c55e',      // green
            'arts', '#ec4899',       // pink
            'family', '#eab308',     // yellow
            'food', '#f97316',       // orange
            'party', '#a855f7',      // purple
            'workshop', '#06b6d4',   // cyan
            'conference', '#0ea5e9', // lightblue
            '#6b7280'                // default gray
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'white',
          'circle-opacity': 0.9
        }
      });

      // Add hover effects
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'custom-popup',
        maxWidth: '300px',
        offset: 15
      });

      // Mouse enter for individual markers
      map.on('mouseenter', unclusteredId, (e) => {
        if (!e.features?.[0]) return;
        
        map.getCanvas().style.cursor = 'pointer';
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice() as [number, number];
        const title = feature.properties?.title || 'Event';
        
        popup
          .setLngLat(coordinates)
          .setHTML(`<div class="text-sm font-medium">${title}</div>`)
          .addTo(map);
      });

      // Mouse leave for individual markers
      map.on('mouseleave', unclusteredId, () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      // Mouse enter for clusters
      map.on('mouseenter', clusterId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      // Mouse leave for clusters
      map.on('mouseleave', clusterId, () => {
        map.getCanvas().style.cursor = '';
      });

      // Click on clusters to zoom in
      map.on('click', clusterId, (e) => {
        if (!e.features?.[0]) return;
        
        const feature = e.features[0];
        const clusterId = feature.properties?.cluster_id;
        const coordinates = feature.geometry.coordinates.slice() as [number, number];
        
        if (clusterId) {
          onClusterClick(clusterId, coordinates);
        }
      });

      // Click on individual markers
      map.on('click', unclusteredId, (e) => {
        if (!e.features?.[0]) return;
        
        const feature = e.features[0];
        const id = feature.properties?.id;
        
        if (id) {
          const event = events.find(event => event.id === id);
          if (event) {
            onMarkerClick(event);
          }
        }
      });

      initialized.current = true;
    };

    // Wait for the map style to be loaded
    if (map.isStyleLoaded()) {
      setupSource();
    } else {
      map.once('style.load', setupSource);
    }

    // Update data when events change
    const updateSource = () => {
      const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (!source) return;

      const features = events.map(event => ({
        type: 'Feature' as const,
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: event.coordinates as [number, number]
        }
      }));

      source.setData({
        type: 'FeatureCollection',
        features
      });
    };

    if (initialized.current) {
      updateSource();
    }

    return () => {
      // Cleanup is handled by the map removal in the parent component
    };
  }, [map, events, onClusterClick, onMarkerClick]);

  return null; // This is a non-visual component
};

export default MarkerCluster;
