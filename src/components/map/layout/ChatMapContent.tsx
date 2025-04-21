import React from 'react';
import MapComponent from '@/components/map/MapComponent';
import { ChatMapSidebars } from '@/components/map/components/ChatMapSidebars';
import { MapControlsArea } from '@/components/map/components/MapControlsArea';
import { ChatMessage } from '@/services/perplexityService';
import type { Event } from '@/types';
import type { EventFilters } from '@/components/map/components/MapControls';

interface ChatMapContentProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedEvent: Event | null;
  showSearch: boolean;
  mapHasMoved: boolean;
  mapLoaded: boolean;
  events: Event[];
  messages: ChatMessage[];
  isLoading: boolean;
  extractedEvents: Event[];
  filters: EventFilters;
  hasMoreEvents?: boolean;
  totalEvents?: number;
  onLeftSidebarClose: () => void;
  onLeftSidebarToggle: () => void;
  onRightSidebarClose: () => void;
  onShowSearchToggle: () => void;
  onEventSelect: (event: Event | null) => void;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  onAdvancedSearch: (searchParams: any) => void;
  onSearchThisArea: () => void;
  onMapMoveEnd: (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => void;
  onMapLoad: () => void;
  onFetchEvents?: (filters: EventFilters, coords: { latitude: number; longitude: number }, radius?: number) => void;
  onLoadMore?: () => void;
  onAddToPlan?: (event: Event) => void;
}

export const ChatMapContent: React.FC<ChatMapContentProps> = ({
  leftSidebarOpen,
  rightSidebarOpen,
  selectedEvent,
  showSearch,
  mapHasMoved,
  mapLoaded,
  events,
  messages,
  isLoading,
  extractedEvents,
  filters,
  hasMoreEvents = false,
  totalEvents = 0,
  onLeftSidebarClose,
  onLeftSidebarToggle,
  onRightSidebarClose,
  onShowSearchToggle,
  onEventSelect,
  onSendMessage,
  onClearChat,
  onAdvancedSearch,
  onSearchThisArea,
  onMapMoveEnd,
  onMapLoad,
  onFetchEvents,
  onLoadMore,
  onAddToPlan,
}) => {
  // Combine regular events with extracted events from chat
  const allEvents = React.useMemo(() => {
    // Create a Set of existing event IDs to avoid duplicates
    const existingIds = new Set(events.map(event => event.id));
    
    // Filter out any extracted events that might have the same ID
    const uniqueExtractedEvents = extractedEvents.filter(event => !existingIds.has(event.id));
    
    // Return combined array
    return [...events, ...uniqueExtractedEvents];
  }, [events, extractedEvents]);
  
  return (
    <>
      <ChatMapSidebars
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        selectedEvent={selectedEvent}
        messages={messages}
        isLoading={isLoading}
        extractedEvents={extractedEvents}
        onLeftSidebarClose={onLeftSidebarClose}
        onRightSidebarClose={onRightSidebarClose}
        onEventSelect={onEventSelect}
        onSendMessage={onSendMessage}
        onClearChat={onClearChat}
      />

      <div className="flex-1 relative">
        <MapComponent
          onEventSelect={onEventSelect}
          onLoadingChange={() => {}}
          events={allEvents}
          selectedEvent={selectedEvent}
          isLoading={isLoading}
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
          isEventsLoading={isLoading}
          filters={filters}
          onLeftSidebarToggle={onLeftSidebarToggle}
          onSearchToggle={onShowSearchToggle}
          onSearch={onAdvancedSearch}
          onSearchThisArea={onSearchThisArea}
          mapHasMoved={mapHasMoved}
          hasMoreEvents={hasMoreEvents}
          totalEvents={totalEvents}
          loadedEvents={allEvents.length}
          onLoadMore={onLoadMore}
        />
      </div>
    </>
  );
};
