import { useCallback, useEffect, useState, useMemo } from 'react';
import { MapLayout } from '@/components/map/layout/MapLayout';
import { MapContent } from '@/components/map/layout/MapContent';
import { useEventSearch } from '@/components/map/hooks/useEventSearch';
import { useMapState } from '@/components/map/hooks/useMapState';
import { useMapFilters } from '@/components/map/hooks/useMapFilters';
import { useMapEvents } from '@/components/map/hooks/useMapEvents';
import AddToPlanModal from '@/components/events/AddToPlanModal';
import { toast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import { SourceStatsDisplay } from '@/components/map/components/SourceStatsDisplay';
import { PartySubcategory } from '@/utils/eventNormalizers';

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

  // Handler for advanced search
  const handleAdvancedSearch = useCallback((searchParams: any) => {
    console.log('[PartyAI] Advanced search with params:', searchParams);

    // Always include 'party' category in the search
    // Also add party-related keywords to improve results
    const paramsWithPartyCategory = {
      ...searchParams,
      categories: ['party'],
      keyword: searchParams.keyword
        ? `${searchParams.keyword} party OR club OR social OR celebration OR dance`
        : 'party OR club OR social OR celebration OR dance OR dj OR nightlife'
    };

    if (mapCenter) {
      toast({
        title: "Finding the best parties",
        description: "PartyAI is searching for the hottest events matching your criteria",
      });

      fetchEvents(
        { ...filters, ...paramsWithPartyCategory },
        mapCenter,
        searchParams.distance || filters.distance
      );
    }
  }, [fetchEvents, filters, mapCenter, toast]);

  // Handler for "Search This Area" button
  const handleSearchThisArea = useCallback(() => {
    console.log('[PartyAI] Search this area clicked');
    if (mapCenter) {
      // Always include 'party' category in the search
      // Also add party-related keywords to improve results
      const filtersWithPartyCategory = {
        ...filters,
        categories: ['party'],
        keyword: 'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival'
      };

      toast({
        title: "Searching for parties in this area",
        description: "PartyAI is finding the best events in the current map view",
      });

      fetchEvents(filtersWithPartyCategory, mapCenter, filters.distance);
      setMapHasMoved(false);
    }
  }, [fetchEvents, filters, mapCenter, setMapHasMoved, toast]);

  // Initial fetch when map is loaded and centered
  useEffect(() => {
    if (mapLoaded && mapCenter && !events.length && !isEventsLoading) {
      console.log('[PartyAI] Initial fetch of party events');

      // Set the categories filter to only include 'party'
      onCategoriesChange(['party']);

      // Fetch events with the party category filter and party-related keywords
      fetchEvents(
        {
          ...filters,
          categories: ['party'],
          keyword: 'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival'
        },
        mapCenter,
        filters.distance
      );

      // Show a toast message to indicate we're finding the best parties
      toast({
        title: "Finding the best parties",
        description: "PartyAI is searching for the hottest events in your area",
      });
    }
  }, [mapLoaded, mapCenter, events.length, isEventsLoading, fetchEvents, filters, onCategoriesChange, toast]);

  // Always ensure the category filter is set to 'party'
  useEffect(() => {
    // Make sure we always have 'party' in the categories filter
    if (!filters.categories?.includes('party')) {
      onCategoriesChange(['party']);
    }
  }, [filters.categories, onCategoriesChange]);

  // Score and sort party events to find the best ones
  const partyEvents = useMemo(() => {
    // First, filter to only include party events
    const filteredEvents = events.filter(event => event.category === 'party');

    // Score each party event based on various factors
    const scoredEvents = filteredEvents.map(event => {
      let score = 0;

      // Score based on subcategory (prioritize clubs, day parties, etc.)
      if (event.partySubcategory) {
        switch(event.partySubcategory) {
          case 'club': score += 10; break;
          case 'day-party': score += 8; break;
          case 'celebration': score += 6; break;
          case 'networking': score += 4; break;
          case 'brunch': score += 5; break;
          default: score += 3;
        }
      }

      // Score based on description quality (length and keywords)
      if (event.description) {
        // Add points for longer descriptions (more info = better event listing)
        score += Math.min(5, Math.floor(event.description.length / 100));

        // Add points for keywords that suggest a good party
        const description = event.description.toLowerCase();
        const goodPartyKeywords = ['dj', 'music', 'dance', 'drinks', 'vip', 'exclusive', 'featured',
                                  'popular', 'sold out', 'tickets', 'nightlife', 'entertainment'];

        goodPartyKeywords.forEach(keyword => {
          if (description.includes(keyword)) score += 1;
        });
      }

      // Score based on having an image
      if (event.image && !event.image.includes('placeholder')) {
        score += 3;
      }

      // Score based on having a venue
      if (event.venue) {
        score += 2;
      }

      // Score based on having a price (ticketed events are often better quality)
      if (event.price) {
        score += 2;
      }

      return { ...event, _score: score };
    });

    // Sort events by score (highest first)
    return scoredEvents
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .map(({ _score, ...event }) => event); // Remove the score before returning
  }, [events]);

  return (
    <MapLayout>
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white py-3 px-4 text-center">
        <h1 className="text-xl font-bold">🎉 PartyAI - Discover the Best Parties Near You 🎉</h1>
        <p className="text-sm opacity-90">Powered by AI to find the hottest clubs, day parties, social events & more</p>
      </div>

      <MapContent
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
