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

  // Set Mapbox token directly on component mount
  useEffect(() => {
    console.log('[MapView] Setting Mapbox token directly...');
    setIsTokenLoading(true);

    // Use the token directly instead of fetching it
    const directToken = 'pk.eyJ1IjoidHJhcHBhdCIsImEiOiJjbTMzODBqYTYxbHcwMmpwdXpxeWljNXJ3In0.xKUEW2C1kjFBu7kr7Uxfow';
    console.log('[MapView] Using direct Mapbox token:', directToken.substring(0, 8) + '...');
    setMapboxToken(directToken);
    setIsTokenLoading(false);
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
    if (mapLoaded) {
      // If we have map center coordinates, use them
      if (mapCenter) {
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
          return;
        } else {
          console.warn('[MapView] Invalid coordinates, will try to get user location');
        }
      }

      // If we don't have valid map center coordinates, try to get the user's location
      console.log('[MapView] No valid map center, attempting to get user location');

      // Use a default location (New York City) if we can't get the user's location
      const defaultLocation = { latitude: 40.7128, longitude: -74.0060 };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Successfully got user's location
          const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('[MapView] Got user location:', userLocation);

          // Update map center with user location
          setMapCenter(userLocation);

          // Fetch events for user location
          const searchParams = {
            ...filters,
            radius: filters.distance || 30,
            categories: filters.categories || [],
          };
          fetchEvents(searchParams, userLocation);
        },
        (error) => {
          // Failed to get user's location, use default
          console.warn('[MapView] Failed to get user location:', error.message);
          console.log('[MapView] Using default location (New York City)');

          // Update map center with default location
          setMapCenter(defaultLocation);

          // Fetch events for default location
          const searchParams = {
            ...filters,
            radius: filters.distance || 30,
            categories: filters.categories || [],
          };
          fetchEvents(searchParams, defaultLocation);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [mapCenter, mapLoaded, filters, fetchEvents, setMapCenter]);

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
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded-md">
              <h2 className="font-bold mb-2">Map Loading</h2>
              <p>The map is taking longer than expected to load. Please wait a moment or try refreshing the page.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Refresh Page
              </button>
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
