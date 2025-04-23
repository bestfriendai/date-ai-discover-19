
import React from 'react';
import MapComponent from '@/components/map/MapComponent';
import { PartySidebars } from './PartySidebars';
import { MapControlsArea } from '@/components/map/components/MapControlsArea';
import PartySearch from './PartySearch';
import PartyMapMarkers from './PartyMapMarkers'; // Import the PartyMapMarkers
import type { Event } from '@/types';
import type { EventFilters } from '@/components/map/components/MapControls';

interface PartyContentProps {
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
  onAddToPlan?: (event: Event) => void;
}

export const PartyContent = ({
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
}: PartyContentProps) => {
  // Reference to store the map object
  const [mapInstance, setMapInstance] = React.useState<mapboxgl.Map | null>(null);

  // Function to receive the map instance from MapComponent
  const handleMapInstance = (map: mapboxgl.Map) => {
    setMapInstance(map);
  };

  return (
    <>
      <PartySidebars
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
          onMapInstance={handleMapInstance} // Pass the callback to receive map instance
        />

        {/* Render the PartyMapMarkers component when we have a map and events */}
        {mapInstance && events.length > 0 && (
          <PartyMapMarkers
            map={mapInstance}
            events={events}
            selectedEventId={selectedEvent?.id || null}
            onMarkerClick={onEventSelect}
          />
        )}

        {showSearch && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4">
            <PartySearch
              onSearch={onAdvancedSearch}
              loading={isEventsLoading}
            />
          </div>
        )}

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
