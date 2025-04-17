import { useEffect, useRef, useState, useCallback, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import type { ClusterFeature } from '../clustering/useSupercluster';
import EventMarker from '../markers/EventMarker';
import { createRoot } from 'react-dom/client';

// Batch size for processing markers to prevent UI freezing
const MARKER_BATCH_SIZE = 50;
const MARKER_BATCH_DELAY = 0; // ms between batches

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: ClusterFeature[];
  onMarkerClick: (feature: ClusterFeature) => void;
  selectedEvent: ClusterFeature | null;
}

export const MapMarkers = memo(({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  const markersRef = useRef<{[key: string]: {marker: mapboxgl.Marker, root: ReturnType<typeof createRoot>, isSelected: boolean}}>(
  {});
  const [isProcessing, setIsProcessing] = useState(false);
  const currentEventsRef = useRef<ClusterFeature[]>([]);

  // Memoize the click handler to prevent unnecessary re-renders
  const handleMarkerClick = useCallback((feature: ClusterFeature) => {
    const id = String(feature.properties?.id ?? feature.properties?.cluster_id);
    console.log('[MARKERS] Marker clicked:', id);
    onMarkerClick(feature);
  }, [onMarkerClick]);

  // Process markers in batches to prevent UI freezing
  const processBatch = useCallback((validFeatures: ClusterFeature[], startIdx: number) => {
    if (startIdx >= validFeatures.length) {
      console.log(`[MARKERS] Finished processing all ${validFeatures.length} markers`);
      setIsProcessing(false);
      return;
    }

    const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, validFeatures.length);
    console.log(`[MARKERS] Processing batch ${startIdx}-${endIdx} of ${validFeatures.length} markers`);

    // Process this batch
    for (let i = startIdx; i < endIdx; i++) {
      const feature = validFeatures[i];
      const id = String(feature.properties?.id ?? feature.properties?.cluster_id);
      if (!id) continue;

      // Skip if marker already exists and selected state hasn't changed
      const existingMarker = markersRef.current[id];
      const isSelected = selectedEvent && (String(selectedEvent.properties?.id ?? selectedEvent.properties?.cluster_id) === id);

      if (existingMarker) {
        // Update existing marker if selection state changed
        if ((existingMarker.isSelected !== isSelected)) {
          existingMarker.root.render(
            <EventMarker
              event={feature}
              isSelected={isSelected}
              onClick={() => handleMarkerClick(feature)}
            />
          );
          existingMarker.isSelected = isSelected;
        }
        continue;
      }

      // Create new marker
      const [lng, lat] = feature.geometry.coordinates;
      const markerEl = document.createElement('div');
      const root = createRoot(markerEl);

      root.render(
        <EventMarker
          event={feature}
          isSelected={isSelected}
          onClick={() => handleMarkerClick(feature)}
        />
      );

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current[id] = { marker, root, isSelected };
    }

    // Schedule next batch
    setTimeout(() => {
      processBatch(validFeatures, endIdx);
    }, MARKER_BATCH_DELAY);
  }, [map, selectedEvent, handleMarkerClick]);

  // Main effect to manage markers
  useEffect(() => {
    if (!map || isProcessing) return;

    // Start processing
    setIsProcessing(true);
    console.log(`[MARKERS] Starting to process ${events.length} features`);

    // Filter features with valid coordinates
    const validFeatures = events.filter(f => Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length === 2);
    console.log(`[MARKERS] ${validFeatures.length} features have valid coordinates`);

    // Find markers to remove (not in current features)
    const currentIds = new Set(validFeatures.map(f => String(f.properties?.id ?? f.properties?.cluster_id)));
    const markersToRemove = Object.keys(markersRef.current).filter(id => !currentIds.has(id));

    // Remove markers that are no longer in the features array
    if (markersToRemove.length > 0) {
      console.log(`[MARKERS] Removing ${markersToRemove.length} markers that are no longer needed`);
      markersToRemove.forEach(id => {
        markersRef.current[id].marker.remove();
        delete markersRef.current[id];
      });
    }

    // Store current features for comparison
    currentEventsRef.current = validFeatures;

    // Start processing in batches
    processBatch(validFeatures, 0);

    // Cleanup on unmount
    return () => {
      console.log('[MARKERS] Cleaning up all markers');
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
      markersRef.current = {};
    };
  }, [events, map, processBatch, isProcessing]);

  // Effect to update selected marker
  useEffect(() => {
    if (!map || isProcessing || !selectedEvent) return;

    // Update selected marker
    Object.entries(markersRef.current).forEach(([id, { root, marker, isSelected }]) => {
      const shouldBeSelected =
        String(selectedEvent.properties?.id ?? selectedEvent.properties?.cluster_id) === id;

      // Only update if selection state changed
      if (isSelected !== shouldBeSelected) {
        const feature = events.find(f => String(f.properties?.id ?? f.properties?.cluster_id) === id);
        if (feature) {
          root.render(
            <EventMarker
              event={feature}
              isSelected={shouldBeSelected}
              onClick={() => handleMarkerClick(feature)}
            />
          );
          markersRef.current[id].isSelected = shouldBeSelected;

          // Bring selected marker to front
          if (shouldBeSelected) {
            marker.remove();
            marker.addTo(map);
          }
        }
      }
    });
  }, [selectedEvent, map, events, handleMarkerClick, isProcessing]);

  return null;
});
