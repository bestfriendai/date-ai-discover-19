
import React from 'react';
import MapComponent from '@/components/map/MapComponent';
import { MapSidebars } from '@/components/map/components/MapSidebars';
import { MapControlsArea } from '@/components/map/components/MapControlsArea';
import type { Event } from '@/types';
import type { EventFilters } from '@/components/map/components/MapControls';

interface MapContentProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedEvent: Event | null;
  showSearch: boolean;
  mapHasMoved: boolean;
  mapLoaded: boolean;
  events: Event[];
  isEventsLoading: boolean;
  filters: EventFilters;
  hasMoreEvents?: boolean;
  totalEvents?: number;
  onLeftSidebarClose: () => void;
  onLeftSidebarToggle: () => void;
  onRightSidebarClose: () => void;
  onShowSearchToggle: () => void;
  onEventSelect: (event: Event | null) => void;
  onAdvancedSearch: (searchParams: any) => void;
  onSearchThisArea: () => void;
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void;
  onFetchEvents?: (filters: EventFilters, coords: { latitude: number; longitude: number }, radius?: number) => void;
  onLoadMore?: () => void;
  onAddToPlan?: (event: Event) => void; // New prop for Add to Plan functionality
}

export const MapContent = ({
  leftSidebarOpen,
  rightSidebarOpen,
  selectedEvent,
  showSearch,
  mapHasMoved,
  mapLoaded,
  events,
  isEventsLoading,
  filters,
  hasMoreEvents = false,
  totalEvents = 0,
  onLeftSidebarClose,
  onLeftSidebarToggle,
  onRightSidebarClose,
  onShowSearchToggle,
  onEventSelect,
  onAdvancedSearch,
  onSearchThisArea,
  onMapMoveEnd,
  onMapLoad,
  onFetchEvents,
  onLoadMore,
  onAddToPlan,
}: MapContentProps) => {
  return (
    <>
      <MapSidebars
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        selectedEvent={selectedEvent}
        events={events}
        isLoading={isEventsLoading}
        onLeftSidebarClose={onLeftSidebarClose}
        onRightSidebarClose={onRightSidebarClose}
        onEventSelect={onEventSelect}
      />

      <div className="flex-1 relative">
        <MapComponent
          onEventSelect={onEventSelect}
          onLoadingChange={() => {}}
          events={events}
          selectedEvent={selectedEvent}
          isLoading={isEventsLoading}
          filters={filters}
          mapLoaded={mapLoaded}
          onMapMoveEnd={onMapMoveEnd}
          onMapLoad={onMapLoad}
          onFetchEvents={onFetchEvents}
          onAddToPlan={onAddToPlan}
        />

        <MapControlsArea
          leftSidebarOpen={leftSidebarOpen}
          showSearch={showSearch}
          isEventsLoading={isEventsLoading}
          filters={filters}
          onLeftSidebarToggle={onLeftSidebarToggle}
          onSearchToggle={onShowSearchToggle}
          onSearch={onAdvancedSearch}
          onSearchThisArea={onSearchThisArea}
          mapHasMoved={mapHasMoved}
          hasMoreEvents={hasMoreEvents}
          totalEvents={totalEvents}
          loadedEvents={events.length}
          onLoadMore={onLoadMore}
        />
      </div>
    </>
  );
};
