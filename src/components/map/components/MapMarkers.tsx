
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';
import type { Event } from '@/types';

// Batch size for processing markers to prevent UI freezing
const MARKER_BATCH_SIZE = 25;
const MARKER_BATCH_DELAY = 5; // ms between batches

interface CustomFeature {
  id?: string;
  properties: {
    id?: string;
    cluster_id?: string;
    cluster?: boolean;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number];
  };
  // Add missing Event properties as optional
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
  image?: string;
  url?: string;
  price?: string;
  source?: string;
  coordinates?: [number, number];
}

interface MapMarkersProps {
  map: mapboxgl.Map;
  features: CustomFeature[];
  onMarkerClick: (feature: CustomFeature) => void;
  selectedFeatureId: string | null;
}

export const MapMarkers = memo(({ map, features, onMarkerClick, selectedFeatureId }: MapMarkersProps) => {
  const markersRef = useRef<{[key: string]: {marker: mapboxgl.Marker, root: ReturnType<typeof createRoot>, isSelected: boolean}}>(
  {});
  const [isProcessing, setIsProcessing] = useState(false);
  const currentFeaturesRef = useRef<CustomFeature[]>([]);

  // Console log for debugging
  useEffect(() => {
    console.log(`[MARKERS] Received ${features.length} features to display`);
    const clusters = features.filter(e => e.properties.cluster);
    const points = features.filter(e => !e.properties.cluster);
    console.log(`[MARKERS] Breakdown: ${clusters.length} clusters, ${points.length} points`);

    // Log sample points for debugging
    if (points.length > 0) {
      const samplePoint = points[0];
      console.log('[MARKERS] Sample point:', JSON.stringify(samplePoint));
      console.log('[MARKERS] Sample point coordinates:', samplePoint.geometry.coordinates);
    } else {
      console.warn('[MARKERS] No individual points to display!');
    }

    // Check if any markers are already in the DOM
    console.log('[MARKERS] Current markers in ref:', Object.keys(markersRef.current).length);
  }, [features]);

  // Memoize the click handler to prevent unnecessary re-renders
  const handleMarkerClick = useCallback((feature: CustomFeature) => {
    const id = String(feature.properties?.id ?? feature.properties?.cluster_id);
    console.log('[MARKERS] Marker clicked:', id);
    onMarkerClick(feature);
  }, [onMarkerClick]);

  // Process markers in batches to prevent UI freezing
  const processBatch = useCallback((validFeatures: CustomFeature[], startIdx: number) => {
    if (startIdx >= validFeatures.length) {
      console.log(`[MARKERS] Finished processing all ${validFeatures.length} markers`);
      setIsProcessing(false);
      return;
    }

    const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, validFeatures.length);

    // Process this batch
    for (let i = startIdx; i < endIdx; i++) {
      const feature = validFeatures[i];

      // Skip invalid features
      if (!feature || !feature.geometry || !feature.geometry.coordinates) {
        continue;
      }

      const id = String(feature.properties?.id ?? feature.properties?.cluster_id);
      if (!id) continue;

      // Skip if marker already exists and selected state hasn't changed
      const existingMarker = markersRef.current[id];
      const isSelected = selectedFeatureId === id;

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
  }, [map, selectedFeatureId, handleMarkerClick]);

  // Main effect to manage markers
  useEffect(() => {
    if (!map || isProcessing || !features.length) return;

    // Start processing
    setIsProcessing(true);
    console.log(`[MARKERS] Starting to process ${features.length} markers`);

    // Filter features with valid coordinates
    const validFeatures = features.filter(f => (
      f &&
      f.geometry &&
      Array.isArray(f.geometry.coordinates) &&
      f.geometry.coordinates.length === 2 &&
      !isNaN(f.geometry.coordinates[0]) &&
      !isNaN(f.geometry.coordinates[1])
    ));

    console.log(`[MARKERS] ${validFeatures.length} features have valid coordinates`);

    // Find markers to remove (not in current features)
    const currentIds = new Set(validFeatures.map(f => String(f.properties?.id ?? f.properties?.cluster_id)));
    const markersToRemove = Object.keys(markersRef.current).filter(id => !currentIds.has(id));

    // Remove markers that are no longer in the features array
    if (markersToRemove.length > 0) {
      console.log(`[MARKERS] Removing ${markersToRemove.length} markers that are no longer needed`);
      markersToRemove.forEach(id => {
        if (markersRef.current[id]) {
          markersRef.current[id].marker.remove();
          delete markersRef.current[id];
        }
      });
    }

    // Store current features for comparison
    currentFeaturesRef.current = validFeatures;

    // Start processing in batches
    processBatch(validFeatures, 0);

    // Cleanup on unmount
    return () => {
      console.log('[MARKERS] Cleaning up all markers');
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
      markersRef.current = {};
    };
  }, [features, map, processBatch, isProcessing]);

  // Effect to update selected marker
  useEffect(() => {
    if (!map || isProcessing || !selectedFeatureId) return;

    // Update selected marker
    Object.entries(markersRef.current).forEach(([id, { root, marker, isSelected }]) => {
      const shouldBeSelected = id === selectedFeatureId;

      // Only update if selection state changed
      if (isSelected !== shouldBeSelected) {
        const feature = features.find(f => {
          const featureId = String(f.properties?.id ?? f.properties?.cluster_id);
          return featureId === id;
        });
        
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
  }, [selectedFeatureId, map, features, handleMarkerClick, isProcessing]);

  return null;
});

// Simple EventMarker component 
const EventMarker: React.FC<{
  event: CustomFeature;
  isSelected: boolean;
  onClick: () => void;
}> = ({ event, isSelected, onClick }) => {
  const category = event.category || event.properties?.category || 'event';
  
  // Get marker color based on category
  const getMarkerColor = () => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('music')) return '#3b82f6'; // blue
    if (lowerCategory.includes('sports')) return '#22c55e'; // green
    if (lowerCategory.includes('arts') || lowerCategory.includes('theatre')) return '#ec4899'; // pink
    if (lowerCategory.includes('family')) return '#eab308'; // yellow
    if (lowerCategory.includes('food') || lowerCategory.includes('restaurant')) return '#f97316'; // orange
    if (lowerCategory.includes('party')) return '#a855f7'; // purple
    return '#6b7280'; // gray default
  };
  
  return (
    <div 
      className={`marker-container ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        width: isSelected ? '30px' : '24px',
        height: isSelected ? '30px' : '24px',
        transition: 'all 0.3s ease'
      }}
    >
      <div
        style={{
          backgroundColor: getMarkerColor(),
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.8)',
          boxShadow: isSelected 
            ? '0 0 0 2px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.3)' 
            : '0 2px 4px rgba(0,0,0,0.2)',
          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Optional: Add icon based on category */}
        {event.properties?.cluster && (
          <span style={{
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {event.properties.point_count || '+'}
          </span>
        )}
      </div>
    </div>
  );
};

MapMarkers.displayName = 'MapMarkers';

export default MapMarkers;
