import { useState, useCallback, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import EventsSidebar from '@/components/events/EventsSidebar';
import EventDetail from '@/components/events/EventDetail';
import MapComponent from '@/components/map/MapComponent';
import AdvancedSearch from '@/components/search/AdvancedSearch';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Event } from '@/types';
import type { EventFilters } from '@/components/map/components/MapControls';
import { searchEvents } from '@/services/eventService';
import { applyFilters, sortEvents } from '@/utils/eventFilters';
import { formatISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_DISTANCE = 30;

const MapView = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ longitude: number; latitude: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [mapHasMoved, setMapHasMoved] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [filters, setFilters] = useState<EventFilters>({
    distance: DEFAULT_DISTANCE,
    sortBy: 'date',
  });
  const { toast } = useToast();

  const handleEventSelect = (event: Event | null) => {
    setSelectedEvent(event);
    if (event) setRightSidebarOpen(true);
  };

  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setMapHasMoved(false);
  }, []);

  const fetchAndSetEvents = useCallback(
    async (activeFilters: EventFilters, centerCoords?: { latitude: number; longitude: number }, radiusOverride?: number) => {
      if (isEventsLoading) return;
      
      setIsEventsLoading(true);
      try {
        const locationCoords = centerCoords || (mapCenter ? { latitude: mapCenter.latitude, longitude: mapCenter.longitude } : null);
        if (!locationCoords) {
          console.warn('[MapView] Cannot fetch events: No location coordinates available.');
          toast({
            title: "Location Unavailable",
            description: "Could not determine your location to fetch events. Please allow location access or search for a location.",
            variant: "default",
          });
          setRawEvents([]);
          setEvents([]);
          setIsEventsLoading(false);
          return;
        }
        
        console.log('[MapView] Fetching events for:', locationCoords, 
          'radius:', radiusOverride || activeFilters.distance || DEFAULT_DISTANCE);
          
        const searchParams: any = {
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
          radius: radiusOverride !== undefined ? radiusOverride : activeFilters.distance ?? DEFAULT_DISTANCE,
          startDate: activeFilters.dateRange?.from ? formatISO(activeFilters.dateRange.from, { representation: 'date' }) : undefined,
          endDate: activeFilters.dateRange?.to ? formatISO(activeFilters.dateRange.to, { representation: 'date' }) : undefined,
          categories: activeFilters.categories,
          keyword: activeFilters.keyword,
          location: activeFilters.location,
        };
        
        const result = await searchEvents(searchParams);
        console.log('[MapView] API Result:', result);
        
        if (!result || !result.events) {
          throw new Error('Invalid API response');
        }
        
        const fetchedEvents = result.events;
        setRawEvents(fetchedEvents);

        const filtered = applyFilters(fetchedEvents, activeFilters);
        const sorted = sortEvents(filtered, activeFilters.sortBy || 'date', locationCoords.latitude, locationCoords.longitude);
        
        console.log('[MapView] Processed events:', sorted.length);
        setEvents(sorted);
      } catch (error) {
        console.error('[MapView] Error fetching events:', error);
        toast({
          title: "Failed to load events",
          description: "An error occurred while loading events. Please try again.",
          variant: "destructive",
        });
        setRawEvents([]);
        setEvents([]);
      } finally {
        setIsEventsLoading(false);
      }
    },
    [isEventsLoading, mapCenter, toast]
  );

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
      fetchAndSetEvents(filters, mapCenter);
      prevFetchParams.current = currentFetchParams;
    } else {
      console.log('[MapView] No relevant parameter changes, skipping fetch');
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
    fetchAndSetEvents
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
    mapCenter?.longitude
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
      console.log('[MapView] Search this area clicked for:', mapCenter);
      setMapHasMoved(false);
      fetchAndSetEvents(filters, mapCenter);
    }
  }, [mapCenter, filters, fetchAndSetEvents]);

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
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <motion.div
              initial={{ x: -380 }}
              animate={{ x: 0 }}
              exit={{ x: -380 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="w-full max-w-[380px] sm:w-[380px] bg-card/50 backdrop-blur-xl border-r border-border/50 relative z-20 overflow-y-auto h-full fixed sm:static left-0 top-0 sm:relative"
              style={{ height: '100%', maxHeight: 'calc(100vh - 64px)' }}
            >
              <EventsSidebar
                onClose={() => setLeftSidebarOpen(false)}
                onEventSelect={handleEventSelect}
                isLoading={isEventsLoading}
                events={events}
              />
            </motion.div>
          )}
        </AnimatePresence>

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

          <div className="absolute top-4 left-4 z-30 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 shadow-lg hover:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center sm:w-10 sm:h-10 text-white transition-all hover:scale-105"
              aria-label={leftSidebarOpen ? "Close events sidebar" : "Open events sidebar"}
            >
              {leftSidebarOpen ? <ChevronLeft className="h-6 w-6 sm:h-4 sm:w-4" /> : <ChevronRight className="h-6 w-6 sm:h-4 sm:w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 shadow-lg hover:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center sm:w-10 sm:h-10 text-white transition-all hover:scale-105"
              aria-label={showSearch ? "Close search" : "Open search"}
            >
              {showSearch ? <X className="h-6 w-6 sm:h-4 sm:w-4" /> : <Search className="h-6 w-6 sm:h-4 sm:w-4" />}
            </Button>
          </div>

          <AnimatePresence>
            {showSearch && (
              <motion.div
                className="absolute top-20 left-4 right-4 z-30 w-full max-w-3xl mx-auto"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AdvancedSearch
                  onSearch={handleAdvancedSearch}
                  initialFilters={{
                    ...filters,
                    dateRange: {
                      from: filters.dateRange?.from,
                      to: filters.dateRange?.to,
                    },
                  }}
                  loading={isEventsLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {mapLoaded && mapCenter && mapHasMoved && (
              <motion.div
                className="absolute top-20 left-1/2 -translate-x-1/2 z-10"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={handleSearchThisArea}
                  className="shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-full px-6 py-2 transition-all transform hover:scale-105"
                  disabled={isEventsLoading}
                >
                  {isEventsLoading ? (
                    <>
                      <span className="mr-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      </span>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" /> Search This Area ({rawEvents.length} results found)
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {rightSidebarOpen && selectedEvent && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="w-full max-w-[400px] sm:w-[400px] bg-card/50 backdrop-blur-xl border-l border-border/50 relative z-20 overflow-y-auto h-full fixed sm:static right-0 top-0 sm:relative"
              style={{ height: '100%', maxHeight: 'calc(100vh - 64px)' }}
            >
              <EventDetail
                event={selectedEvent}
                onClose={() => setRightSidebarOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MapView;
