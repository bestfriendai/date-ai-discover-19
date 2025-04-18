
import { useCallback, useEffect } from 'react';
import { MapLayout } from '@/components/map/layout/MapLayout';
import { MapContent } from '@/components/map/layout/MapContent';
import { useEventSearch } from '@/components/map/hooks/useEventSearch';
import { useMapState } from '@/components/map/hooks/useMapState';
import { useMapFilters } from '@/components/map/hooks/useMapFilters';
import { useMapEvents } from '@/components/map/hooks/useMapEvents';
import { toast } from '@/hooks/use-toast';

const MapView = () => {
  const {
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    selectedEvent,
    showSearch,
    setShowSearch,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    mapHasMoved,
    setMapHasMoved,
    mapLoaded,
    setMapLoaded,
    handleEventSelect
  } = useMapState();

  const { filters, handleFiltersChange } = useMapFilters();

  const {
    events,
    isEventsLoading,
    fetchEvents
  } = useEventSearch();

  const { handleMapMoveEnd, handleMapLoad } = useMapEvents(
    setMapCenter,
    setMapZoom,
    setMapHasMoved,
    mapLoaded
  );

  // Custom handler for searching events in the current map area
  const handleSearchThisArea = useCallback(() => {
    if (mapCenter) {
      toast({
        title: "Searching this area",
        description: "Looking for events in the current map view...",
      });
      fetchEvents(filters, mapCenter);
      setMapHasMoved(false);
    }
  }, [mapCenter, filters, fetchEvents, setMapHasMoved]);

  const handleAdvancedSearch = useCallback(
    (searchParams: any) => {
      const newFilters = {
        keyword: searchParams.keyword,
        location: searchParams.location,
        dateRange: searchParams.dateRange,
        categories: searchParams.categories,
        priceRange: searchParams.priceRange,
        distance: searchParams.radius,
      };
      handleFiltersChange(newFilters);

      // If we have map center coordinates, fetch events with the new filters
      if (mapCenter) {
        fetchEvents(newFilters, mapCenter);
      }
    },
    [handleFiltersChange, mapCenter, fetchEvents]
  );

  // Effect to load events when map center changes (e.g., after Find My Location)
  useEffect(() => {
    if (mapCenter && mapLoaded) {
      console.log('[MapView] Map center changed, fetching events for:', mapCenter);
      fetchEvents(filters, mapCenter);
    }
  }, [mapCenter, mapLoaded, filters, fetchEvents]);

  return (
    <MapLayout>
      <MapContent
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        selectedEvent={selectedEvent}
        showSearch={showSearch}
        mapHasMoved={mapHasMoved}
        mapLoaded={mapLoaded}
        events={events}
        isEventsLoading={isEventsLoading}
        filters={filters}
        onLeftSidebarClose={() => setLeftSidebarOpen(false)}
        onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onRightSidebarClose={() => setRightSidebarOpen(false)}
        onShowSearchToggle={() => setShowSearch(!showSearch)}
        onEventSelect={handleEventSelect}
        onAdvancedSearch={handleAdvancedSearch}
        onSearchThisArea={handleSearchThisArea}
        onMapMoveEnd={handleMapMoveEnd}
        onMapLoad={handleMapLoad}
        onFetchEvents={fetchEvents}
      />
    </MapLayout>
  );
};

export default MapView;
