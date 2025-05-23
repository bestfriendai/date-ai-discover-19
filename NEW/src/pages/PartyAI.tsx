import { useCallback, useEffect, useState, useMemo } from 'react';
import { MapLayout } from '../../src/components/map/layout/MapLayout';
import { PartyContent } from '../../src/components/party/PartyContent';
import { useMapState } from '../../src/components/map/hooks/useMapState';
import { useMapFilters } from '../../src/components/map/hooks/useMapFilters';
import { useMapEvents } from '../../src/components/map/hooks/useMapEvents';
import AddToPlanModal from '../../src/components/events/AddToPlanModal';
import { toast } from '../../src/hooks/use-toast';
import type { Event } from '@/types';
import { fetchEvents } from '@/services/eventService';

// Helper function to filter party events
const filterPartyEvents = (events: Event[]) => {
  return events.filter(event => event.isPartyEvent || event.category === 'party');
};

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

  // State for events
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);

  // State for add to plan modal
  const [addToPlanModalOpen, setAddToPlanModalOpen] = useState(false);
  const [eventToAdd, setEventToAdd] = useState<Event | null>(null);

  const { handleMapMoveEnd, handleMapLoad } = useMapEvents(
    setMapCenter,
    setMapZoom,
    setMapHasMoved,
    mapLoaded
  );

  // Convert mapCenter array to object format
  const mapCenterObject = useMemo(() => {
    if (!mapCenter || !mapCenter[0] || !mapCenter[1]) return null;
    return {
      longitude: mapCenter[0],
      latitude: mapCenter[1]
    };
  }, [mapCenter]);

  // Filter for party events only
  const partyEvents = useMemo(() => {
    return filterPartyEvents(events);
  }, [events]);

  // Function to fetch events
  const handleFetchEvents = useCallback(async (
    filters: any,
    coords?: { latitude: number; longitude: number },
    radius?: number
  ) => {
    try {
      setIsEventsLoading(true);
      
      // Add party category to filters
      const partyFilters = {
        ...filters,
        categories: [...(filters.categories || []), 'party']
      };
      
      // Use the direct RapidAPI integration
      const fetchedEvents = await fetchEvents(partyFilters, coords, radius);
      
      // Filter for party events
      const partyEvents = filterPartyEvents(fetchedEvents);
      
      setEvents(fetchedEvents);
      setTotalEvents(partyEvents.length);
      setHasMore(fetchedEvents.length >= (filters.limit || 100));
      
      return fetchedEvents;
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch party events. Please try again.',
        variant: 'destructive'
      });
      return [];
    } finally {
      setIsEventsLoading(false);
    }
  }, []);

  // Function to load more events
  const loadMoreEvents = useCallback(async () => {
    if (!mapCenterObject || isEventsLoading) return;
    
    try {
      setIsEventsLoading(true);
      
      // Increment page number
      const nextPage = Math.ceil(events.length / (filters.limit || 100)) + 1;
      
      // Add party category to filters
      const partyFilters = {
        ...filters,
        page: nextPage,
        categories: [...(filters.categories || []), 'party']
      };
      
      // Fetch next page of events
      const moreEvents = await fetchEvents(
        partyFilters,
        mapCenterObject
      );
      
      // Append new events to existing ones
      setEvents(prev => [...prev, ...moreEvents]);
      setHasMore(moreEvents.length >= (filters.limit || 100));
      
    } catch (error) {
      console.error('Error loading more events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load more party events. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsEventsLoading(false);
    }
  }, [events.length, filters, isEventsLoading, mapCenterObject]);

  // Function to handle advanced search
  const handleAdvancedSearch = useCallback(async (searchFilters: any) => {
    if (!mapCenterObject) {
      toast({
        title: 'Location Required',
        description: 'Please select a location on the map first.',
        variant: 'default'
      });
      return;
    }
    
    // Update filters with search parameters
    handleFiltersChange(searchFilters);
    
    // Reset map moved state
    setMapHasMoved(false);
    
    // Fetch events with new filters
    await handleFetchEvents(
      { ...filters, ...searchFilters },
      mapCenterObject
    );
  }, [filters, handleFetchEvents, handleFiltersChange, mapCenterObject, setMapHasMoved]);

  // Function to handle search this area
  const handleSearchThisArea = useCallback(async () => {
    if (!mapCenterObject) return;
    
    // Reset map moved state
    setMapHasMoved(false);
    
    // Fetch events for the current map area
    await handleFetchEvents(filters, mapCenterObject);
  }, [filters, handleFetchEvents, mapCenterObject, setMapHasMoved]);

  // Function to handle adding event to plan
  const handleAddToPlan = useCallback((event: Event) => {
    setEventToAdd(event);
    setAddToPlanModalOpen(true);
  }, []);

  // Function to close add to plan modal
  const handleCloseAddToPlanModal = useCallback(() => {
    setAddToPlanModalOpen(false);
    setEventToAdd(null);
  }, []);

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
        onFetchEvents={handleFetchEvents}
        onLoadMore={loadMoreEvents}
        onAddToPlan={handleAddToPlan}
      />

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
