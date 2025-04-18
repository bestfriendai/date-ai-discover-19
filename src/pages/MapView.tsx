
import { useState, useCallback, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import MapComponent from '@/components/map/MapComponent';
import type { Event } from '@/types';
import type { EventFilters } from '@/components/map/components/MapControls';
import { applyFilters, sortEvents } from '@/utils/eventFilters';
import { MapSidebars } from '@/components/map/components/MapSidebars';
import { MapControlsArea } from '@/components/map/components/MapControlsArea';
import { useEventSearch } from '@/components/map/hooks/useEventSearch';
import { toast } from '@/hooks/use-toast';

const DEFAULT_DISTANCE = 30;

const MapView = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ longitude: number; latitude: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [mapHasMoved, setMapHasMoved] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [filters, setFilters] = useState<EventFilters>({
    distance: DEFAULT_DISTANCE,
    sortBy: 'date',
  });

  const {
    events,
    rawEvents,
    isEventsLoading,
    fetchEvents,
    setEvents,
    lastSearchParams
  } = useEventSearch();

  const handleEventSelect = (event: Event | null) => {
    setSelectedEvent(event);
    if (event) setRightSidebarOpen(true);
  };

  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setMapHasMoved(false);
  }, []);

  const prevFetchParams = useRef<{ 
    filters: Pick<EventFilters, 'keyword' | 'location' | 'distance' | 'dateRange' | 'categories'>;
    center: { latitude: number; longitude: number } | null; 
  } | null>(null);

  // Debug effect to log state changes
  useEffect(() => {
    console.log('[MapView Debug] State update:', {
      mapLoaded,
      mapCenter,
      eventsCount: events.length,
      isEventsLoading,
      mapHasMoved
    });
  }, [mapLoaded, mapCenter, events.length, isEventsLoading, mapHasMoved]);

  useEffect(() => {
    if (!mapLoaded || !mapCenter) return;
    
    const relevantFilters = {
      keyword: filters.keyword,
      location: filters.location,
      distance: filters.distance,
      dateRange: filters.dateRange,
      categories: filters.categories
    };
    
    const currentFetchParams = { 
      filters: relevantFilters, 
      center: mapCenter 
    };
    
    const filtersChanged = !prevFetchParams.current ||
      prevFetchParams.current.filters.keyword !== relevantFilters.keyword ||
      prevFetchParams.current.filters.location !== relevantFilters.location ||
      prevFetchParams.current.filters.distance !== relevantFilters.distance ||
      JSON.stringify(prevFetchParams.current.filters.dateRange) !== JSON.stringify(relevantFilters.dateRange) ||
      JSON.stringify(prevFetchParams.current.filters.categories) !== JSON.stringify(relevantFilters.categories);
      
    const centerChanged = !prevFetchParams.current?.center ||
      Math.abs(prevFetchParams.current.center.latitude - mapCenter.latitude) > 0.001 ||
      Math.abs(prevFetchParams.current.center.longitude - mapCenter.longitude) > 0.001;
    
    if (filtersChanged || (centerChanged && !mapHasMoved)) {
      console.log('[MapView] Search parameters changed, fetching new events');
      console.log('[MapView] Center:', mapCenter, 'Filters:', relevantFilters);
      
      fetchEvents(filters, mapCenter);
      prevFetchParams.current = currentFetchParams;
    }
  }, [
    filters.keyword, 
    filters.location, 
    filters.distance, 
    filters.dateRange, 
    filters.categories, 
    mapCenter, 
    mapLoaded, 
    mapHasMoved,
    fetchEvents
  ]);

  useEffect(() => {
    if (rawEvents.length === 0) return;
    
    console.log('[MapView] Applying client-side filters/sort to', rawEvents.length, 'events');
    const filtered = applyFilters(rawEvents, filters);
    const sorted = sortEvents(filtered, filters.sortBy || 'date', mapCenter?.latitude, mapCenter?.longitude);
    
    console.log('[MapView] After filtering/sorting:', filtered.length, 'events remain');
    setEvents(sorted);
  }, [
    rawEvents, 
    filters.priceRange, 
    filters.sortBy, 
    filters.showInViewOnly, 
    mapCenter?.latitude, 
    mapCenter?.longitude,
    setEvents
  ]);

  const handleMapMoveEnd = useCallback(
    (center: { latitude: number; longitude: number }, zoom: number, isUserInteraction: boolean) => {
      console.log('[MapView] Map moved to:', center, 'zoom:', zoom, 'user interaction:', isUserInteraction);
      setMapCenter(center);
      setMapZoom(zoom);
      if (isUserInteraction && mapLoaded) {
        setMapHasMoved(true);
      }
    },
    [mapLoaded]
  );

  const handleSearchThisArea = useCallback(() => {
    if (mapCenter) {
      console.log('[MapView] Search this area clicked, using center:', mapCenter);
      setMapHasMoved(false);
      toast({
        title: "Searching this area",
        description: "Looking for events in the current map view...",
      });
      fetchEvents(filters, mapCenter);
    }
  }, [mapCenter, filters, fetchEvents]);

  const handleMapLoad = useCallback(() => {
    console.log('[MapView] Map loaded');
    setMapLoaded(true);
  }, []);

  const handleAdvancedSearch = useCallback(
    (searchParams: any) => {
      const newFilters: Partial<EventFilters> = {
        keyword: searchParams.keyword,
        location: searchParams.location,
        dateRange: searchParams.dateRange,
        categories: searchParams.categories,
        priceRange: searchParams.priceRange,
        distance: searchParams.radius,
      };
      console.log('[MapView] Advanced search with params:', newFilters);
      handleFiltersChange(newFilters);
    },
    [handleFiltersChange]
  );

  // Force initial event fetch when map first loads
  useEffect(() => {
    if (mapLoaded && mapCenter && (!events.length || events.length === 0) && !isEventsLoading) {
      console.log('[MapView] Initial event fetch for newly loaded map');
      fetchEvents(filters, mapCenter);
    }
  }, [mapLoaded, mapCenter, events.length, isEventsLoading, fetchEvents, filters]);

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
            onLoadingChange={(loading) => {/* No action needed as isEventsLoading is handled by useEventSearch */}}
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
