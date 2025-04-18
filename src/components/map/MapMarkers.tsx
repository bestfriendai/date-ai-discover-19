// src/components/map/MapMarkers.tsx
import React, { useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '../../types';
import EventMarker from './markers/EventMarker';
import { createRoot, type Root } from 'react-dom/client';
import PerformanceMonitor from '../../utils/performanceMonitor';

const MARKER_BATCH_SIZE = 25;
const MARKER_BATCH_DELAY = 10; // ms between batches

const markerMap = new Map<string, { marker: mapboxgl.Marker, root: Root, isSelected: boolean }>();

interface MapMarkersProps {
  map: mapboxgl.Map | null;
  features: Event[];
  onMarkerClick: (event: Event) => void;
  selectedFeatureId: string | number | null;
}

const MapMarkers = React.memo(({ map, features, onMarkerClick, selectedFeatureId }: MapMarkersProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!map || !features) {
      markerMap.forEach(({ marker }) => marker.remove());
      markerMap.clear();
      return;
    }

    setIsProcessing(true);
    processFeaturesInBatches(map, features, onMarkerClick, selectedFeatureId);

    const currentFeatureIds = new Set(features.map(f => String(f.id)));
    const markersToRemove = Array.from(markerMap.keys()).filter(id => !currentFeatureIds.has(id));

    markersToRemove.forEach(id => {
      const entry = markerMap.get(id);
      if (entry) {
        entry.root.unmount();
        entry.marker.remove();
        markerMap.delete(id);
      }
    });

    return () => {
      markerMap.forEach(({ marker, root }) => {
        root.unmount();
        marker.remove();
      });
      markerMap.clear();
    };
  }, [map, features, onMarkerClick, selectedFeatureId]);

  const processFeaturesInBatches = useCallback((
    currentMap: mapboxgl.Map,
    currentFeatures: Event[],
    currentOnClick: (event: Event) => void,
    currentSelectedFeatureId: string | number | null,
    startIdx = 0
  ) => {
    PerformanceMonitor.startMeasure('markerRenderingBatch', { startIdx, batchSize: MARKER_BATCH_SIZE });

    const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, currentFeatures.length);

    for (let i = startIdx; i < endIdx; i++) {
      const event = currentFeatures[i];
      if (!event || !event.coordinates || event.coordinates.length !== 2) continue;

      const id = String(event.id);
      const isSelected = String(currentSelectedFeatureId) === id;
      const coordinates = event.coordinates as [number, number];

      const existingEntry = markerMap.get(id);

      if (existingEntry) {
        const coordsChanged = ((existingEntry.marker as any).getLngLat().toArray().join(',') !== coordinates.join(','));
        const selectionChanged = existingEntry.isSelected !== isSelected;

        if (coordsChanged) {
          existingEntry.marker.setLngLat(coordinates);
        }
        if (selectionChanged || coordsChanged) {
          existingEntry.root.render(
            <EventMarker
              event={event}
              isSelected={isSelected}
              onClick={currentOnClick}
            />
          );
          existingEntry.isSelected = isSelected;

          if (isSelected) {
            const markerElement = existingEntry.marker.getElement();
            const parent = markerElement.parentElement;
            if (parent && parent.lastChild !== markerElement) {
              existingEntry.marker.remove();
              existingEntry.marker.addTo(currentMap);
            }
          }
        }
      } else {
        const markerEl = document.createElement('div');
        markerEl.setAttribute('aria-label', `Event: ${event.title}`);

        const root = createRoot(markerEl);

        root.render(
          <EventMarker
            event={event}
            isSelected={isSelected}
            onClick={currentOnClick}
          />
        );

        const marker = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat(coordinates)
          .addTo(currentMap);

        markerMap.set(id, { marker, root, isSelected });
      }
    }

    PerformanceMonitor.endMeasure('markerRenderingBatch');

    if (endIdx < currentFeatures.length) {
      setTimeout(() => {
        processFeaturesInBatches(currentMap, currentFeatures, currentOnClick, currentSelectedFeatureId, endIdx);
      }, MARKER_BATCH_DELAY);
    } else {
      setIsProcessing(false);
    }
  }, [setIsProcessing]);

  return null;
});

export default MapMarkers;
