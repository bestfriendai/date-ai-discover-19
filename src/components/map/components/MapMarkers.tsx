
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import EventMarker from '../markers/EventMarker';
import { createRoot } from 'react-dom/client';

// Batch size for processing markers to prevent UI freezing
const MARKER_BATCH_SIZE = 50;
const MARKER_BATCH_DELAY = 0; // ms between batches

interface MapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  onMarkerClick: (event: Event) => void;
  selectedEvent: Event | null;
}

export const MapMarkers = memo(({ map, events, onMarkerClick, selectedEvent }: MapMarkersProps) => {
  const markersRef = useRef<{[key: string]: {marker: mapboxgl.Marker, root: ReturnType<typeof createRoot>, isSelected: boolean}}>({
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const currentEventsRef = useRef<Event[]>([]);

  // Memoize the click handler to prevent unnecessary re-renders
  const handleMarkerClick = useCallback((event: Event) => {
    console.log('[MARKERS] Marker clicked:', event.id);
    onMarkerClick(event);
  }, [onMarkerClick]);

  // Process markers in batches to prevent UI freezing
  const processBatch = useCallback((validEvents: Event[], startIdx: number) => {
    if (startIdx >= validEvents.length) {
      console.log(`[MARKERS] Finished processing all ${validEvents.length} markers`);
      setIsProcessing(false);
      return;
    }

    const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, validEvents.length);
    console.log(`[MARKERS] Processing batch ${startIdx}-${endIdx} of ${validEvents.length} markers`);

    // Process this batch
    for (let i = startIdx; i < endIdx; i++) {
      const event = validEvents[i];

      // Skip if marker already exists and selected state hasn't changed
      const existingMarker = markersRef.current[event.id];
      const isSelected = selectedEvent?.id === event.id;

      if (existingMarker) {
        // Update existing marker if selection state changed
        if ((existingMarker.isSelected !== isSelected)) {
          existingMarker.root.render(
            <EventMarker
              event={event}
              isSelected={isSelected}
              onClick={() => handleMarkerClick(event)}
            />
          );
          existingMarker.isSelected = isSelected;
        }
        continue;
      }

      // Create new marker
      const [lng, lat] = event.coordinates as [number, number];
      const markerEl = document.createElement('div');
      const root = createRoot(markerEl);

      root.render(
        <EventMarker
          event={event}
          isSelected={isSelected}
          onClick={() => handleMarkerClick(event)}
        />
      );

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current[event.id] = { marker, root, isSelected };
    }

    // Schedule next batch
    setTimeout(() => {
      processBatch(validEvents, endIdx);
    }, MARKER_BATCH_DELAY);
  }, [map, selectedEvent, handleMarkerClick]);

  // Main effect to manage markers
  useEffect(() => {
    if (!map || isProcessing) return;

    // Start processing
    setIsProcessing(true);
    console.log(`[MARKERS] Starting to process ${events.length} events`);

    // Filter events with valid coordinates
    const validEvents = events.filter(e =>
      e.coordinates && Array.isArray(e.coordinates) && e.coordinates.length === 2
    );
    console.log(`[MARKERS] ${validEvents.length} events have valid coordinates`);

    // Find markers to remove (not in current events)
    const currentEventIds = new Set(validEvents.map(e => e.id));
    const markersToRemove = Object.keys(markersRef.current).filter(id => !currentEventIds.has(id));

    // Remove markers that are no longer in the events array
    if (markersToRemove.length > 0) {
      console.log(`[MARKERS] Removing ${markersToRemove.length} markers that are no longer needed`);
      markersToRemove.forEach(id => {
        markersRef.current[id].marker.remove();
        delete markersRef.current[id];
      });
    }

    // Store current events for comparison
    currentEventsRef.current = validEvents;

    // Start processing in batches
    processBatch(validEvents, 0);

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
      const shouldBeSelected = id === selectedEvent.id;

      // Only update if selection state changed
      if (isSelected !== shouldBeSelected) {
        const event = events.find(e => e.id === id);
        if (event) {
          root.render(
            <EventMarker
              event={event}
              isSelected={shouldBeSelected}
              onClick={() => handleMarkerClick(event)}
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
