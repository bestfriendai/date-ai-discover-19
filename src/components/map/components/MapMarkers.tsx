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

// Get category icon based on category name
const getCategoryIcon = (category: string | undefined) => {
  const lowerCategory = category?.toLowerCase() || 'other';
  switch(lowerCategory) {
    case 'music': return <Music className="h-5 w-5 text-white" />;
    case 'arts': return <Palette className="h-5 w-5 text-white" />;
    case 'theatre': return <Palette className="h-5 w-5 text-white" />;
    case 'sports': return <Trophy className="h-5 w-5 text-white" />;
    case 'family': return <Users className="h-5 w-5 text-white" />;
    case 'food': return <Utensils className="h-5 w-5 text-white" />;
    case 'restaurant': return <Utensils className="h-5 w-5 text-white" />;
    case 'party': return <PartyPopper className="h-5 w-5 text-white" />;
    default: return <CalendarDays className="h-5 w-5 text-white" />;
  }
};

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
        // Clear the set of managed markers
        managedMarkerIdsRef.current = new Set();
        return;
    }

    // Skip if already processing a batch
    if (isProcessing) {
        console.log('[MARKERS] Still processing previous batch, skipping.');
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

        // Check if feature has valid coordinates
        if (!feature.coordinates || !Array.isArray(feature.coordinates) || feature.coordinates.length < 2) {
            console.warn('[MARKERS] Skipping feature with invalid coordinates:', {
                id,
                coordinates: feature.coordinates
            });
            continue; // Skip features without valid coordinates
        }

        // Check if the marker already exists
        const existingEntry = markerMap.get(id);
        const isSelected = String(selectedFeatureId) === id;

        if (existingEntry) {
            // Marker exists, check if it needs update (e.g., selection state changed or coordinates changed)
             const currentCoords = existingEntry.marker.getLngLat();
             const featureCoords = feature.coordinates as [number, number];
             const coordsChanged = (
                 currentCoords.lng !== featureCoords[0] ||
                 currentCoords.lat !== featureCoords[1]
             );

             // Update marker position if needed
             if (coordsChanged) {
                 existingEntry.marker.setLngLat([
                     featureCoords[0],
                     featureCoords[1]
                 ]);
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
        console.log(`[MARKERS] Removing ${markersToRemove.length} markers that are no longer in the features list.`);
        markersToRemove.forEach(id => {
            const entry = markerMap.get(id);
            if (entry) {
                try {
                    entry.root.unmount();
                    entry.marker.remove();
                } catch (e) {
                    console.error('[MARKERS] Error cleaning up marker on removal:', id, e);
                }
                markerMap.delete(id);
                managedMarkerIdsRef.current.delete(id);
            } else {
                console.warn(`[MARKERS] Marker ${id} not found in markerMap but was in managedMarkerIds.`);
                managedMarkerIdsRef.current.delete(id);
            }
        });
    }

    // Process new markers or update existing ones (in batches if needed to avoid jank)
    if (featuresToProcess.length > 0) {
        console.log(`[MARKERS] Processing ${featuresToProcess.length} new or updated markers.`);
         // Start the batch processing chain
         // Clear processing state only after all batches are done
         processBatch(map, featuresToProcess, handleMarkerClick, selectedFeatureId, 0);
    } else {
        // No new/updated features to process, cycle finished
        setIsProcessing(false);
        PerformanceMonitor.endMeasure('markerUpdateCycle', { result: 'no_changes_to_process' });
        console.log(`[MARKERS] No new markers to create, update cycle finished.`);
        console.log(`[MARKERS] Total markers now displayed: ${markerMap.size}`);
        console.log(`[MARKERS] Total markers currently managed: ${managedMarkerIdsRef.current.size}`);
    }

    return () => {
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
      PerformanceMonitor.endMeasure('markerUpdateCycle', {
        result: 'success',
        processedMarkers: featuresBatch.length
      });
      return;
    }

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

             // Skip if marker already exists with same selected state
             if (existingEntry && existingEntry.isSelected === isSelected) {
               // Ensure marker coordinates are up to date
               // This is redundant as we already update coords in the main loop
               // But keeping it for safety
               const markerCoords = existingEntry.marker.getLngLat();
               if (markerCoords.lng !== coordinates[0] || markerCoords.lat !== coordinates[1]) {
                 existingEntry.marker.setLngLat(coordinates);
               }
               continue; // Skip re-creation if already exists with same selected state
             }

             // Create or update this marker
             try {
                // If marker already exists but selection state changed, clean it up first
                if (existingEntry) {
                   existingEntry.root.unmount();
                   existingEntry.marker.remove();
                   markerMap.delete(id);
                }

                const el = document.createElement('div');
                // Add a custom class that we can use for hit testing
                el.className = 'custom-marker';
                el.dataset.id = id;

                const root = createRoot(el);
                const clickHandler = () => currentOnClick(feature);

                root.render(
                  <EventMarker
                    event={feature}
                    isSelected={isSelected}
                    onClick={clickHandler}
                  />
                );

                const marker = new mapboxgl.Marker({
                  element: el,
                  anchor: 'center',
                })
                  .setLngLat(coordinates)
                  .addTo(currentMap);

                // Store the marker and its React root for future cleanup
                markerMap.set(id, { marker, root, isSelected });
                managedMarkerIdsRef.current.add(id);
             } catch (error) {
                console.error(`[MARKERS] Error creating marker for feature ${id}:`, error);
             }
        }

        // Schedule the next batch after a short delay
        setTimeout(() => {
            processBatch(currentMap, featuresBatch, currentOnClick, currentSelectedFeatureId, endIdx);
        }, MARKER_BATCH_DELAY);
    });
  }, []);

  // Effect to clean up all markers when component unmounts
  useEffect(() => {
    return () => {
      console.log('[MARKERS] Component unmounting, cleaning up all markers...');
      // Loop through all markers we've been tracking and remove them
      managedMarkerIdsRef.current.forEach(id => {
        const entry = markerMap.get(id);
        if (entry) {
          try {
            entry.root.unmount();
            entry.marker.remove();
          } catch (e) {
            console.error('[MARKERS] Error during cleanup of marker on unmount:', id, e);
          }
          markerMap.delete(id);
        }
      });
      // Clear our tracking set
      managedMarkerIdsRef.current.clear();
      console.log('[MARKERS] All markers cleaned up.');
    };
  }, []);

  // Optionally render current stats for debugging
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

  const markerStyles = useMemo(() => {
    let bgColorClass = '';
    if (isSelected) {
      bgColorClass = 'bg-indigo-600 ring-2 ring-white shadow-lg shadow-indigo-500/40';
    } else {
      switch(category?.toLowerCase()) {
        case 'music': bgColorClass = 'bg-indigo-600/90'; break;
        case 'sports': bgColorClass = 'bg-emerald-600/90'; break;
        case 'arts':
        case 'theatre': bgColorClass = 'bg-pink-600/90'; break;
        case 'family': bgColorClass = 'bg-amber-600/90'; break;
        case 'food':
        case 'restaurant': bgColorClass = 'bg-orange-600/90'; break;
        case 'party': bgColorClass = 'bg-violet-600/90'; break;
        default: bgColorClass = 'bg-gray-600/90';
      }
    }

    const textColor = 'text-white'; // Always ensure text is white for better readability
    const scale = isSelected ? 'scale-125 drop-shadow-[0_0_8px_rgba(79,70,229,0.6)]' : 'scale-100'; // Indigo glow for selected
    const animation = isSelected ? 'animate-pulse' : '';
    return { bgColor: bgColorClass, textColor, scale, animation, category };
  }, [category, isSelected]);

  const { bgColor, textColor, scale, animation } = markerStyles;

  const tooltipContent = useMemo(() => (
    <div className="p-3 max-w-xs bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg shadow-xl"> 
      <div className="font-bold text-base mb-1">{event.title || 'Unknown Event'}</div>
      {event.date && (
        <div className="text-sm font-medium text-indigo-300 mb-1 flex items-center">
          <CalendarDays className="mr-1 h-3.5 w-3.5" />
          {event.date} {event.time && `• ${event.time}`}
        </div>
      )}
      {event.venue && (
        <div className="text-sm text-slate-300 mb-1 flex items-center">
          <MapPin className="mr-1 h-3.5 w-3.5" />
          {event.venue}
        </div>
      )}
      {event.location && !event.venue && (
        <div className="text-sm text-slate-300 mb-1 flex items-center">
          <MapPin className="mr-1 h-3.5 w-3.5" />
          {event.location}
        </div>
      )}
      {event.category && (
        <div className="mt-2 flex items-center gap-1">
          <div className="text-xs bg-indigo-600/20 text-indigo-300 rounded-full px-2 py-0.5 font-medium">
            {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
          </div>
          {event.price && (
            <div className="text-xs bg-slate-700/60 text-slate-300 rounded-full px-2 py-0.5 font-medium">
              {event.price}
            </div>
          )}
        </div>
      )}
    </div>
  ), [event.title, event.date, event.time, event.venue, event.location, event.category, event.price]); 

  return (
      <Tooltip delayDuration={isSelected ? 0 : 300}> 
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'cursor-pointer transition-all duration-200 ease-in-out focus:outline-none rounded-full flex items-center justify-center border border-white/20 shadow-md backdrop-blur-sm',
              bgColor,
              scale,
              animation,
              {
                'w-9 h-9': !isSelected, // Slightly larger default size
                'w-11 h-11': isSelected, // Larger selected size
                'z-20': isSelected,
                'z-10': !isSelected,
                'hover:shadow-lg hover:scale-110': !isSelected, // Add hover effect for non-selected
              }
            )}
            aria-label={`Event: ${event.title || 'Unknown event'}`}
          >
            {getCategoryIcon(category)}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="z-[9999]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
  );
});

MapMarkers.displayName = 'MapMarkers';

export default MapMarkers;
