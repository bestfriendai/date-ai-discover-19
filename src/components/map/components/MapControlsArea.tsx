import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import AdvancedSearch from '@/components/search/AdvancedSearch';
import { LoadMoreButton } from './LoadMoreButton';
import type { EventFilters } from './MapControls';

interface MapControlsAreaProps {
  leftSidebarOpen: boolean;
  showSearch: boolean;
  isEventsLoading: boolean;
  filters: EventFilters;
  mapHasMoved?: boolean;
  hasMoreEvents?: boolean;
  totalEvents?: number;
  loadedEvents?: number;
  onLeftSidebarToggle: () => void;
  onSearchToggle: () => void;
  onSearch: (searchParams: any) => void;
  onSearchThisArea?: () => void;
  onLoadMore?: () => void;
}

export const MapControlsArea = ({
  leftSidebarOpen,
  showSearch,
  isEventsLoading,
  filters,
  mapHasMoved,
  hasMoreEvents = false,
  totalEvents = 0,
  loadedEvents = 0,
  onLeftSidebarToggle,
  onSearchToggle,
  onSearch,
  onSearchThisArea,
  onLoadMore
}: MapControlsAreaProps) => {
  return (
    <>
      {/* --- CATEGORY & DATE FILTER BAR --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex gap-2 bg-background/80 backdrop-blur border border-border/40 rounded-full px-4 py-2 shadow-lg">
        {/* Category Filter */}
        <div className="flex gap-1">
          {["music","arts","sports","family","food","party"].map(cat => (
            <Button
              key={cat}
              variant={filters.categories?.includes(cat) ? "default" : "outline"}
              size="sm"
              className={filters.categories?.includes(cat) ? "bg-blue-600 text-white" : "bg-white text-gray-800"}
              onClick={() => {
                const next = filters.categories?.includes(cat)
                  ? filters.categories.filter((c:string) => c !== cat)
                  : [...(filters.categories||[]), cat];
                filters.onCategoriesChange?.(next);
              }}
            >
              {cat.charAt(0).toUpperCase()+cat.slice(1)}
            </Button>
          ))}
        </div>
        {/* Date Range Filter */}
        <div className="flex gap-1 ml-4">
          {[{label:"Today",val:"today"},{label:"This Week",val:"week"},{label:"This Month",val:"month"}].map(({label,val}) => (
            <Button
              key={val}
              variant={filters.datePreset===val?"default":"outline"}
              size="sm"
              className={filters.datePreset===val?"bg-blue-600 text-white":"bg-white text-gray-800"}
              onClick={()=>filters.onDatePresetChange?.(val as 'today'|'week'|'month')}
            >{label}</Button>
          ))}
        </div>
      </div>

      <div className="absolute top-4 left-4 z-30 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onLeftSidebarToggle}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 shadow-lg hover:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center sm:w-10 sm:h-10 text-white transition-all hover:scale-105"
          aria-label={leftSidebarOpen ? "Close events sidebar" : "Open events sidebar"}
        >
          {leftSidebarOpen ? <ChevronLeft className="h-6 w-6 sm:h-4 sm:w-4" /> : <ChevronRight className="h-6 w-6 sm:h-4 sm:w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchToggle}
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
              onSearch={onSearch}
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

      {mapHasMoved && onSearchThisArea && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center z-30">
          <Button
            onClick={onSearchThisArea}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg text-sm sm:text-base px-3 py-2 h-auto"
          >
            <Search className="h-4 w-4 mr-2" />
            Search This Area
          </Button>
        </div>
      )}

      {/* Load More button - only shown when there are more events to load and map hasn't moved */}
      {!mapHasMoved && onLoadMore && (
        <LoadMoreButton
          isLoading={isEventsLoading}
          hasMore={hasMoreEvents}
          totalEvents={totalEvents}
          loadedEvents={loadedEvents}
          onLoadMore={onLoadMore}
        />
      )}
    </>
  );
};
