// src/components/map/MapMarkers.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '../../types';
import EventMarker from './markers/EventMarker';
import { createRoot, type Root } from 'react-dom/client';
import PerformanceMonitor from '../../utils/performanceMonitor';

// Marker batch processing constants
const MARKER_BATCH_SIZE = 25; // Number of markers to process in each batch
const MARKER_BATCH_DELAY = 5; // ms between batches (reduced for faster rendering)

// Marker visibility constants
const MARKER_VISIBILITY_ZOOM_THRESHOLD = 10; // Zoom level at which to show all markers
const MAX_VISIBLE_MARKERS_ZOOMED_OUT = 150; // Increased maximum markers when zoomed out

// Marker jittering constants to prevent overlapping
const JITTER_GRID_SIZE = 0.001; // Grid size for detecting overlapping markers (roughly 100m)
const MAX_JITTER_AMOUNT = 0.0005; // Maximum jitter amount (roughly 50m)

// Map to store all markers
const markerMap = new Map<string, {
  marker: mapboxgl.Marker,
  root: Root,
  isSelected: boolean,
  priority: number, // Higher priority markers are always visible
  originalCoords?: [number, number], // Store original coordinates
  jitteredCoords?: [number, number] // Store jittered coordinates if applied
}>();

// Helper function to check if coordinates are likely on land (approximate)
// This is a simplified check that avoids placing markers in major oceans
const isLikelyOnLand = (coords: [number, number]): boolean => {
  const [lng, lat] = coords;

  // Check for coordinates in major oceans
  // Pacific Ocean (rough boundaries)
  if (lng < -120 && lng > -180 && lat < 60 && lat > -60 && lat > -30 && lat < 30) {
    return false;
  }

  // Atlantic Ocean (rough boundaries)
  if (lng < -30 && lng > -70 && lat < 60 && lat > -60 && lat > -20 && lat < 20) {
    return false;
  }

  // Indian Ocean (rough boundaries)
  if (lng > 50 && lng < 100 && lat < 20 && lat > -60 && lat > -20 && lat < 10) {
    return false;
  }

  // Default to assuming it's on land
  return true;
};

