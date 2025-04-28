
import { useCallback, useEffect, useState, useMemo } from 'react';
import { MapLayout } from '@/components/map/layout/MapLayout';
import { PartyContent } from '@/components/party/PartyContent';
import { useEventSearch } from '@/components/map/hooks/useEventSearch';
import { useMapState } from '@/components/map/hooks/useMapState';
import { useMapFilters } from '@/components/map/hooks/useMapFilters';
import { useMapEvents } from '@/components/map/hooks/useMapEvents';
import AddToPlanModal from '@/components/events/AddToPlanModal';
import { SourceStatsDisplay } from '@/components/map/components/SourceStatsDisplay';
import type { Event } from '@/types';
import { PartySubcategory } from '@/utils/eventNormalizers';
import { scoreAndSortPartyEvents } from '@/utils/scorePartyEvents';
import { usePartyAIHandlers } from '@/hooks/usePartyAIHandlers';

const PartyAI = () => {
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
  const { onCategoriesChange, onDatePresetChange, ...restFilters } = filters;

  const {
    events,
    isEventsLoading,
    fetchEvents,
    loadMoreEvents,
    hasMore,
    totalEvents,
    sourceStats
  } = useEventSearch();

  const { handleMapMoveEnd, handleMapLoad } = useMapEvents(
    setMapCenter,
    setMapZoom,
    setMapHasMoved,
    mapLoaded
  );

  // State for Add to Plan modal
  const [addToPlanModalOpen, setAddToPlanModalOpen] = useState(false);
  const [eventToAdd, setEventToAdd] = useState<Event | null>(null);

  // Handler for Add to Plan button
  const handleAddToPlan = useCallback((event: Event) => {
    console.log('[PartyAI] Opening Add to Plan modal for event:', event.id);
    setEventToAdd(event);
    setAddToPlanModalOpen(true);
  }, []);

  // Handler to close the Add to Plan modal
  const handleCloseAddToPlanModal = useCallback(() => {
    setAddToPlanModalOpen(false);
    setEventToAdd(null);
  }, []);

  // Convert mapCenter array to object format
  const mapCenterObject = useMemo(() => {
    if (!mapCenter || !mapCenter[0] || !mapCenter[1]) return null;
    return {
      longitude: mapCenter[0],
      latitude: mapCenter[1]
    };
  }, [mapCenter]);

  // Use extracted handlers for search
  const { handleAdvancedSearch, handleSearchThisArea } = usePartyAIHandlers({
    mapCenter: mapCenterObject,
    setMapHasMoved,
    fetchEvents,
    filters
  });

  // Initial fetch when map is loaded and centered
  useEffect(() => {
    if (mapLoaded && mapCenter && !events.length && !isEventsLoading) {
      console.log('[PartyAI] Initial fetch of party events');
      onCategoriesChange(['party']);

      // Ensure we have map center coordinates
      if (!mapCenter || !mapCenter.longitude || !mapCenter.latitude) {
        console.warn('[PartyAI] No map center coordinates available');
        return;
      }

      // Use a 30-mile radius for party searches
      const radius = 30;

      fetchEvents(
        {
          ...filters,
          categories: ['party'],
          keyword: 'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival OR concert OR music OR lounge OR bar OR venue OR mixer OR gathering OR gala OR reception OR meetup OR "happy hour" OR cocktail OR rave OR "live music" OR "themed party" OR "costume party" OR "masquerade" OR "holiday party" OR "new years party" OR "halloween party" OR "summer party" OR "winter party" OR "spring party" OR "fall party" OR "seasonal party" OR "annual party" OR "live dj" OR "live band" OR "live performance" OR "music venue" OR "dance venue" OR "nightclub venue" OR "lounge venue" OR "bar venue" OR "club night" OR "dance night" OR "party night" OR "night life" OR "social mixer" OR "networking event" OR "singles event" OR "mingling" OR "daytime event" OR "pool event" OR "rooftop event" OR "outdoor event"',
          limit: 100, // Show the next 100 events
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          radius
        },
        mapCenter,
        radius
      );
    }
  }, [mapLoaded, mapCenter, events.length, isEventsLoading, fetchEvents, filters, onCategoriesChange]);

  useEffect(() => {
    // Make sure we always have 'party' in the categories filter
    if (!filters.categories?.includes('party')) {
      onCategoriesChange(['party']);
    }
  }, [filters.categories, onCategoriesChange]);

  // Score and sort party events to find the best ones
  const partyEvents = useMemo(() => {
    return scoreAndSortPartyEvents(events);
  }, [events]);

  return (
    <MapLayout>
      <PartyContent
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        selectedEvent={selectedEvent}
        showSearch={showSearch}
        mapHasMoved={mapHasMoved}
        mapLoaded={mapLoaded}
        events={partyEvents}
        isEventsLoading={isEventsLoading}
        filters={{ ...restFilters, onCategoriesChange, onDatePresetChange }}
        hasMoreEvents={hasMore}
        totalEvents={totalEvents}
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
        onLoadMore={loadMoreEvents}
        onAddToPlan={handleAddToPlan}
      />

      {sourceStats && <SourceStatsDisplay stats={sourceStats} />}

      {eventToAdd && (
        <AddToPlanModal
          event={eventToAdd}
          open={addToPlanModalOpen}
          onClose={handleCloseAddToPlanModal}
        />
      )}
    </MapLayout>
  );
};

export default PartyAI;
