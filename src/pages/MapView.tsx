
import { useCallback } from 'react';
import Header from '@/components/layout/Header';
import MapComponent from '@/components/map/MapComponent';
import { MapSidebars } from '@/components/map/components/MapSidebars';
import { MapControlsArea } from '@/components/map/components/MapControlsArea';
import { useEventSearch } from '@/components/map/hooks/useEventSearch';
import { useMapState } from '@/components/map/hooks/useMapState';
import { useMapFilters } from '@/components/map/hooks/useMapFilters';
import { useMapEvents } from '@/components/map/hooks/useMapEvents';

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

  const { handleMapMoveEnd, handleMapLoad, handleSearchThisArea } = useMapEvents(
    setMapCenter,
    setMapZoom,
    setMapHasMoved,
    mapLoaded
  );

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
    },
    [handleFiltersChange]
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />
      <div className="flex-1 flex relative overflow-hidden pt-16">
        <MapSidebars
          leftSidebarOpen={leftSidebarOpen}
          rightSidebarOpen={rightSidebarOpen}
          selectedEvent={selectedEvent}
          events={events}
          isLoading={isEventsLoading}
          onLeftSidebarClose={() => setLeftSidebarOpen(false)}
          onRightSidebarClose={() => setRightSidebarOpen(false)}
          onEventSelect={handleEventSelect}
        />

        <div className="flex-1 relative">
          <MapComponent
            onEventSelect={handleEventSelect}
            onLoadingChange={() => {}}
            events={events}
            selectedEvent={selectedEvent}
            isLoading={isEventsLoading}
            filters={filters}
            mapLoaded={mapLoaded}
            onMapMoveEnd={handleMapMoveEnd}
            onMapLoad={handleMapLoad}
          />

          <MapControlsArea
            leftSidebarOpen={leftSidebarOpen}
            showSearch={showSearch}
            isEventsLoading={isEventsLoading}
            filters={filters}
            onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
            onSearchToggle={() => setShowSearch(!showSearch)}
            onSearch={handleAdvancedSearch}
            onSearchThisArea={handleSearchThisArea}
            mapHasMoved={mapHasMoved}
          />
        </div>
      </div>
    </div>
  );
};

export default MapView;
