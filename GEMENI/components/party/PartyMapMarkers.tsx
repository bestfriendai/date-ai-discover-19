
import React, { useEffect, useState, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Event } from '../../types';
import PartyMarker from './PartyMarker';
import { createRoot } from 'react-dom/client';

interface PartyMapMarkersProps {
  map: mapboxgl.Map;
  events: Event[];
  selectedEventId: string | null;
  onMarkerClick: (event: Event) => void;
}

export const PartyMapMarkers: React.FC<PartyMapMarkersProps> = ({
  map,
  events,
  selectedEventId,
  onMarkerClick
}) => {
  // Use a ref to track mounted state
  const isMounted = useRef(true);
  const [activeMarkers, setActiveMarkers] = useState<Map<string, { marker: mapboxgl.Marker, root: any }>>(new Map());

  const updateMarkers = useCallback(() => {
    if (!map || !events.length || !isMounted.current) return;

    console.log('[PartyMapMarkers] Updating markers for', events.length, 'events');

    // Use a function to get the latest state
    setActiveMarkers(prevMarkers => {
      // Create a new map based on current state
      const newMarkers = new Map(prevMarkers);

      // Add or update markers for each event
      events.forEach(event => {
        // Check for valid coordinates in different formats
        if (!event.coordinates || !Array.isArray(event.coordinates) || event.coordinates.length !== 2) {
          // Try to use latitude/longitude if coordinates array is not available
          if ((event as any).latitude !== undefined && (event as any).longitude !== undefined &&
              !isNaN(Number((event as any).latitude)) && !isNaN(Number((event as any).longitude))) {
            // Create coordinates array from latitude/longitude
            event.coordinates = [Number((event as any).longitude), Number((event as any).latitude)];
          } else {
            console.warn('[PartyMapMarkers] Event missing valid coordinates:', event.id);
            return;
          }
        }

        const id = String(event.id);
        const isSelected = id === selectedEventId;
        const existingMarker = newMarkers.get(id);

        if (existingMarker) {
          // Only render if component is still mounted
          if (isMounted.current) {
            existingMarker.root.render(
              <PartyMarker
                event={event}
                isSelected={isSelected}
                onClick={() => onMarkerClick(event)}
              />
            );
          }
          return;
        }

        // Create new marker element and root
        const el = document.createElement('div');
        const root = createRoot(el);

        // Only render if component is still mounted
        if (isMounted.current) {
          root.render(
            <PartyMarker
              event={event}
              isSelected={isSelected}
              onClick={() => onMarkerClick(event)}
            />
          );
        }

        // Ensure coordinates are in the correct format [longitude, latitude]
        const coordinates = event.coordinates as [number, number];

        // Validate coordinates before creating marker
        if (isNaN(coordinates[0]) || isNaN(coordinates[1]) ||
            coordinates[0] < -180 || coordinates[0] > 180 ||
            coordinates[1] < -90 || coordinates[1] > 90) {
          console.warn('[PartyMapMarkers] Event has invalid coordinates:', event.id, coordinates);
          return;
        }

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(coordinates)
          .addTo(map);

        newMarkers.set(id, { marker, root });
      });

      // Remove markers that are no longer in the events list
      const currentIds = new Set(events.map(e => String(e.id)));
      Array.from(newMarkers.keys()).forEach(id => {
        if (!currentIds.has(id)) {
          const markerToRemove = newMarkers.get(id);
          if (markerToRemove) {
            markerToRemove.marker.remove();
            // Use a safe unmounting approach to prevent React warnings
            setTimeout(() => {
              if (markerToRemove && markerToRemove.root && isMounted.current) {
                try {
                  markerToRemove.root.unmount();
                } catch (e) {
                  console.warn('[PartyMapMarkers] Error during delayed unmount:', e);
                }
              }
            }, 0);
            newMarkers.delete(id);
          }
        }
      });

      return newMarkers;
    });
  }, [map, events, selectedEventId, onMarkerClick]);

  // Effect to update markers when props change
  useEffect(() => {
    updateMarkers();
  }, [map, events, selectedEventId, updateMarkers]);

  // Cleanup effect - only run once when component unmounts
  useEffect(() => {
    return () => {
      console.log('[PartyMapMarkers_DEBUG] Component unmounting, active markers:', activeMarkers.size);

      // Mark component as unmounted first
      isMounted.current = false;

      // Create a local copy of markers to avoid React state issues
      const markersToCleanup = Array.from(activeMarkers.entries());
      console.log('[PartyMapMarkers_DEBUG] Cleaning up', markersToCleanup.length, 'markers');

      // Remove mapbox markers immediately
      markersToCleanup.forEach(([id, { marker }]) => {
        console.log('[PartyMapMarkers_DEBUG] Removing marker:', id);
        marker.remove();
      });

      // Unmount React roots after a delay and outside of render cycle
      requestAnimationFrame(() => {
        markersToCleanup.forEach(([id, { root }]) => {
          try {
            console.log('[PartyMapMarkers_DEBUG] Unmounting root for marker:', id);
            root.unmount();
          } catch (e) {
            console.warn('[PartyMapMarkers_DEBUG] Error unmounting root:', e);
          }
        });
      });
    };
  }, []); // Empty dependency array so it only runs on mount/unmount

  return null;
};

export default PartyMapMarkers;
