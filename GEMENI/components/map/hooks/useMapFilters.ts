import { useState, useCallback } from 'react';
import type { EventFilters } from '@/components/map/components/MapControls';

const DEFAULT_DISTANCE = 15; // Reduced from 30 to 15 miles for more local results

export const useMapFilters = () => {
  const [filters, setFilters] = useState<EventFilters>({
    distance: DEFAULT_DISTANCE,
    sortBy: 'date',
    categories: ['party'], // Include 'party' by default to ensure party events are shown
    datePreset: 'today',
  });

  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // --- CATEGORY FILTER HANDLER ---
  const onCategoriesChange = useCallback((categories: string[]) => {
    setFilters((prev) => ({ ...prev, categories }));
  }, []);

  // --- DATE PRESET HANDLER ---
  const onDatePresetChange = useCallback((datePreset: 'today'|'week'|'month') => {
    setFilters((prev) => ({ ...prev, datePreset }));
  }, []);

  return {
    filters: {
      ...filters,
      onCategoriesChange,
      onDatePresetChange,
    },
    setFilters,
    handleFiltersChange
  };
};
