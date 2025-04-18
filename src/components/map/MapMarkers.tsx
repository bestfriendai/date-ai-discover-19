// src/components/map/MapMarkers.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '../../types';
import EventMarker from './markers/EventMarker';
import { createRoot, type Root } from 'react-dom/client';
import PerformanceMonitor from '../../utils/performanceMonitor';

// Marker batch processing constants
const MARKER_BATCH_SIZE = 25; // Number of markers to process in each batch
const MARKER_BATCH_DELAY = 10; // ms between batches

// Marker visibility constants
const MARKER_VISIBILITY_ZOOM_THRESHOLD = 10; // Zoom level at which to show all markers
const MAX_VISIBLE_MARKERS_ZOOMED_OUT = 100; // Maximum number of markers to show when zoomed out

// Map to store all markers
const markerMap = new Map<string, {
  marker: mapboxgl.Marker,
  root: Root,
  isSelected: boolean,
  priority: number // Higher priority markers are always visible
}>();

interface MapMarkersProps {
  map: mapboxgl.Map | null;
  features: Event[];
  onMarkerClick: (event: Event) => void;
  selectedFeatureId: string | number | null;
}

const MapMarkers = React.memo(({ map, features, onMarkerClick, selectedFeatureId }: MapMarkersProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate which markers should be visible based on zoom level and priority
  const visibleFeatures = useMemo(() => {
    if (!map || !features || features.length === 0) return [];

    const zoom = map.getZoom();

    // If zoomed in enough, show all markers
    if (zoom >= MARKER_VISIBILITY_ZOOM_THRESHOLD) {
      return features;
    }

    // When zoomed out, limit the number of visible markers
    // Sort by priority: selected first, then by category importance
    return features
      .map(feature => {
        // Calculate priority: selected events get highest priority
        const isSelected = String(selectedFeatureId) === String(feature.id);
        let priority = isSelected ? 100 : 0;

        // Add priority based on category
        const category = (feature.category || '').toLowerCase();
        if (category === 'music') priority += 5;
        else if (category === 'sports') priority += 4;
        else if (category === 'arts' || category === 'theatre') priority += 3;
        else if (category === 'party') priority += 2;
        else if (category === 'food' || category === 'restaurant') priority += 1;

        return { feature, priority, isSelected };
      })
      .sort((a, b) => b.priority - a.priority) // Sort by priority (highest first)
      .slice(0, MAX_VISIBLE_MARKERS_ZOOMED_OUT) // Limit number of markers
      .map(item => item.feature); // Return just the features
  }, [map, features, selectedFeatureId]);

  useEffect(() => {
    if (!map || !features) {
      markerMap.forEach(({ marker }) => marker.remove());
      markerMap.clear();
      return;
    }

    setIsProcessing(true);
    processFeaturesInBatches(map, visibleFeatures, onMarkerClick, selectedFeatureId);

    // Remove markers that are no longer in the visible features
    const currentFeatureIds = new Set(visibleFeatures.map(f => String(f.id)));
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
  }, [map, visibleFeatures, onMarkerClick, selectedFeatureId]);

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
        // Calculate priority for this marker
        let priority = isSelected ? 100 : 0;
        const category = (event.category || '').toLowerCase();
        if (category === 'music') priority += 5;
        else if (category === 'sports') priority += 4;
        else if (category === 'arts' || category === 'theatre') priority += 3;
        else if (category === 'party') priority += 2;
        else if (category === 'food' || category === 'restaurant') priority += 1;

        const coordsChanged = ((existingEntry.marker as any).getLngLat().toArray().join(',') !== coordinates.join(','));
        const selectionChanged = existingEntry.isSelected !== isSelected;
        const priorityChanged = existingEntry.priority !== priority;

        if (coordsChanged) {
          existingEntry.marker.setLngLat(coordinates);
        }

        if (selectionChanged || coordsChanged || priorityChanged) {
          existingEntry.root.render(
            <EventMarker
              event={event}
              isSelected={isSelected}
              onClick={currentOnClick}
            />
          );
          existingEntry.isSelected = isSelected;
          existingEntry.priority = priority;

          if (isSelected) {
            // Bring selected marker to front
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

        // Calculate priority for new marker
        let priority = isSelected ? 100 : 0;
        const category = (event.category || '').toLowerCase();
        if (category === 'music') priority += 5;
        else if (category === 'sports') priority += 4;
        else if (category === 'arts' || category === 'theatre') priority += 3;
        else if (category === 'party') priority += 2;
        else if (category === 'food' || category === 'restaurant') priority += 1;

        markerMap.set(id, { marker, root, isSelected, priority });
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
