
import { useState, useCallback } from 'react';
import type { EventFilters } from '@/components/map/components/MapControls';

const DEFAULT_DISTANCE = 30;

export const useMapFilters = () => {
  const [filters, setFilters] = useState<EventFilters>({
    distance: DEFAULT_DISTANCE,
    sortBy: 'date',
  });

  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    filters,
    setFilters,
    handleFiltersChange
  };
};
