// src/components/map/MapMarkers.tsx
import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot, type Root } from 'react-dom/client';
import PerformanceMonitor from '@/utils/performanceMonitor';
import type { Event } from '@/types'; // Import Event type

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'; // Corrected path
import { MapPin, Music, Trophy, Palette, Users, Utensils, CalendarDays, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils'; // Corrected path


// Marker batch processing constants
const MARKER_BATCH_SIZE = 50; // Increased batch size for potentially faster rendering
const MARKER_BATCH_DELAY = 10; // ms between batches

// Marker visibility constants
// Disabled visibility filtering for now to ensure all markers appear initially
// const MARKER_VISIBILITY_ZOOM_THRESHOLD = 10; // Zoom level at which to show all markers
// const MAX_VISIBLE_MARKERS_ZOOMED_OUT = 100; // Maximum number of markers to show when zoomed out

// Use a stable type for features passed to MapMarkers. Event is fine.
interface MapMarkersProps {
  map: mapboxgl.Map | null;
  features: Event[]; // Expect array of Event objects
  onMarkerClick: (event: Event) => void;
  selectedFeatureId: string | number | null;
}

// Map to store all markers
const markerMap = new Map<string, {
  marker: mapboxgl.Marker,
  root: Root, // Store the React root
  isSelected: boolean,
}>();


const MapMarkers = React.memo(({ map, features, onMarkerClick, selectedFeatureId }: MapMarkersProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
   // Ref to keep track of the IDs of markers currently being managed by this component
  const managedMarkerIdsRef = useRef<Set<string>>(new Set());
  const markersRef = useRef<{[key: string]: {marker: mapboxgl.Marker, root: Root, isSelected: boolean}}>(
  {}); // Keep markersRef for batch processing context if needed, though markerMap is primary


  // Console log for debugging the input features
  useEffect(() => {
    console.log(`[MARKERS] Received ${features ? features.length : 0} features to potentially display`);
    if (features && features.length > 0) {
      const sampleFeature = features[0];
      // Log sample point summary for debugging
      console.log('[MARKERS] Sample incoming feature summary:', {
          id: sampleFeature.id,
          title: sampleFeature.title,
          coordinates: sampleFeature.coordinates
      });
    } else {
      console.log('[MARKERS] No features received to display.');
    }
    console.log('[MARKERS] Current markers being managed before update:', managedMarkerIdsRef.current.size);

  }, [features]); // Log whenever the features prop changes


  // Memoize the click handler
  const handleMarkerClick = useCallback((feature: Event) => {
    const id = String(feature.id);
     if (!id) {
       console.warn('[MARKERS] Clicked feature has no ID:', feature);
       return;
     }
    // Log only ID and type (cluster/point) - Type is always 'Point' here as clustering is off
    console.log(`[MARKERS] Point clicked:`, id);
    onMarkerClick(feature); // Propagate the original event object
  }, [onMarkerClick]);

  // Main effect to manage markers based on the list of features
  useEffect(() => {
    if (!map) {
        console.log('[MARKERS] Map not available, skipping marker update.');
        // We don't clear markers here, rely on the unmount cleanup
        return;
    }

     if (!features || features.length === 0) {
        console.log('[MARKERS] No features to display. Clearing all currently managed markers.');
         // Remove all currently managed markers
        managedMarkerIdsRef.current.forEach(id => {
            const entry = markerMap.get(id);
            if (entry) {
                 try {
                    entry.root.unmount();
                    entry.marker.remove();
                 } catch (e) {
                     console.error('[MARKERS] Error cleaning up marker on removal:', id, e);
                 }
                markerMap.delete(id);
            }
        });
        managedMarkerIdsRef.current.clear();
        setIsProcessing(false); // Ensure processing is off if there are no features
        PerformanceMonitor.endMeasure('markerUpdateCycle', { result: 'no_features' });
        return;
     }

    if (isProcessing) {
        console.log('[MARKERS] Already processing markers, skipping update cycle.');
        return;
    }

    setIsProcessing(true);
    PerformanceMonitor.startMeasure('markerUpdateCycle', { featuresCount: features.length });
    console.log(`[MARKERS] Starting marker update cycle for ${features.length} features.`);

    const nextFeatureIds = new Set<string>();
    const featuresToProcess: Event[] = [];

    // Determine which features are new or need updates
    for (const feature of features) {
        const id = String(feature.id);
        if (!id) {
            console.warn('[MARKERS] Skipping feature with no ID:', feature);
            continue;
        }
        nextFeatureIds.add(id);

         // Basic coordinate validation upfront
        if (!feature.coordinates || !Array.isArray(feature.coordinates) || feature.coordinates.length !== 2 || isNaN(feature.coordinates[0]) || isNaN(feature.coordinates[1])) {
             console.warn('[MARKERS] Skipping feature with invalid or missing coordinates:', id, feature.coordinates);
             continue; // Skip features without valid coordinates
        }


        // Check if the marker already exists
        const existingEntry = markerMap.get(id);
        const isSelected = String(selectedFeatureId) === id;

        if (existingEntry) {
            // Marker exists, check if it needs update (e.g., selection state changed or coordinates changed)
             const currentCoords = existingEntry.marker.getLngLat();
             const coordsChanged = currentCoords.lng !== feature.coordinates[0] || currentCoords.lat !== feature.coordinates[1];

             if (existingEntry.isSelected !== isSelected || coordsChanged) {
                console.log(`[MARKERS] Updating selection state or coordinates for marker ID: ${id}. Selected: ${existingEntry.isSelected} -> ${isSelected}. Coords Changed: ${coordsChanged}`);
                // Mark for re-render if selection changed or coords moved
                featuresToProcess.push(feature);
             }
            // No need to re-add the marker unless selection changed (handled below)
        } else {
            // Marker is new, add it to the process list
            featuresToProcess.push(feature);
        }
    }

    // Remove markers that are no longer in the features list
    const markersToRemove = Array.from(managedMarkerIdsRef.current).filter(id => !nextFeatureIds.has(id));
    if (markersToRemove.length > 0) {
      console.log(`[MARKERS] Removing ${markersToRemove.length} markers.`);
      markersToRemove.forEach(id => {
          const entry = markerMap.get(id);
          if (entry) {
               try {
                entry.root.unmount(); // Unmount React root
                entry.marker.remove(); // Remove Mapbox marker
               } catch (e) {
                   console.error('[MARKERS] Error cleaning up marker on removal:', id, e);
               }
              markerMap.delete(id);
              managedMarkerIdsRef.current.delete(id);
          }
      });
    }

    // Update the set of IDs managed by this component
    managedMarkerIdsRef.current = nextFeatureIds;


    // Process features that are new or need updates in batches
    if (featuresToProcess.length > 0) {
         console.log(`[MARKERS] Processing ${featuresToProcess.length} new or updated features in batches.`);
         // Clear processing state only after all batches are done
         processBatch(map, featuresToProcess, handleMarkerClick, selectedFeatureId, 0);
    } else {
        // No new/updated features to process, cycle finished
        setIsProcessing(false);
        PerformanceMonitor.endMeasure('markerUpdateCycle', { result: 'no_changes_to_process' });
        console.log('[MARKERS] Marker update cycle finished (no changes needed).');
    }


    // Cleanup function for the effect
    return () => {
      // This cleanup runs when features or map change, *before* the new effect runs
      // It does NOT clear markers here, the logic above handles removals for updated feature lists.
      // Full cleanup on component unmount is in a separate effect.
      console.log('[MARKERS] Effect cleanup triggered.');
    };
  }, [map, features, selectedFeatureId, handleMarkerClick, isProcessing]);


  // Effect to process features in batches
  const processBatch = useCallback((
    currentMap: mapboxgl.Map,
    featuresBatch: Event[], // Expect array of Event objects
    currentOnClick: (feature: Event) => void,
    currentSelectedFeatureId: string | number | null,
    startIdx = 0
  ) => {
    if (!featuresBatch || startIdx >= featuresBatch.length) {
      console.log('[MARKERS] Batch processing finished.');
      setIsProcessing(false); // Mark processing as complete AFTER all batches are done
      PerformanceMonitor.endMeasure('markerBatchProcessing');
      return;
    }

    PerformanceMonitor.startMeasure('markerBatchProcessing', { startIdx, batchSize: MARKER_BATCH_SIZE });
    const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, featuresBatch.length);
    const batch = featuresBatch.slice(startIdx, endIdx);

    console.log(`[MARKERS] Processing batch from index ${startIdx} to ${endIdx}. Batch size: ${batch.length}`);

    // Request a frame to ensure updates are painted
    requestAnimationFrame(() => {
        for (const feature of batch) {
             const id = String(feature.id);
             // Coordinates were validated before adding to featuresBatch
             const coordinates = feature.coordinates as [number, number];
             const isSelected = String(currentSelectedFeatureId) === id;
             const existingEntry = markerMap.get(id);

            if (existingEntry) {
                 // Update React component if selection state changed or coords moved
                 if (existingEntry.isSelected !== isSelected || existingEntry.marker.getLngLat().toArray().join(',') !== coordinates.join(',')) {
                    existingEntry.root.render(
                      <EventMarker
                        event={feature}
                        isSelected={isSelected}
                        onClick={() => currentOnClick(feature)}
                      />
                    );
                    existingEntry.isSelected = isSelected;
                    // Update position if coordinates changed
                    if (existingEntry.marker.getLngLat().toArray().join(',') !== coordinates.join(',')) {
                       existingEntry.marker.setLngLat(coordinates);
                       console.log(`[MARKERS] Updated coordinates for marker ${id} to [${coordinates[0]}, ${coordinates[1]}]`);
                    }
                 }

                 // If selected, bring to front by re-adding
                 if (isSelected) {
                     const markerElement = existingEntry.marker.getElement();
                     const parent = markerElement.parentElement;
                     // Check if the marker is not already the very last element
                     if (parent && parent.lastChild !== markerElement) {
                       existingEntry.marker.remove();
                       existingEntry.marker.addTo(currentMap);
                       console.log(`[MARKERS] Brought marker ${id} to front.`);
                     }
                 }

            } else {
                // Create new marker
                const markerEl = document.createElement('div');
                markerEl.setAttribute('aria-label', `Event: ${feature.title || id}`);
                markerEl.style.cursor = 'pointer'; // Ensure cursor is pointer

                const root = createRoot(markerEl);

                root.render(
                  <EventMarker
                    event={feature}
                    isSelected={isSelected}
                    onClick={() => currentOnClick(feature)}
                  />
                );

                 const lngLat: [number, number] = coordinates;

                const marker = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
                  .setLngLat(lngLat)
                  .addTo(currentMap);

                markerMap.set(id, { marker, root, isSelected });
                console.log(`[MARKERS] Added new marker for ID: ${id} at [${lngLat[0]}, ${lngLat[1]}]`);
            }
        }

        PerformanceMonitor.endMeasure('markerBatchProcessing');

        // Schedule the next batch
        setTimeout(() => {
          processBatch(currentMap, featuresBatch, currentOnClick, currentSelectedFeatureId, endIdx);
        }, MARKER_BATCH_DELAY); // Wait for the specified delay
    }); // requestAnimationFrame for smoother rendering
  }, [setIsProcessing, markersRef, selectedFeatureId]); // Include markersRef and selectedFeatureId if they are used


  // Effect to handle component unmount - clears all markers managed by this instance
  useEffect(() => {
      // Cleanup on component unmount
      return () => {
        console.log('[MARKERS] Component unmounting, cleaning up all managed markers.');
        managedMarkerIdsRef.current.forEach(id => {
            const entry = markerMap.get(id);
            if (entry) {
                try {
                   entry.root.unmount(); // Unmount React root
                   entry.marker.remove(); // Remove Mapbox marker
                } catch (e) {
                   console.error('[MARKERS] Error cleaning up marker on unmount:', id, e);
                }
                markerMap.delete(id);
            }
        });
        managedMarkerIdsRef.current.clear(); // Clear the set of managed IDs
        setIsProcessing(false); // Ensure processing state is reset
      };
  }, []); // This effect runs only on mount and unmount


  return null; // This component renders nothing itself, it manages Mapbox markers
});


