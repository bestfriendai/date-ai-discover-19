
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import type { EventFilters } from '@/components/map/components/MapControls';

interface UsePartyAIHandlersProps {
  mapCenter: { latitude: number; longitude: number } | null;
  setMapHasMoved: (moved: boolean) => void;
  fetchEvents: (
    filters: EventFilters,
    coords: { latitude: number; longitude: number },
    radius?: number
  ) => void;
  filters: EventFilters & { onCategoriesChange?: (cats: string[]) => void };
}

export function usePartyAIHandlers({
  mapCenter,
  setMapHasMoved,
  fetchEvents,
  filters,
}: UsePartyAIHandlersProps) {
  // Handler for advanced search
  const handleAdvancedSearch = useCallback((searchParams: any) => {
    console.log('[PartyAI] Advanced search with params:', searchParams);

    if (!mapCenter) {
      toast({
        title: "Location required",
        description: "Please allow location access or set a location on the map",
        variant: "destructive"
      });
      return;
    }

    // Use a 30-mile radius for party searches
    const radius = 30;

    const paramsWithPartyCategory = {
      ...searchParams,
      categories: ['party'],
      keyword: searchParams.keyword
        ? `${searchParams.keyword} party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival OR concert OR music`
        : 'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival OR concert OR music OR lounge OR bar OR venue OR mixer OR gathering OR gala OR reception OR meetup OR "happy hour" OR cocktail OR rave OR "live music"',
      limit: 100, // Show the next 100 events
      latitude: mapCenter.latitude,
      longitude: mapCenter.longitude,
      radius
    };

    toast({
      title: "Finding the best parties",
      description: "PartyAI is searching for the hottest events matching your criteria",
    });

    fetchEvents(
      { ...filters, ...paramsWithPartyCategory },
      mapCenter,
      radius
    );
  }, [fetchEvents, filters, mapCenter]);

  // Handler for "Search This Area" button
  const handleSearchThisArea = useCallback(() => {
    console.log('[PartyAI] Search this area clicked');

    if (!mapCenter) {
      toast({
        title: "Location required",
        description: "Please allow location access or set a location on the map",
        variant: "destructive"
      });
      return;
    }

    // Use a 30-mile radius for party area searches
    const radius = 30;

    const filtersWithPartyCategory = {
      ...filters,
      categories: ['party'],
      keyword: 'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival OR concert OR music OR lounge OR bar OR venue OR mixer OR gathering OR gala OR reception OR meetup OR "happy hour" OR cocktail OR rave OR "live music"',
      limit: 100, // Show the next 100 events
      latitude: mapCenter.latitude,
      longitude: mapCenter.longitude,
      radius
    };

    toast({
      title: "Searching for parties in this area",
      description: "PartyAI is finding the best events in the current map view",
    });

    fetchEvents(filtersWithPartyCategory, mapCenter, radius);
    setMapHasMoved(false);
  }, [fetchEvents, filters, mapCenter, setMapHasMoved]);

  return {
    handleAdvancedSearch,
    handleSearchThisArea,
  };
}
