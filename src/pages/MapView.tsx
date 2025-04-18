
import { useState, useCallback, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import MapComponent from '@/components/map/MapComponent';
import type { Event } from '@/types';
import type { EventFilters } from '@/components/map/components/MapControls';
import { applyFilters, sortEvents } from '@/utils/eventFilters';
import { MapSidebars } from '@/components/map/components/MapSidebars';
import { MapControlsArea } from '@/components/map/components/MapControlsArea';
import { useEventSearch } from '@/components/map/hooks/useEventSearch';

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
    setEvents
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
    
    console.log('[MapView] Applying client-side filters/sort');
    const filtered = applyFilters(rawEvents, filters);
    const sorted = sortEvents(filtered, filters.sortBy || 'date', mapCenter?.latitude, mapCenter?.longitude);
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
      setMapHasMoved(false);
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
            onLoadingChange={setIsEventsLoading}
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
          />
        </div>
      </div>
    </div>
  );
};

export default MapView;
