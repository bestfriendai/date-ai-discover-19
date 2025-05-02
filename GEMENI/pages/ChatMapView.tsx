import { useCallback, useEffect, useState } from 'react';
import { MapLayout } from '@/components/map/layout/MapLayout';
import { ChatMapContent } from '@/components/map/layout/ChatMapContent';
import { useEventSearch } from '@/components/map/hooks/useEventSearch';
import { useMapState } from '@/components/map/hooks/useMapState';
import { useMapFilters } from '@/components/map/hooks/useMapFilters';
import { useMapEvents } from '@/components/map/hooks/useMapEvents';
import { useChatWithEvents } from '@/components/map/hooks/useChatWithEvents';
import AddToPlanModal from '@/components/events/AddToPlanModal';
import { toast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import { SourceStatsDisplay } from '@/components/map/components/SourceStatsDisplay';

const ChatMapView = () => {
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

  // Chat state
  const {
    messages,
    isLoading: isChatLoading,
    extractedEvents,
    sendMessage,
    clearChat
  } = useChatWithEvents();

  // Add to plan modal state
  const [addToPlanModalOpen, setAddToPlanModalOpen] = useState(false);
  const [eventToAdd, setEventToAdd] = useState<Event | null>(null);

  // Handle advanced search
  const handleAdvancedSearch = useCallback((searchParams: any) => {
    if (!mapCenter) return;

    const { latitude, longitude } = mapCenter;
    fetchEvents(
      {
        ...filters,
        ...searchParams
      },
      { latitude, longitude },
      searchParams.radius || filters.distance
    );
  }, [mapCenter, filters, fetchEvents]);

  // Handle search this area
  const handleSearchThisArea = useCallback(() => {
    if (!mapCenter) return;

    const { latitude, longitude } = mapCenter;
    fetchEvents(filters, { latitude, longitude }, filters.distance);
    setMapHasMoved(false);
  }, [mapCenter, filters, fetchEvents, setMapHasMoved]);

  // Handle add to plan
  const handleAddToPlan = useCallback((event: Event) => {
    setEventToAdd(event);
    setAddToPlanModalOpen(true);
  }, []);

  // Handle close add to plan modal
  const handleCloseAddToPlanModal = useCallback(() => {
    setAddToPlanModalOpen(false);
    setEventToAdd(null);
  }, []);

  // Initial fetch of events when map is loaded and centered
  useEffect(() => {
    if (mapLoaded && mapCenter && !events.length && !isEventsLoading) {
      console.log('[ChatMapView] Initial fetch of events');
      const { latitude, longitude } = mapCenter;
      fetchEvents(filters, { latitude, longitude }, filters.distance);
    }
  }, [mapLoaded, mapCenter, events.length, isEventsLoading, filters, fetchEvents]);

  // When extracted events change, update the map center if needed
  useEffect(() => {
    if (extractedEvents.length > 0 && mapLoaded) {
      // Find the first event with coordinates
      const eventWithCoords = extractedEvents.find(event => 
        event.coordinates && 
        Array.isArray(event.coordinates) && 
        event.coordinates.length === 2
      );
      
      if (eventWithCoords && eventWithCoords.coordinates) {
        // Center map on the first event with coordinates
        const [longitude, latitude] = eventWithCoords.coordinates;
        
        // Only update if we have valid coordinates
        if (!isNaN(latitude) && !isNaN(longitude)) {
          setMapCenter({ latitude, longitude });
          // Set zoom level to show the area better
          if (mapZoom && mapZoom < 12) {
            setMapZoom(12);
          }
          
          toast({
            title: "Map centered on events",
            description: "The map has been centered on the events found in the chat.",
          });
        }
      }
    }
  }, [extractedEvents, mapLoaded, setMapCenter, setMapZoom, mapZoom]);

  return (
    <MapLayout>
      <ChatMapContent
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        selectedEvent={selectedEvent}
        showSearch={showSearch}
        mapHasMoved={mapHasMoved}
        mapLoaded={mapLoaded}
        events={events}
        messages={messages}
        isLoading={isChatLoading}
        extractedEvents={extractedEvents}
        filters={{ ...restFilters, onCategoriesChange, onDatePresetChange }}
        hasMoreEvents={hasMore}
        totalEvents={totalEvents}
        onLeftSidebarClose={() => setLeftSidebarOpen(false)}
        onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onRightSidebarClose={() => setRightSidebarOpen(false)}
        onShowSearchToggle={() => setShowSearch(!showSearch)}
        onEventSelect={handleEventSelect}
        onSendMessage={sendMessage}
        onClearChat={clearChat}
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

export default ChatMapView;
