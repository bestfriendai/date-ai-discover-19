import { useState, useRef, useEffect } from 'react';
import { Filter, Locate, Search, X, Moon, Sun, Satellite, Loader2, Map, Compass, MapPin, Calendar, Music, PartyPopper, Trophy, Utensils, Heart, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { EventFilters as BaseEventFilters } from '@/types';

// Extend the base EventFilters with UI-specific properties
export interface EventFilters extends BaseEventFilters {
  showInViewOnly?: boolean;
  onShowInViewOnlyChange?: (val: boolean) => void;
  // --- ADDED FOR FILTER BAR ---
  categories?: string[];
  onCategoriesChange?: (categories: string[]) => void;
  datePreset?: 'today' | 'week' | 'month' | 'custom';
  onDatePresetChange?: (preset: 'today' | 'week' | 'month' | 'custom') => void;
  // --- ADVANCED FILTERS ---
  priceRange?: [number, number]; // [min, max] price in dollars
  onPriceRangeChange?: (range: [number, number]) => void;
  sortBy?: 'distance' | 'date' | 'price' | 'popularity';
  onSortByChange?: (sortBy: 'distance' | 'date' | 'price' | 'popularity') => void;
  sortDirection?: 'asc' | 'desc';
  onSortDirectionChange?: (direction: 'asc' | 'desc') => void;
  showFavoritesOnly?: boolean;
  onShowFavoritesOnlyChange?: (val: boolean) => void;
}

interface MapControlsProps {
  filters: EventFilters;
  onLocationSearch: (location: string) => void;
  currentMapStyle: string;
  onMapStyleChange: (styleUrl: string) => void;
  onFindMyLocation: () => void;
  locationRequested: boolean;
}

export const MapControls = ({
  onLocationSearch,
  filters,
  currentMapStyle,
  onMapStyleChange,
  onFindMyLocation,
  locationRequested,
}: MapControlsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search is empty",
        description: "Please enter a location to search",
        variant: "destructive"
      });
      return;
    }

    onLocationSearch(searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleGetLocation = () => {
    setSearchTerm('');
    onFindMyLocation();
  };

  // Helper functions for date handling
  const getDateRangeFromPreset = (preset: 'today' | 'week' | 'month'): { from: Date, to: Date } => {
    const today = new Date();

    switch (preset) {
      case 'today':
        return {
          from: startOfDay(today),
          to: endOfDay(today)
        };
      case 'week':
        return {
          from: startOfDay(today),
          to: endOfDay(addDays(today, 7))
        };
      case 'month':
        return {
          from: startOfDay(today),
          to: endOfDay(addDays(today, 30))
        };
      default:
        return {
          from: startOfDay(today),
          to: endOfDay(today)
        };
    }
  };

  const handleDatePresetChange = (preset: 'today' | 'week' | 'month' | 'custom') => {
    if (preset === 'custom') {
      // Just set the preset without changing the date range
      filters.onDatePresetChange?.(preset);
      return;
    }

    const dateRange = getDateRangeFromPreset(preset);

    // Update both the preset and the actual date range
    filters.onDatePresetChange?.(preset);
    filters.onDateRangeChange?.(dateRange);
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];

    filters.onCategoriesChange?.(newCategories);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-4 pb-6">
      {/* Main search controls */}
      <motion.div
        className="w-full max-w-2xl px-4 flex flex-col items-center gap-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search box */}
        <div className="relative w-full">
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Enter a location..."
                className="w-full pl-12 pr-10 h-14 bg-background/90 backdrop-blur-xl border border-primary/30 rounded-full shadow-lg text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-primary/10 hover:bg-primary/20 rounded-full"
                onClick={handleSearch}
              >
                <Search className="h-5 w-5 text-primary" />
              </Button>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="h-14 px-5 bg-indigo-500 text-white hover:bg-indigo-600 rounded-full shadow-lg flex items-center gap-2"
              onClick={handleGetLocation}
              disabled={locationRequested}
            >
              {locationRequested ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Locate className="h-5 w-5" />
              )}
              Find My Location
            </Button>
          </div>
        </div>

        {/* Controls row with map style and advanced filters */}
        <div className="flex justify-between w-full">
          {/* Map style controls */}
          <ToggleGroup type="single" className="bg-background/80 backdrop-blur-xl rounded-full border border-border/50 p-1 shadow-lg">
            <ToggleGroupItem
              value="dark"
              onClick={() => onMapStyleChange('mapbox://styles/mapbox/dark-v11')}
              className={cn(
                "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                currentMapStyle.includes('dark-v11') && "bg-primary text-primary-foreground"
              )}
              aria-label="Dark mode"
            >
              <Moon className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="light"
              onClick={() => onMapStyleChange('mapbox://styles/mapbox/light-v11')}
              className={cn(
                "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                currentMapStyle.includes('light-v11') && "bg-primary text-primary-foreground"
              )}
              aria-label="Light mode"
            >
              <Sun className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="satellite"
              onClick={() => onMapStyleChange('mapbox://styles/mapbox/satellite-streets-v12')}
              className={cn(
                "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                currentMapStyle.includes('satellite-streets-v12') && "bg-primary text-primary-foreground"
              )}
              aria-label="Satellite view"
            >
              <Satellite className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="streets"
              onClick={() => onMapStyleChange('mapbox://styles/mapbox/streets-v12')}
              className={cn(
                "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                currentMapStyle.includes('streets-v12') && "bg-primary text-primary-foreground"
              )}
              aria-label="Streets view"
            >
              <Map className="h-5 w-5" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Advanced filters button and popover */}
          <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-background/80 backdrop-blur-xl rounded-full border border-border/50 shadow-lg px-4"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="h-5 w-5 mr-2" />
                Advanced Filters
                <Badge className="ml-2 bg-primary text-primary-foreground">
                  {(filters.categories?.length || 0) +
                   (filters.datePreset ? 1 : 0) +
                   (filters.priceRange ? 1 : 0) +
                   (filters.sortBy ? 1 : 0) +
                   (filters.showFavoritesOnly ? 1 : 0)}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl rounded-xl" align="end">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Filters & Sorting</h3>

                {/* Categories */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={filters.categories?.includes('music') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleCategoryToggle('music')}
                    >
                      <Music className="h-3 w-3 mr-1" /> Music
                    </Badge>
                    <Badge
                      variant={filters.categories?.includes('party') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleCategoryToggle('party')}
                    >
                      <PartyPopper className="h-3 w-3 mr-1" /> Party
                    </Badge>
                    <Badge
                      variant={filters.categories?.includes('sports') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleCategoryToggle('sports')}
                    >
                      <Trophy className="h-3 w-3 mr-1" /> Sports
                    </Badge>
                    <Badge
                      variant={filters.categories?.includes('food') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleCategoryToggle('food')}
                    >
                      <Utensils className="h-3 w-3 mr-1" /> Food
                    </Badge>
                    <Badge
                      variant={filters.categories?.includes('family') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleCategoryToggle('family')}
                    >
                      <Heart className="h-3 w-3 mr-1" /> Family
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Date Range */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Date Range</h4>
                  <RadioGroup
                    value={filters.datePreset || ''}
                    onValueChange={(value) => handleDatePresetChange(value as any)}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="today" id="today" />
                      <Label htmlFor="today">Today</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="week" id="week" />
                      <Label htmlFor="week">Next 7 days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="month" id="month" />
                      <Label htmlFor="month">Next 30 days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom">Custom range</Label>
                    </div>
                  </RadioGroup>

                  {filters.datePreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="space-y-1">
                        <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          className="h-8 text-xs"
                          value={filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const newDate = e.target.value ? new Date(e.target.value) : undefined;
                            filters.onDateRangeChange?.({
                              from: newDate,
                              to: filters.dateRange?.to
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="end-date" className="text-xs">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          className="h-8 text-xs"
                          value={filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const newDate = e.target.value ? new Date(e.target.value) : undefined;
                            filters.onDateRangeChange?.({
                              from: filters.dateRange?.from,
                              to: newDate
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Price Range */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <h4 className="font-medium text-sm">Price Range</h4>
                    <span className="text-xs text-muted-foreground">
                      {filters.priceRange ? `$${filters.priceRange[0]} - $${filters.priceRange[1] === 1000 ? '1000+' : filters.priceRange[1]}` : 'Any'}
                    </span>
                  </div>
                  <Slider
                    defaultValue={filters.priceRange || [0, 1000]}
                    max={1000}
                    step={50}
                    onValueChange={(value) => filters.onPriceRangeChange?.(value as [number, number])}
                    className="py-4"
                  />
                </div>

                <Separator />

                {/* Sorting */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Sort By</h4>
                  <div className="flex items-center gap-2">
                    <Select
                      value={filters.sortBy || 'distance'}
                      onValueChange={(value) => filters.onSortByChange?.(value as any)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Distance</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="popularity">Popularity</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => filters.onSortDirectionChange?.(filters.sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="h-10 w-10"
                    >
                      <ArrowUpDown className={cn(
                        "h-4 w-4 transition-transform",
                        filters.sortDirection === 'desc' && "rotate-180"
                      )} />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Other Options */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Other Options</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="favorites-only"
                      checked={filters.showFavoritesOnly}
                      onCheckedChange={(checked) => filters.onShowFavoritesOnlyChange?.(!!checked)}
                    />
                    <Label htmlFor="favorites-only">Show favorites only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="in-view-only"
                      checked={filters.showInViewOnly}
                      onCheckedChange={(checked) => filters.onShowInViewOnlyChange?.(!!checked)}
                    />
                    <Label htmlFor="in-view-only">Show events in current view only</Label>
                  </div>
                </div>

                {/* Reset button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    filters.onCategoriesChange?.([]);
                    filters.onDatePresetChange?.(undefined);
                    filters.onDateRangeChange?.(undefined);
                    filters.onPriceRangeChange?.(undefined);
                    filters.onSortByChange?.('distance');
                    filters.onSortDirectionChange?.('asc');
                    filters.onShowFavoritesOnlyChange?.(false);
                    filters.onShowInViewOnlyChange?.(false);
                    setShowAdvancedFilters(false);
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>
    </div>
  );
};
