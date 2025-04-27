
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export const useMapEvents = (
  setMapCenter: (center: { latitude: number; longitude: number }) => void,
  setMapZoom: (zoom: number) => void,
  setMapHasMoved: (moved: boolean) => void,
  mapLoaded: boolean
) => {
  const handleMapMoveEnd = useCallback(
    (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => {
      console.log('[MapView] Map moved to:', center, 'zoom:', zoom, 'user interaction:', isUserInteraction);
      setMapCenter(center);
      setMapZoom(zoom);
      if (isUserInteraction && mapLoaded) {
        setMapHasMoved(true);
      }
    },
    [mapLoaded, setMapCenter, setMapZoom, setMapHasMoved]
  );

  const handleMapLoad = useCallback(() => {
    console.log('[MapView] Map loaded');
  }, []);

  const handleSearchThisArea = useCallback(() => {
    toast({
      title: "Searching this area",
      description: "Looking for events in the current map view...",
    });
  }, []);

  return {
    handleMapMoveEnd,
    handleMapLoad,
    handleSearchThisArea
  };
};
