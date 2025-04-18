
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
    return events
      .filter(ev => Array.isArray(ev.coordinates) && ev.coordinates.length === 2)
      .map(ev => ({
        type: 'Feature' as const,
        properties: { ...ev, cluster: false },
        geometry: { 
          type: 'Point' as const, 
          coordinates: ev.coordinates as [number, number] 
        }
      }));
  }, [events]);

  // Initialize supercluster and load points
  useEffect(() => {
    if (!points.length) {
      setClusters([]);
      return;
    }
    
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
    const clusterFeatures = superclusterRef.current.getClusters(bounds, currentZoom) as ClusterFeature[];
    setClusters(clusterFeatures);
  }, [bounds, zoom, points.length]);

  return { clusters, supercluster: superclusterRef.current };
}
