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
import type { EventFilters } from '@/components/map/components/MapControls'; // Correct import path
import { searchEvents } from '@/services/eventService';
import { applyFilters, sortEvents } from '@/utils/eventFilters';
import { formatISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // Import useToast

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

  // Centralized filter state
  const [filters, setFilters] = useState<EventFilters>({
    distance: DEFAULT_DISTANCE,
    sortBy: 'date',
  });
  const { toast } = useToast(); // Call useToast

  // Handle event selection
  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setRightSidebarOpen(true);
  };

  // Unified filter change handler
  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setMapHasMoved(false); // Hide "Search This Area" button when filters change
  }, []);

  // Fetch and set events (API + client-side filtering/sorting)
  const fetchAndSetEvents = useCallback(
    async (activeFilters: EventFilters, centerCoords?: { latitude: number; longitude: number }, radiusOverride?: number) => {
      setIsEventsLoading(true);
      try {
        const locationCoords = centerCoords || (mapCenter ? { latitude: mapCenter.latitude, longitude: mapCenter.longitude } : null);
        if (!locationCoords) {
          console.warn('[MapView] Cannot fetch events: No location coordinates available.');
          toast({ // Add toast for missing location
            title: "Location Unavailable",
            description: "Could not determine your location to fetch events. Please allow location access or search for a location.",
            variant: "default", // Use default variant
          });
          setRawEvents([]);
          setEvents([]);
          setIsEventsLoading(false); // Ensure loading state is reset
          return;
        }
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
        const fetchedEvents = result.events;
        setRawEvents(fetchedEvents);

        // Apply client-side filtering and sorting
        const filtered = applyFilters(fetchedEvents, activeFilters);
        const sorted = sortEvents(filtered, activeFilters.sortBy || 'date', locationCoords.latitude, locationCoords.longitude);
        setEvents(sorted);
      } catch (error) {
        setRawEvents([]);
        setEvents([]);
      } finally {
        setIsEventsLoading(false);
      }
    },
    [mapCenter]
  );

  // Ref for previous API-affecting filters and map center to prevent redundant fetches
  const prevFetchParams = useRef<{ filters: EventFilters; center: typeof mapCenter } | null>(null);

  // Effect: fetch events only when API-affecting filters or map center changes (and map is loaded)
  useEffect(() => {
    if (mapLoaded && mapCenter) {
      const currentFetchParams = { filters, center: mapCenter };
      // Check if API-relevant filters or center actually changed
      const filtersChanged = (
        !prevFetchParams.current ||
        prevFetchParams.current.filters.keyword !== filters.keyword ||
        prevFetchParams.current.filters.location !== filters.location ||
        prevFetchParams.current.filters.distance !== filters.distance ||
        JSON.stringify(prevFetchParams.current.filters.dateRange) !== JSON.stringify(filters.dateRange) ||
        JSON.stringify(prevFetchParams.current.filters.categories) !== JSON.stringify(filters.categories)
      );
      const centerChanged = (
        !prevFetchParams.current ||
        prevFetchParams.current.center?.latitude !== mapCenter.latitude ||
        prevFetchParams.current.center?.longitude !== mapCenter.longitude
      );

      if (filtersChanged || centerChanged) {
        console.log('[MapView] API params changed, triggering fetch.');
        fetchAndSetEvents(filters, mapCenter);
        prevFetchParams.current = currentFetchParams; // Store current params for next comparison
      } else {
        console.log('[MapView] API params unchanged, skipping fetch.');
      }
    } else if (mapLoaded && !mapCenter) {
      console.warn('[MapView] Map loaded but no center available for initial fetch.');
      setIsEventsLoading(false);
    }
  }, [filters.keyword, filters.location, filters.distance, filters.dateRange, filters.categories, mapCenter, mapLoaded, fetchAndSetEvents]); // Depend only on API-affecting filters + mapCenter + mapLoaded

  // Effect: apply client-side filters/sort when rawEvents or client-side-only filters change
  useEffect(() => {
    if (rawEvents.length > 0) {
      console.log('[MapView] Applying client-side filters/sort.');
      const filtered = applyFilters(rawEvents, filters); // applyFilters should handle all filter types
      const sorted = sortEvents(filtered, filters.sortBy || 'date', mapCenter?.latitude, mapCenter?.longitude);
      setEvents(sorted);
    } else {
      setEvents([]); // Clear events if rawEvents is empty
    }
    // Depend on rawEvents and only client-side filter properties
  }, [rawEvents, filters.priceRange, filters.sortBy, filters.showInViewOnly, mapCenter?.latitude, mapCenter?.longitude]); // Add showInViewOnly if it's part of EventFilters

  // Handle AdvancedSearch
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

  // Handle "Search This Area"
  const handleSearchThisArea = useCallback(() => {
    if (mapCenter) {
      setMapHasMoved(false);
      fetchAndSetEvents(filters, mapCenter);
    }
  }, [mapCenter, filters, fetchAndSetEvents]);

  // Map move handler
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

  // Map load handler
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

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
              // Adjust maxHeight to account for header (assuming 64px header height)
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

          {/* Toggle button for left sidebar and Search */}
          <div className="absolute top-4 left-4 z-30 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background/90 rounded-full w-12 h-12 flex items-center justify-center sm:w-10 sm:h-10"
              aria-label={leftSidebarOpen ? "Close events sidebar" : "Open events sidebar"}
            >
              {leftSidebarOpen ? <ChevronLeft className="h-6 w-6 sm:h-4 sm:w-4" /> : <ChevronRight className="h-6 w-6 sm:h-4 sm:w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background/90 rounded-full w-12 h-12 flex items-center justify-center sm:w-10 sm:h-10"
              aria-label={showSearch ? "Close search" : "Open search"}
            >
              {showSearch ? <X className="h-6 w-6 sm:h-4 sm:w-4" /> : <Search className="h-6 w-6 sm:h-4 sm:w-4" />}
            </Button>
          </div>

          {/* Advanced Search Panel */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                className="absolute top-20 left-4 right-4 z-30 w-full max-w-3xl mx-auto" // Add w-full
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AdvancedSearch
                  onSearch={handleAdvancedSearch}
                  // Map filters to the type expected by AdvancedSearch
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

          {/* "Search This Area" Button */}
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
                  className="shadow-lg bg-background/90 hover:bg-background backdrop-blur-sm border border-border/50"
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
              // Adjust maxHeight to account for header (assuming 64px header height)
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
