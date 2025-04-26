import { useCallback, useEffect, useState, useRef } from 'react';
import { MapLayout } from '@/components/map/layout/MapLayout';
import { MapContent } from '@/components/map/layout/MapContent';
import { getMapboxToken } from '@/services/mapboxService'; // Import the service
import { useEventSearch } from '@/components/map/hooks/useEventSearch';
import { useMapState } from '@/components/map/hooks/useMapState';
import { useMapFilters } from '@/components/map/hooks/useMapFilters';
import { useMapEvents } from '@/components/map/hooks/useMapEvents';
import { Loader2Icon } from '@/lib/icons'; // Import loader icon
import AddToPlanModal from '@/components/events/AddToPlanModal';
import { toast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import { SourceStatsDisplay } from '@/components/map/components/SourceStatsDisplay';

const MapView = () => {
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

  // State for Mapbox token
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const tokenFetchAttempts = useRef(0);
  const maxRetryAttempts = 3;

  // Fetch Mapbox token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      console.log('[MapView] Fetching Mapbox token...');
      setIsTokenLoading(true);
      setTokenError(null);
      try {
        const token = await getMapboxToken();
        if (token) {
          console.log('[MapView] Mapbox token fetched successfully:', token.substring(0, 8) + '...');
          setMapboxToken(token);
        } else {
          throw new Error('Mapbox token returned null from service.');
        }
      } catch (error) {
        console.error('[MapView] Error fetching Mapbox token:', error);
        setTokenError(error instanceof Error ? error.message : 'Failed to load map configuration.');
        toast({
          title: 'Map Load Error',
          description: 'Could not retrieve map configuration. Please refresh.',
          variant: 'destructive',
          duration: 10000
        });
      } finally {
        setIsTokenLoading(false);
      }
    };

    fetchToken();
  }, []); // Run only once on mount
  
  // Handler for Add to Plan button
  const handleAddToPlan = useCallback((event: Event) => {
    console.log('[MapView] Opening Add to Plan modal for event:', event.id);
    setEventToAdd(event);
    setAddToPlanModalOpen(true);
  }, []);

  // Handler to close the Add to Plan modal
  const handleCloseAddToPlanModal = useCallback(() => {
    setAddToPlanModalOpen(false);
    setEventToAdd(null);
  }, []);

  // Custom handler for searching events in the current map area
  const handleSearchThisArea = useCallback(() => {
    if (mapCenter) {
      toast({
        title: "Searching this area",
        description: "Looking for events in the current map view...",
      });
      fetchEvents(filters, mapCenter);
      setMapHasMoved(false);
    }
  }, [mapCenter, filters, fetchEvents, setMapHasMoved]);

  const handleAdvancedSearch = useCallback(
    (searchParams: any) => {
      const newFilters = {
        keyword: searchParams.keyword,
        location: searchParams.location,
        dateRange: searchParams.dateRange,
        categories: searchParams.categories,
        priceRange: searchParams.priceRange,
        distance: searchParams.radius,
      };
      handleFiltersChange(newFilters);

      // If we have map center coordinates, fetch events with the new filters
      if (mapCenter) {
        fetchEvents(newFilters, mapCenter);
      }
    },
    [handleFiltersChange, mapCenter, fetchEvents]
  );

  // Effect to load events when map center changes (e.g., after Find My Location)
  useEffect(() => {
    if (mapCenter && mapLoaded) {
      // Validate coordinates before fetching
      const { latitude, longitude } = mapCenter;
      const isValidLat = typeof latitude === 'number' && !isNaN(latitude) && latitude >= -90 && latitude <= 90;
      const isValidLng = typeof longitude === 'number' && !isNaN(longitude) && longitude >= -180 && longitude <= 180;

      if (isValidLat && isValidLng) {
        console.log('[MapView] Map center changed, fetching events for:', mapCenter);
        // Set default search parameters if none exist
        const searchParams = {
          ...filters,
          radius: filters.distance || 30, // Default 30 mile radius
          categories: filters.categories || [], // Empty array if no categories
        };
        fetchEvents(searchParams, mapCenter);
      } else {
        console.warn('[MapView] Invalid coordinates, skipping event fetch:', mapCenter);
      }
    }
  }, [mapCenter, mapLoaded, filters, fetchEvents]);

  // Add event listener for the custom 'view-event' event
  useEffect(() => {
    // Correctly type the event parameter as CustomEvent
    const handleViewEvent = (event: CustomEvent<{ event: Event }>) => {
      // No need for type assertion here anymore
      if (event.detail && event.detail.event) {
        console.log('[MapView] Received view-event for:', event.detail.event.id);
        handleEventSelect(event.detail.event);

        // If the event has coordinates, center the map on it
        if (event.detail.event.coordinates) {
          const [lng, lat] = event.detail.event.coordinates;
          setMapCenter({ latitude: lat, longitude: lng });
          setMapZoom(15); // Zoom in to see the event clearly
        }
      }
    };

    // Add event listener - TypeScript should infer the type correctly now
    window.addEventListener('view-event', handleViewEvent as EventListener); // Keep cast for safety or use unknown

    // Clean up
    return () => {
      window.removeEventListener('view-event', handleViewEvent as EventListener); // Keep cast for safety or use unknown
    };
  }, [handleEventSelect, setMapCenter, setMapZoom]);

  return (
    <>
      {/* Display loading indicator while fetching token */}
      {isTokenLoading && (
        <MapLayout>
          <div className="flex-1 flex items-center justify-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading Map Configuration...</span>
          </div>
        </MapLayout>
      )}

      {/* Display error if token fetch failed and no fallback worked */}
      {!isTokenLoading && !mapboxToken && (
        <MapLayout>
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
              <h2 className="font-bold mb-2">Map Load Error</h2>
              <p>Could not retrieve the necessary configuration to load the map. Please ensure the Mapbox token is correctly set up in the backend and try refreshing the page.</p>
            </div>
          </div>
        </MapLayout>
      )}

      {/* Log token state before rendering MapContent */}
      {console.log('[MapView] Rendering MapContent - isTokenLoading:', isTokenLoading, 'mapboxToken:', mapboxToken)}

      {!isTokenLoading && mapboxToken && (
        <MapLayout>
          <MapContent
            leftSidebarOpen={leftSidebarOpen}
            rightSidebarOpen={rightSidebarOpen}
            selectedEvent={selectedEvent}
            showSearch={showSearch}
            mapHasMoved={mapHasMoved}
            mapLoaded={mapLoaded}
            events={events}
            isEventsLoading={isEventsLoading}
            filters={{ ...restFilters, onCategoriesChange, onDatePresetChange }}
            hasMoreEvents={hasMore}
            totalEvents={totalEvents}
            mapboxToken={mapboxToken} // Pass the token
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
      )}
    </>
  );
};

export default MapView;
