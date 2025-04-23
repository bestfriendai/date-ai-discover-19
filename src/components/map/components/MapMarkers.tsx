// src/components/map/MapMarkers.tsx
'use client';

import * as React from 'react';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import PerformanceMonitor from '@/utils/performanceMonitor';
import type { Event } from '@/types';
import { validateCoordinates, isLikelyOnLand, applyCoordinateJitter } from '@/utils/mapUtils';

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
// Import icons from lucide-react
import { Music, Palette, Trophy, Users, Utensils, CalendarDays, PartyPopper, Sparkle, Headphones, Package, Sun, Coffee, Network, Wine, Building, MapPin } from 'lucide-react';

// Re-export PartySubcategory type here since we can't import from partyUtils
type PartySubcategory =
  | 'day-party'
  | 'social'
  | 'brunch'
  | 'club'
  | 'networking'
  | 'celebration'
  | 'immersive'
  | 'popup'
  | 'silent'
  | 'rooftop'
  | 'general';

// Type guard for PartySubcategory
function isPartySubcategory(value: string): value is PartySubcategory {
  return [
    'day-party',
    'social',
    'brunch',
    'club',
    'networking',
    'celebration',
    'immersive',
    'popup',
    'silent',
    'rooftop',
    'general'
  ].includes(value);
}
import { cn } from '@/lib/utils';

// Marker batch processing constants - increased for better performance
const MARKER_BATCH_SIZE = 100; // Process more markers per batch
const MARKER_BATCH_DELAY = 5; // Reduced delay between batches

// Interface for marker props
type MapMarkersProps = {
  map: mapboxgl.Map | null;
  features: Event[];
  onMarkerClick: (event: Event) => void;
  selectedFeatureId: string | number | null;
}

// Global map to store all markers - this prevents recreation on component re-renders
const markerMap = new Map<string, {
  marker: mapboxgl.Marker;
  root: Root;
  isSelected: boolean;
}>();

// Type for managed marker IDs
type MarkerIdSet = Set<string>;

// Get category icon based on category name
const getCategoryIcon = (category: string | undefined, partySubcategory?: PartySubcategory) => {
  const lowerCategory = category?.toLowerCase() || 'other';
  switch(lowerCategory) {
    case 'music': return <Music className="h-5 w-5 text-white" />;
    case 'arts': return <Palette className="h-5 w-5 text-white" />;
    case 'theatre': return <Palette className="h-5 w-5 text-white" />;
    case 'sports': return <Trophy className="h-5 w-5 text-white" />;
    case 'family': return <Users className="h-5 w-5 text-white" />;
    case 'food': return <Utensils className="h-5 w-5 text-white" />;
    case 'restaurant': return <Utensils className="h-5 w-5 text-white" />;
    case 'party':
      if (partySubcategory && isPartySubcategory(partySubcategory)) {
        switch(partySubcategory) {
          case 'immersive': return <Sparkle className="h-5 w-5 text-white" />;
          case 'silent': return <Headphones className="h-5 w-5 text-white" />;
          case 'popup': return <Package className="h-5 w-5 text-white" />;
          case 'day-party': return <Sun className="h-5 w-5 text-white" />;
          case 'brunch': return <Coffee className="h-5 w-5 text-white" />;
          case 'networking': return <Network className="h-5 w-5 text-white" />;
          case 'club': return <Wine className="h-5 w-5 text-white" />;
          case 'rooftop': return <Building className="h-5 w-5 text-white" />;
          default: return <PartyPopper className="h-5 w-5 text-white" />;
        }
      }
      return <PartyPopper className="h-5 w-5 text-white" />;
    default: return <CalendarDays className="h-5 w-5 text-white" />;
  }
};