// Enhanced function to calculate marker priority based on category and other factors
const calculateMarkerPriority = (event: Event, isSelected: boolean): number => {
  let priority = isSelected ? 100 : 0;

  // Base priority by category
  const category = (event.category || '').toLowerCase();
  switch(category) {
    case 'music': priority += 8; break;
    case 'concert': priority += 8; break;
    case 'festival': priority += 7; break;
    case 'sports': priority += 6; break;
    case 'arts': priority += 5; break;
    case 'theatre':
    case 'theater': priority += 5; break;
    case 'party': priority += 4; break;
    case 'food': priority += 3; break;
    case 'family': priority += 2; break;
    default: priority += 1;
  }

  // Add priority for events with images
  if (event.image && event.image.length > 10) priority += 2;

  // Add priority for events with prices (monetized events)
  if (event.price) priority += 1;

  // Add priority for events with venues
  if (event.venue) priority += 1;

  return priority;
};

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

    // Filter out features with invalid coordinates or in oceans
    const validFeatures = features.filter(feature => {
      if (!feature.coordinates ||
          !Array.isArray(feature.coordinates) ||
          feature.coordinates.length !== 2 ||
          typeof feature.coordinates[0] !== 'number' ||
          typeof feature.coordinates[1] !== 'number') {
        return false;
      }

      // Prioritize markers on land
      return isLikelyOnLand(feature.coordinates as [number, number]);
    });

    // If zoomed in enough, show all markers
    if (zoom >= MARKER_VISIBILITY_ZOOM_THRESHOLD) {
      return validFeatures;
    }

    // When zoomed out, limit the number of visible markers
    // Sort by priority: selected first, then by category importance
    return validFeatures
      .map(feature => {
        // Calculate priority using our enhanced function
        const isSelected = String(selectedFeatureId) === String(feature.id);
        const priority = calculateMarkerPriority(feature, isSelected);
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

  // Helper function to apply jittering to overlapping markers
  const applyJittering = useCallback((features: Event[]): Map<string, [number, number]> => {
    const jitteredCoords = new Map<string, [number, number]>();
    const gridCells = new Map<string, string[]>(); // Map of grid cell -> array of feature IDs

    // First pass: assign features to grid cells
    features.forEach(feature => {
      if (!feature.coordinates || !Array.isArray(feature.coordinates)) return;

      const [lng, lat] = feature.coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number') return;

      // Create a grid cell key
      const cellX = Math.floor(lng / JITTER_GRID_SIZE);
      const cellY = Math.floor(lat / JITTER_GRID_SIZE);
      const cellKey = `${cellX},${cellY}`;

      // Add feature to this cell
      if (!gridCells.has(cellKey)) {
        gridCells.set(cellKey, []);
      }
      gridCells.get(cellKey)!.push(String(feature.id));

      // Initially store original coordinates
      jitteredCoords.set(String(feature.id), [lng, lat]);
    });

    // Second pass: apply jittering to cells with multiple features
    gridCells.forEach((featureIds, cellKey) => {
      if (featureIds.length <= 1) return; // No need to jitter single markers

      // Apply jittering to each feature in this cell
      featureIds.forEach((featureId, index) => {
        const originalCoords = jitteredCoords.get(featureId);
        if (!originalCoords) return;

        // Calculate jitter amount based on index
        // Create a spiral or circular pattern for multiple markers
        const angle = (index / featureIds.length) * Math.PI * 2;
        const distance = Math.min(MAX_JITTER_AMOUNT, (index + 1) * (MAX_JITTER_AMOUNT / featureIds.length));

        const jitterX = Math.cos(angle) * distance;
        const jitterY = Math.sin(angle) * distance;

        // Apply jitter
        const jitteredLng = originalCoords[0] + jitterX;
        const jitteredLat = originalCoords[1] + jitterY;

        jitteredCoords.set(featureId, [jitteredLng, jitteredLat]);
      });
    });

    return jitteredCoords;
  }, []);

  const processFeaturesInBatches = useCallback((
    currentMap: mapboxgl.Map,
    currentFeatures: Event[],
    currentOnClick: (event: Event) => void,
    currentSelectedFeatureId: string | number | null,
    startIdx = 0
  ) => {
    PerformanceMonitor.startMeasure('markerRenderingBatch', { startIdx, batchSize: MARKER_BATCH_SIZE });

    // Apply jittering to all features to avoid overlaps
    const jitteredCoordinates = applyJittering(currentFeatures);

    const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, currentFeatures.length);

    for (let i = startIdx; i < endIdx; i++) {
      const event = currentFeatures[i];
      if (!event || !event.coordinates || event.coordinates.length !== 2) continue;

      const id = String(event.id);
      const isSelected = String(currentSelectedFeatureId) === id;
      const originalCoords = event.coordinates as [number, number];
      const jitteredCoords = jitteredCoordinates.get(id) || originalCoords;

      const existingEntry = markerMap.get(id);

      if (existingEntry) {
        // Calculate priority for this marker using our enhanced function
        const priority = calculateMarkerPriority(event, isSelected);

        const coordsChanged = ((existingEntry.marker as any).getLngLat().toArray().join(',') !== jitteredCoords.join(','));
        const selectionChanged = existingEntry.isSelected !== isSelected;
        const priorityChanged = existingEntry.priority !== priority;

        if (coordsChanged) {
          existingEntry.marker.setLngLat(jitteredCoords);
        }

        if (selectionChanged || coordsChanged || priorityChanged) {
          existingEntry.root.render(
            <EventMarker
              event={event}
              isSelected={isSelected}
              onClick={currentOnClick}
            />
          );
          // Update the entry with new values
          markerMap.set(id, {
            ...existingEntry,
            isSelected,
            priority,
            originalCoords,
            jitteredCoords
          });

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
          .setLngLat(jitteredCoords)
          .addTo(currentMap);

        // Calculate priority for new marker using our enhanced function
        const priority = calculateMarkerPriority(event, isSelected);

        markerMap.set(id, {
          marker,
          root,
          isSelected,
          priority,
          originalCoords,
          jitteredCoords
        });
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
  }, [setIsProcessing, applyJittering]);

  return null;
});

export default MapMarkers;
