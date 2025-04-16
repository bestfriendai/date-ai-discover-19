
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import EventMarker from '../markers/EventMarker';
import { createRoot } from 'react-dom/client';
import Supercluster from 'supercluster';

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
  selectedEvent: Event | null;
}

export const MapMarkers = ({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  const markersRef = useRef<{[key: string]: {marker: mapboxgl.Marker, root: ReturnType<typeof createRoot>}}>(
    {}
  );
  const clusterMarkersRef = useRef<{[key: string]: mapboxgl.Marker}>({});
  const [supercluster, setSupercluster] = useState<Supercluster | null>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [zoom, setZoom] = useState(map.getZoom());
  const [bounds, setBounds] = useState((map as any).getBounds().toArray().flat());

  // Convert events to GeoJSON features
  const features = events
    .filter(e => e.coordinates && Array.isArray(e.coordinates) && e.coordinates.length === 2)
    .map(event => ({
      type: 'Feature',
      properties: {
        cluster: false,
        eventId: event.id,
        event,
      },
      geometry: {
        type: 'Point',
        coordinates: event.coordinates as [number, number],
      },
    }));

  // Initialize supercluster and update clusters on map move/zoom
  useEffect(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 18,
    });
    sc.load(features as any);
    setSupercluster(sc);

    const updateClusters = () => {
      const mapBounds = (map as any).getBounds().toArray().flat();
      setBounds(mapBounds);
      setZoom(map.getZoom());
      if (sc) {
        setClusters(sc.getClusters(mapBounds, Math.round(map.getZoom())));
      }
    };

    updateClusters();
    map.on('moveend', updateClusters);
    return () => {
      map.off('moveend', updateClusters);
    };
    // eslint-disable-next-line
  }, [map, events]);

  // Render clusters and markers
  useEffect(() => {
    // Remove old cluster markers
    Object.values(clusterMarkersRef.current).forEach(marker => marker.remove());
    clusterMarkersRef.current = {};

    // Remove old event markers
    Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
    markersRef.current = {};

    clusters.forEach(cluster => {
      const [lng, lat] = cluster.geometry.coordinates;
      if (cluster.properties.cluster) {
        // Render cluster marker
        const count = cluster.properties.point_count;
        const clusterId = cluster.id;
        const el = document.createElement('div');
        el.className =
          "bg-primary/90 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer";
        el.style.width = el.style.height = `${30 + Math.min(count, 50)}px`;
        el.style.fontSize = "14px";
        el.style.fontWeight = "bold";
        el.innerText = count;

        el.onclick = () => {
          if (!supercluster) return;
          const expansionZoom = Math.min(
            supercluster.getClusterExpansionZoom(clusterId),
            18
          );
          map.easeTo({ center: [lng, lat], zoom: expansionZoom });
        };

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
        clusterMarkersRef.current[clusterId] = marker;
      } else {
        // Render event marker
        const event: Event = cluster.properties.event;
        const markerEl = document.createElement('div');
        const root = createRoot(markerEl);
        root.render(
          <EventMarker
            event={event}
            isSelected={selectedEvent?.id === event.id}
            onClick={() => onMarkerClick(event)}
          />
        );
        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current[event.id] = { marker, root };
      }
    });

    // Cleanup on unmount
    return () => {
      Object.values(clusterMarkersRef.current).forEach(marker => marker.remove());
      clusterMarkersRef.current = {};
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
      markersRef.current = {};
    };
    // eslint-disable-next-line
  }, [clusters, map, selectedEvent, onMarkerClick]);

  return null;
};