// Simple EventMarker component (Keep as is, assumed to be working)
const EventMarker: React.FC<{
  event: Event; // Expect Event object
  isSelected: boolean;
  onClick: () => void;
}> = memo(({ event, isSelected, onClick }) => {
  // Use event.category directly as we expect normalized Event objects
  const category = event.category || 'other';

  const CATEGORY_ICONS = {
    music: Music,
    sports: Trophy,
    arts: Palette,
    theatre: Palette,
    family: Users,
    food: Utensils,
    restaurant: Utensils,
    party: PartyPopper,
    other: CalendarDays,
    default: CalendarDays,
  };

  // Removed redundant declaration, IconComponent is derived in markerStyles below

  const markerStyles = useMemo(() => {
    let bgColorClass = '';
    if (isSelected) {
      bgColorClass = 'bg-primary ring-2 ring-primary-foreground shadow-lg shadow-primary/30';
    } else {
      switch(category.toLowerCase()) {
        case 'music': bgColorClass = 'bg-blue-600/80'; break; // Added opacity
        case 'sports': bgColorClass = 'bg-green-600/80'; break;
        case 'arts':
        case 'theatre': bgColorClass = 'bg-pink-600/80'; break;
        case 'family': bgColorClass = 'bg-yellow-600/80'; break;
        case 'food':
        case 'restaurant': bgColorClass = 'bg-orange-600/80'; break;
        case 'party': bgColorClass = 'bg-purple-600/80'; break;
        default: bgColorClass = 'bg-gray-600/80';
      }
    }

    const textColor = isSelected ? 'text-primary-foreground' : 'text-white'; // Ensure text is white or foreground
    const scale = isSelected ? 'scale-125 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'scale-100'; // Adjusted glow for selected
    const animation = isSelected ? 'animate-pulse' : '';
    return { IconComponent, bgColor: bgColorClass, textColor, scale, animation, category };
  }, [category, isSelected]);

  const { IconComponent, bgColor, textColor, scale, animation } = markerStyles;

  const tooltipContent = useMemo(() => (
    <div className="p-1"> {/* Added padding */}
      <div className="font-semibold text-sm">{event.title || 'Unknown Event'}</div> {/* Adjusted font size */}
      {event.date && (
        <div className="text-xs text-muted-foreground">{event.date}</div>
      )}
      {event.venue && (
        <div className="text-xs text-muted-foreground">{event.venue}</div>
      )}
       {event.location && !event.venue && ( // Show location if venue is not available
         <div className="text-xs text-muted-foreground">{event.location}</div>
       )}
    </div>
  ), [event.title, event.date, event.venue, event.location]); // Added location to dependencies

  return (
      <Tooltip delayDuration={isSelected ? 0 : 300}> {/* Faster tooltip for selected, slight delay for others */}
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'cursor-pointer transition-all duration-200 ease-in-out focus:outline-none rounded-full flex items-center justify-center border border-border/50 shadow-md backdrop-blur-sm',
              bgColor,
              scale,
              animation,
              {
                'w-8 h-8': !isSelected, // Increased default size
                'w-10 h-10': isSelected, // Increased selected size
                'z-20': isSelected,
                'z-10': !isSelected,
                'hover:shadow-lg hover:scale-110': !isSelected, // Add hover effect for non-selected
              }
            )}
            aria-label={`Event: ${event.title || 'Unknown event'}`}
          >
            <IconComponent className={cn('h-5 w-5', textColor)} strokeWidth={2} /> {/* Increased icon size */}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
  );
});

MapMarkers.displayName = 'MapMarkers';

export default MapMarkers;
