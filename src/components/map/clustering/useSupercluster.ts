
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

    // Log a sample of events to debug
    if (events.length > 0) {
      console.log('[CLUSTER] Sample event:', JSON.stringify(events[0]));
    }

    const validEvents = events.filter(ev => {
      const hasValidCoords = Array.isArray(ev.coordinates) &&
        ev.coordinates.length === 2 &&
        !isNaN(ev.coordinates[0]) &&
        !isNaN(ev.coordinates[1]);

      if (!hasValidCoords) {
        console.warn('[CLUSTER] Event missing valid coordinates:', ev.id, 'coordinates:', ev.coordinates);
      }
      return hasValidCoords;
    });

    console.log(`[CLUSTER] Found ${validEvents.length} events with valid coordinates out of ${events.length} total events`);

    return validEvents.map(ev => {
      // Log the first few events being converted to features
      if (validEvents.indexOf(ev) < 3) {
        console.log(`[CLUSTER] Converting event ${ev.id} with coordinates ${ev.coordinates} to feature`);
      }

      return {
        type: 'Feature' as const,
        properties: { ...ev, cluster: false },
        geometry: {
          type: 'Point' as const,
          coordinates: ev.coordinates as [number, number]
        }
      };
    });
  }, [events]);

  // Initialize or update supercluster when points change
  useEffect(() => {
    if (!points.length) {
      setClusters([]);
      return;
    }

    console.log('[CLUSTER] Initializing supercluster with', points.length, 'points');

    const supercluster = new Supercluster({
      radius: 40,
      maxZoom: 16,
      minZoom: 0,
    });

    supercluster.load(points);
    superclusterRef.current = supercluster;
  }, [points]);

  // Get clusters based on current bounds and zoom
  useEffect(() => {
    if (!superclusterRef.current || !bounds || !points.length) {
      return;
    }

    const currentZoom = Math.floor(zoom);
    console.log('[CLUSTER] Getting clusters for zoom level', currentZoom);

    try {
      const clusterFeatures = superclusterRef.current.getClusters(bounds, currentZoom) as ClusterFeature[];
      console.log('[CLUSTER] Generated', clusterFeatures.length, 'clusters/points');
      setClusters(clusterFeatures);
    } catch (error) {
      console.error('[CLUSTER] Error generating clusters:', error);
      setClusters([]);
    }
  }, [bounds, zoom, points.length]);

  return { clusters, supercluster: superclusterRef.current };
}
