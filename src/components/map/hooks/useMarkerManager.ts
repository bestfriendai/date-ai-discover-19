import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';
import { addEventMarker } from '../utils/markerUtils';

/**
 * Hook to manage markers on the map with optimized updates
 */
export const useMarkerManager = (
  map: mapboxgl.Map | null,
  events: Event[],
  onEventSelect: ((event: Event | null) => void) | undefined
) => {
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const markerMapRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const eventsRef = useRef<Event[]>([]);

  // Effect to manage markers when events or map changes
  useEffect(() => {
    if (!map || !onEventSelect) return;

    console.log(`[MARKER_MANAGER] Managing ${events.length} events`);

    // Create a new Map to track current markers
    const currentMarkers = new Map<string, mapboxgl.Marker>();
    const newMarkers: mapboxgl.Marker[] = [];

    // Process each event
    events.forEach(event => {
      const eventId = event.id;

      // Skip events without valid coordinates
      if (!event.coordinates || event.coordinates.length !== 2) return;

      // Check if we already have a marker for this event
      if (markerMapRef.current.has(eventId)) {
        // Reuse existing marker
        const existingMarker = markerMapRef.current.get(eventId)!;

        // Update marker position if coordinates changed
        const oldEvent = eventsRef.current.find(e => e.id === eventId);
        if (oldEvent &&
            (oldEvent.coordinates[0] !== event.coordinates[0] ||
             oldEvent.coordinates[1] !== event.coordinates[1])) {
          existingMarker.setLngLat(event.coordinates as [number, number]);
        }

        // Keep the marker
        currentMarkers.set(eventId, existingMarker);
        newMarkers.push(existingMarker);
      } else {
        // Create a new marker
        const marker = addEventMarker(map, event, onEventSelect);
        if (marker) {
          currentMarkers.set(eventId, marker);
          newMarkers.push(marker);
        }
      }
    });

    // Remove markers that are no longer needed
    markerMapRef.current.forEach((marker, id) => {
      if (!currentMarkers.has(id)) {
        marker.remove();
      }
    });

    // Update refs and state
    markerMapRef.current = currentMarkers;
    eventsRef.current = [...events];
    setMarkers(newMarkers);

    // Cleanup function to remove all markers when component unmounts
    return () => {
      currentMarkers.forEach(marker => marker.remove());
      markerMapRef.current.clear();
    };
  }, [map, events, onEventSelect]);

  return {
    markers,
    markerCount: markers.length
  };
};
