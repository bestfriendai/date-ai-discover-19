
import { useState, useRef, useEffect } from 'react';
import { 
  FilterIcon, 
  LocateIcon, 
  SearchIcon, 
  XIcon, 
  MoonIcon, 
  SunIcon, 
  SatelliteIcon, 
  Loader2Icon, 
  MapIcon, 
  CompassIcon, 
  MapPinIcon 
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from '@/lib/utils';
import { EventFilters as BaseEventFilters } from '@/types';

// Extend the base EventFilters with UI-specific properties
export interface EventFilters extends BaseEventFilters {
  showInViewOnly?: boolean;
  onShowInViewOnlyChange?: (val: boolean) => void;
  // --- ADDED FOR FILTER BAR ---
  categories?: string[];
  onCategoriesChange?: (categories: string[]) => void;
  datePreset?: 'today' | 'week' | 'month';
  onDatePresetChange?: (preset: 'today' | 'week' | 'month') => void;
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

              <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                  onClick={() => setSearchTerm('')}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-primary/10 hover:bg-primary/20 rounded-full"
                onClick={handleSearch}
              >
                <SearchIcon className="h-5 w-5 text-primary" />
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
                <Loader2Icon className="h-5 w-5 animate-spin" />
              ) : (
                <LocateIcon className="h-5 w-5" />
              )}
              Find My Location
            </Button>
          </div>
        </div>

        {/* Map style controls */}
        <div className="flex justify-center">
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
              <MoonIcon className="h-5 w-5" />
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
              <SunIcon className="h-5 w-5" />
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
              <SatelliteIcon className="h-5 w-5" />
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
              <MapIcon className="h-5 w-5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </motion.div>
    </div>
  );
};
