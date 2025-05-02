import { useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

export const useKeyboardNavigation = (
  map: mapboxgl.Map | null,
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!map || !enabled) return;

    const currentZoom = map.getZoom();
    const currentCenter = map.getCenter();
    const zoomStep = 0.5;
    const moveStep = 0.01 / (currentZoom * 0.1); // Adjust step based on zoom level

    switch (e.key) {
      case '+':
      case '=':
        // Zoom in
        map.easeTo({
          zoom: currentZoom + zoomStep,
          duration: 300
        });
        break;
      case '-':
      case '_':
        // Zoom out
        map.easeTo({
          zoom: currentZoom - zoomStep,
          duration: 300
        });
        break;
      case 'ArrowUp':
        // Move north
        if (!e.ctrlKey && !e.metaKey) {
          map.easeTo({
            center: [currentCenter.lng, currentCenter.lat + moveStep],
            duration: 300
          });
          e.preventDefault();
        }
        break;
      case 'ArrowDown':
        // Move south
        if (!e.ctrlKey && !e.metaKey) {
          map.easeTo({
            center: [currentCenter.lng, currentCenter.lat - moveStep],
            duration: 300
          });
          e.preventDefault();
        }
        break;
      case 'ArrowLeft':
        // Move west
        if (!e.ctrlKey && !e.metaKey) {
          map.easeTo({
            center: [currentCenter.lng - moveStep, currentCenter.lat],
            duration: 300
          });
          e.preventDefault();
        }
        break;
      case 'ArrowRight':
        // Move east
        if (!e.ctrlKey && !e.metaKey) {
          map.easeTo({
            center: [currentCenter.lng + moveStep, currentCenter.lat],
            duration: 300
          });
          e.preventDefault();
        }
        break;
      case 'r':
      case 'R':
        // Reset north
        if (e.ctrlKey || e.metaKey) {
          map.easeTo({
            bearing: 0,
            pitch: 0,
            duration: 300
          });
          e.preventDefault();
        }
        break;
      case 'f':
      case 'F':
        // Toggle fullscreen
        if (e.ctrlKey || e.metaKey) {
          if (map.isFullscreen()) {
            map.exitFullscreen();
          } else {
            map.requestFullscreen();
          }
          e.preventDefault();
        }
        break;
      default:
        break;
    }
  }, [map, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    isEnabled: enabled
  };
};
