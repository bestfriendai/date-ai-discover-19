import { useCallback } from 'react';

export const useMapEvents = (
  setMapCenter: (center: [number, number]) => void,
  setMapZoom: (zoom: number) => void,
  setMapHasMoved: (moved: boolean) => void,
  mapLoaded: boolean
) => {
  // Handle map move end event
  const handleMapMoveEnd = useCallback((
    center: { latitude: number; longitude: number },
    zoom: number,
    isUserInteraction: boolean
  ) => {
    // Update map center and zoom
    setMapCenter([center.longitude, center.latitude]);
    setMapZoom(zoom);

    // Only set map moved if it was a user interaction and the map is loaded
    if (isUserInteraction && mapLoaded) {
      setMapHasMoved(true);
    }
  }, [mapLoaded, setMapCenter, setMapHasMoved, setMapZoom]);

  // Handle map load event
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, [setMapLoaded]);

  return {
    handleMapMoveEnd,
    handleMapLoad
  };
};
