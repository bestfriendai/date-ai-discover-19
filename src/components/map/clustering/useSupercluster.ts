
import { useRef, useEffect, useState, useMemo } from 'react';
import Supercluster from 'supercluster';
import type { Event } from '@/types';
import * as GeoJSON from 'geojson';

export interface ClusterFeature extends GeoJSON.Feature<GeoJSON.Point> {
  properties: {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string | number;
    [key: string]: any;
  }
}

export function useSupercluster(events: Event[], bounds: [number, number, number, number] | null, zoom: number) {
  const [clusters, setClusters] = useState<ClusterFeature[]>([]);
  const superclusterRef = useRef<Supercluster | null>(null);

  // Convert events to GeoJSON using useMemo to prevent unnecessary recalculations
  const points = useMemo(() => {
    console.log('[CLUSTER] Processing', events.length, 'events for clustering');

    const validEvents = events.filter(ev => {
      const hasValidCoords = Array.isArray(ev.coordinates) &&
        ev.coordinates.length === 2 &&
        !isNaN(ev.coordinates[0]) &&
        !isNaN(ev.coordinates[1]);

      if (!hasValidCoords) {
        console.warn('[CLUSTER] Event missing valid coordinates:', ev.id);
      }
      return hasValidCoords;
    });

    return validEvents.map(ev => ({
      type: 'Feature' as const,
      properties: { 
        ...ev,
        cluster: false,
        id: ev.id,
        category: ev.category || 'other'
      },
      geometry: {
        type: 'Point' as const,
        coordinates: ev.coordinates as [number, number]
      }
    }));
  }, [events]);

  // Initialize or update supercluster with optimized settings
  useEffect(() => {
    if (!points.length) {
      setClusters([]);
      return;
    }

    const supercluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 3, // Minimum points to form a cluster
      map: props => ({
        category: props.category,
        id: props.id
      }),
      reduce: (accumulated, props) => {
        // Count events by category in clusters
        if (!accumulated.categories) {
          accumulated.categories = {};
        }
        const category = props.category || 'other';
        accumulated.categories[category] = (accumulated.categories[category] || 0) + 1;
      }
    });

    supercluster.load(points);
    superclusterRef.current = supercluster;
  }, [points]);

  // Get clusters with improved performance
  useEffect(() => {
    if (!superclusterRef.current || !bounds || !points.length) {
      return;
    }

    const currentZoom = Math.floor(zoom);
    console.log('[CLUSTER] Getting clusters for zoom level', currentZoom);

    try {
      const clusterFeatures = superclusterRef.current.getClusters(bounds, currentZoom);
      console.log('[CLUSTER] Generated', clusterFeatures.length, 'clusters/points');
      setClusters(clusterFeatures as ClusterFeature[]);
    } catch (error) {
      console.error('[CLUSTER] Error generating clusters:', error);
      setClusters([]);
    }
  }, [bounds, zoom, points.length]);

  return { clusters, supercluster: superclusterRef.current };
}
