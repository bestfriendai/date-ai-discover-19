
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

  const handleSearchThisArea = useCallback(
    (fetchEvents: (params: any, center: { latitude: number; longitude: number }, radius: number) => void, mapCenter: { latitude: number; longitude: number } | null, radius: number) => {
      if (!mapCenter) {
        console.warn('[useMapEvents] Cannot search this area: Map center is not available.');
        toast({
          title: "Cannot search this area",
          description: "Map location is not available.",
          variant: "destructive"
        });
        return;
      }

      console.log('[useMapEvents] Searching this area:', mapCenter, 'with radius:', radius);
      toast({
        title: "Searching this area",
        description: "Looking for events in the current map view...",
      });

      // Trigger the event fetch with the current map center and radius
      fetchEvents(
        {
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          radius: radius,
          // Include other relevant filters from the PartyAI component if needed
          // For now, just focus on location
        },
        mapCenter,
        radius
      );
    },
    [] // Dependencies for this useCallback. fetchEvents, mapCenter, and radius will be passed as arguments.
  );

  return {
    handleMapMoveEnd,
    handleMapLoad,
    handleSearchThisArea
  };
};
