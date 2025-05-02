import { useState, useCallback } from 'react';

export interface FiltersState {
  categories: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  location: string;
  radius: number;
  keyword: string;
  onCategoriesChange: (categories: string[]) => void;
  onDatePresetChange: (preset: string) => void;
}

export const useMapFilters = () => {
  const [filters, setFilters] = useState<FiltersState>({
    categories: [],
    dateRange: {
      from: undefined,
      to: undefined
    },
    location: '',
    radius: 30, // Default radius in miles
    keyword: '',
    onCategoriesChange: () => {},
    onDatePresetChange: () => {}
  });

  // Handle category changes
  const handleCategoriesChange = useCallback((categories: string[]) => {
    setFilters(prev => ({
      ...prev,
      categories
    }));
  }, []);

  // Handle date preset changes
  const handleDatePresetChange = useCallback((preset: string) => {
    const now = new Date();
    let from: Date | undefined = now;
    let to: Date | undefined = undefined;

    switch (preset) {
      case 'today':
        from = now;
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
        break;
      case 'tomorrow':
        from = new Date(now);
        from.setDate(from.getDate() + 1);
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59, 999);
        break;
      case 'this-week':
        from = now;
        to = new Date(now);
        to.setDate(to.getDate() + (7 - to.getDay()));
        to.setHours(23, 59, 59, 999);
        break;
      case 'this-weekend':
        from = new Date(now);
        // Set to next Friday if today is not already Friday, Saturday, or Sunday
        const dayOfWeek = from.getDay();
        if (dayOfWeek < 5) { // 0 is Sunday, so 5 is Friday
          from.setDate(from.getDate() + (5 - dayOfWeek));
        }
        from.setHours(17, 0, 0, 0); // 5 PM on Friday
        to = new Date(from);
        to.setDate(to.getDate() + 2); // Sunday
        to.setHours(23, 59, 59, 999);
        break;
      case 'next-week':
        from = new Date(now);
        from.setDate(from.getDate() + (7 - from.getDay()) + 1); // Next Monday
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(to.getDate() + 6); // Next Sunday
        to.setHours(23, 59, 59, 999);
        break;
      case 'this-month':
        from = now;
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'custom':
        // Don't change the date range, let the user set it manually
        break;
      default:
        // Default to next 30 days
        from = now;
        to = new Date(now);
        to.setDate(to.getDate() + 30);
        to.setHours(23, 59, 59, 999);
    }

    setFilters(prev => ({
      ...prev,
      dateRange: { from, to }
    }));
  }, []);

  // Handle all filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<FiltersState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      onCategoriesChange: handleCategoriesChange,
      onDatePresetChange: handleDatePresetChange
    }));
  }, [handleCategoriesChange, handleDatePresetChange]);

  // Initialize the callback functions
  useState(() => {
    setFilters(prev => ({
      ...prev,
      onCategoriesChange: handleCategoriesChange,
      onDatePresetChange: handleDatePresetChange
    }));
  });

  return {
    filters,
    handleFiltersChange
  };
};
