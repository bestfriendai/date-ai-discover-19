import { useState, useCallback } from 'react';
import type { EventFilters } from '@/components/map/components/MapControls';
import { DateRange } from 'react-day-picker';

const DEFAULT_DISTANCE = 30;

export const useMapFilters = () => {
  const [filters, setFilters] = useState<EventFilters>({
    distance: DEFAULT_DISTANCE,
    sortBy: 'distance',
    sortDirection: 'asc',
    categories: [],
    datePreset: 'week',
    showInViewOnly: false,
    showFavoritesOnly: false,
    priceRange: [0, 1000],
  });

  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // --- CATEGORY FILTER HANDLER ---
  const onCategoriesChange = useCallback((categories: string[]) => {
    setFilters((prev) => ({ ...prev, categories }));
  }, []);

  // --- DATE PRESET HANDLER ---
  const onDatePresetChange = useCallback((datePreset?: 'today'|'week'|'month'|'custom') => {
    setFilters((prev) => ({ ...prev, datePreset }));
  }, []);

  // --- DATE RANGE HANDLER ---
  const onDateRangeChange = useCallback((dateRange?: DateRange) => {
    setFilters((prev) => ({ ...prev, dateRange }));
  }, []);

  // --- PRICE RANGE HANDLER ---
  const onPriceRangeChange = useCallback((priceRange?: [number, number]) => {
    setFilters((prev) => ({ ...prev, priceRange }));
  }, []);

  // --- SORT BY HANDLER ---
  const onSortByChange = useCallback((sortBy?: 'distance' | 'date' | 'price' | 'popularity') => {
    setFilters((prev) => ({ ...prev, sortBy }));
  }, []);

  // --- SORT DIRECTION HANDLER ---
  const onSortDirectionChange = useCallback((sortDirection?: 'asc' | 'desc') => {
    setFilters((prev) => ({ ...prev, sortDirection }));
  }, []);

  // --- SHOW IN VIEW ONLY HANDLER ---
  const onShowInViewOnlyChange = useCallback((showInViewOnly?: boolean) => {
    setFilters((prev) => ({ ...prev, showInViewOnly }));
  }, []);

  // --- SHOW FAVORITES ONLY HANDLER ---
  const onShowFavoritesOnlyChange = useCallback((showFavoritesOnly?: boolean) => {
    setFilters((prev) => ({ ...prev, showFavoritesOnly }));
  }, []);

  return {
    filters: {
      ...filters,
      onCategoriesChange,
      onDatePresetChange,
      onDateRangeChange,
      onPriceRangeChange,
      onSortByChange,
      onSortDirectionChange,
      onShowInViewOnlyChange,
      onShowFavoritesOnlyChange,
    },
    setFilters,
    handleFiltersChange
  };
};
