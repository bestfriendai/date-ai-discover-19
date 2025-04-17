import { useRef, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!events || events.length === 0) {
      setClusters([]);
      return;
    }
    // Convert events to GeoJSON
    const features: GeoJSON.Feature<GeoJSON.Point>[] = events
      .filter(ev => Array.isArray(ev.coordinates) && ev.coordinates.length === 2)
      .map(ev => ({
        type: 'Feature',
        properties: { ...ev, cluster: false },
        geometry: { type: 'Point', coordinates: ev.coordinates as [number, number] }
      }));
    const supercluster = new Supercluster({
      radius: 40,
      maxZoom: 16,
      minZoom: 0,
    });
    supercluster.load(features);
    superclusterRef.current = supercluster;
    if (bounds && bounds.length === 4) {
      const clusterFeatures = supercluster.getClusters(bounds, Math.floor(zoom)) as ClusterFeature[];
      setClusters(clusterFeatures);
    } else {
      setClusters([]);
    }
  }, [events, bounds, zoom]);

  return { clusters, supercluster: superclusterRef.current };
}