const MapMarkers = React.memo<MapMarkersProps>(({ map, features, onMarkerClick, selectedFeatureId }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  // Ref to keep track of the IDs of markers currently being managed by this component
  const managedMarkerIdsRef = useRef<MarkerIdSet>(new Set());
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
    const featuresToUpdate: Event[] = [];

    // Determine which features are new or need updates
    for (const feature of features) {
        const id = String(feature.id);
        if (!id) {
            console.warn('[MARKERS] Skipping feature with no ID:', feature);
            continue;
        }
        nextFeatureIds.add(id);

        // Validate coordinates using our utility function
        if (!validateCoordinates(feature.coordinates)) {
            console.warn('[MARKERS] Skipping feature with invalid coordinates:', {
                id,
                coordinates: feature.coordinates
            });
            continue; // Skip features without valid coordinates
        }

        // Skip features that are likely in the middle of oceans
        if (!isLikelyOnLand(feature.coordinates as [number, number])) {
            console.log('[MARKERS] Skipping feature likely in ocean:', {
                id,
                coordinates: feature.coordinates
            });
            continue;
        }

        // Check if the marker already exists
        const existingEntry = markerMap.get(id);
        const isSelected = String(selectedFeatureId) === id;

        if (existingEntry) {
            // Marker exists, check if it needs update
            const currentCoords = existingEntry.marker.getLngLat();
            const featureCoords = feature.coordinates as [number, number];
            const coordsChanged = (
                Math.abs(currentCoords.lng - featureCoords[0]) > 0.0000001 ||
                Math.abs(currentCoords.lat - featureCoords[1]) > 0.0000001
            );
            const selectionChanged = existingEntry.isSelected !== isSelected;

            // Update marker position if needed
            if (coordsChanged) {
                existingEntry.marker.setLngLat([
                    featureCoords[0],
                    featureCoords[1]
                ]);
            }

            // If selection state changed, add to update list
            if (selectionChanged) {
                featuresToUpdate.push(feature);
            }
        } else {
            // Marker is new, add it to the process list
            featuresToProcess.push(feature);
        }
    }

    // Remove markers that are no longer in the features list
    const markersToRemove = Array.from(managedMarkerIdsRef.current as Set<string>).filter(id => !nextFeatureIds.has(id));
    if (markersToRemove.length > 0) {
        console.log(`[MARKERS] Removing ${markersToRemove.length} markers that are no longer in the features list.`);
        markersToRemove.forEach(id => {
            const entry = markerMap.get(id);
            if (entry) {
                try {
                    // Use a safe unmounting approach to prevent React warnings
                    setTimeout(() => {
                      if (entry && entry.root) {
                        try {
                          entry.root.unmount();
                          entry.marker.remove();
                        } catch (e) {
                          console.warn('[MARKERS] Error during delayed unmount:', e);
                        }
                      }
                    }, 0);
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

    // Update existing markers that need selection state changes
    if (featuresToUpdate.length > 0) {
        console.log(`[MARKERS] Updating ${featuresToUpdate.length} existing markers.`);
        featuresToUpdate.forEach(feature => {
            const id = String(feature.id);
            const existingEntry = markerMap.get(id);
            const isSelected = String(selectedFeatureId) === id;

            if (existingEntry) {
                // Re-render the React component to update selection state
                existingEntry.root.render(
                    <TooltipProvider delayDuration={0}>
                        <EventMarker
                            event={feature}
                            isSelected={isSelected}
                            onClick={() => handleMarkerClick(feature)}
                        />
                    </TooltipProvider>
                );

                // Update the stored selection state
                existingEntry.isSelected = isSelected;

                // Bring selected markers to front
                if (isSelected) {
                    existingEntry.marker.remove();
                    existingEntry.marker.addTo(map);
                }
            }
        });
    }

    // Process new markers (in batches if needed to avoid jank)
    if (featuresToProcess.length > 0) {
        console.log(`[MARKERS] Processing ${featuresToProcess.length} new markers.`);
        // Start the batch processing chain
        processBatch(map, featuresToProcess, handleMarkerClick, selectedFeatureId, 0);
    } else {
        // No new features to process, cycle finished
        setIsProcessing(false);
        PerformanceMonitor.endMeasure('markerUpdateCycle', { result: 'no_new_markers' });
        console.log(`[MARKERS] Marker update cycle finished.`);
        console.log(`[MARKERS] Total markers now displayed: ${markerMap.size}`);
    }

    return () => {
      // Cleanup function - doesn't remove markers, just logs
      console.log('[MARKERS] Effect cleanup triggered.');
    };
  }, [map, features, selectedFeatureId, handleMarkerClick, isProcessing]);


  // Process features in batches to avoid UI jank
  const processBatch = useCallback((
    currentMap: mapboxgl.Map,
    featuresBatch: Event[],
    currentOnClick: (feature: Event) => void,
    currentSelectedFeatureId: string | number | null,
    startIdx = 0
  ) => {
    // Exit condition: all features processed
    if (!featuresBatch || startIdx >= featuresBatch.length) {
      console.log('[MARKERS] Batch processing finished.');
      setIsProcessing(false); // Mark processing as complete
      PerformanceMonitor.endMeasure('markerUpdateCycle', {
        result: 'success',
        processedMarkers: featuresBatch.length
      });
      return;
    }

    // Calculate batch range
    const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, featuresBatch.length);
    const batch = featuresBatch.slice(startIdx, endIdx);

    console.log(`[MARKERS] Processing batch from index ${startIdx} to ${endIdx}. Batch size: ${batch.length}`);

    // Use requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
        // Process each feature in the current batch
        for (const feature of batch) {
            const id = String(feature.id);
            // Apply small jitter to coordinates to prevent overlapping markers
            const coordinates = applyCoordinateJitter(feature.coordinates as [number, number]);
            const isSelected = String(currentSelectedFeatureId) === id;

            try {
                // Create a new marker element
                const el = document.createElement('div');
                el.className = 'custom-marker';
                el.dataset.id = id;

                // Create React root and render marker component
                const root = createRoot(el);
                const clickHandler = () => currentOnClick(feature);

                root.render(
                  <TooltipProvider delayDuration={0}>
                    <EventMarker
                      event={feature}
                      isSelected={isSelected}
                      onClick={clickHandler}
                    />
                  </TooltipProvider>
                );

                // Create and add the Mapbox marker
                const marker = new mapboxgl.Marker({
                  element: el,
                  anchor: 'center',
                })
                  .setLngLat(coordinates)
                  .addTo(currentMap);

                // Store the marker and its React root for future management
                markerMap.set(id, { marker, root, isSelected });
                managedMarkerIdsRef.current.add(id);
            } catch (error) {
                console.error(`[MARKERS] Error creating marker for feature ${id}:`, error);
            }
        }

        // Schedule the next batch with a small delay
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
            // Use a safe unmounting approach to prevent React warnings
            setTimeout(() => {
              if (entry && entry.root) {
                try {
                  entry.root.unmount();
                  entry.marker.remove();
                } catch (e) {
                  console.warn('[MARKERS] Error during delayed unmount:', e);
                }
              }
            }, 0);
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


// EventMarker component with enhanced party subcategory support
interface EventMarkerProps {
  event: Event;
  isSelected: boolean;
  onClick: () => void;
}

const EventMarker = React.memo<EventMarkerProps>(({ event, isSelected, onClick }) => {
  // Use event.category directly as we expect normalized Event objects
  const category = event.category || 'other';

  const markerStyles = useMemo(() => {
    let bgColorClass = '';
    if (isSelected) {
      bgColorClass = 'bg-indigo-600 ring-2 ring-white shadow-lg shadow-indigo-500/40';
    } else {
      if (category?.toLowerCase() === 'party' && event.partySubcategory && isPartySubcategory(event.partySubcategory)) {
        // Enhanced colors for party subcategories
        const subcategory = event.partySubcategory as PartySubcategory;
        const colorMap: Record<PartySubcategory, string> = {
          'immersive': 'bg-purple-600/90',
          'silent': 'bg-cyan-600/90',
          'popup': 'bg-lime-600/90',
          'day-party': 'bg-yellow-600/90',
          'brunch': 'bg-orange-600/90',
          'networking': 'bg-blue-600/90',
          'club': 'bg-violet-600/90',
          'rooftop': 'bg-emerald-600/90',
          'social': 'bg-violet-600/90',
          'celebration': 'bg-violet-600/90',
          'general': 'bg-violet-600/90'
        };
        bgColorClass = colorMap[subcategory];
      } else {
        // Regular category colors
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
    }

    const textColor = 'text-white'; // Always ensure text is white for better readability
    const scale = isSelected ? 'scale-125 drop-shadow-[0_0_8px_rgba(79,70,229,0.6)]' : 'scale-100'; // Indigo glow for selected
    const animation = isSelected ? 'animate-pulse' : '';
    return { bgColor: bgColorClass, textColor, scale, animation, category };
  }, [category, isSelected]);

  const { bgColor, scale, animation } = markerStyles;

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
            {getCategoryIcon(category, event.partySubcategory)}
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
