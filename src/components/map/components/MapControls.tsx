import { useState } from 'react';
import { Filter, Grid, List, MapPin, Search, X, Calendar as CalendarIcon, Moon, Sun, Satellite, Loader2, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventFilters as BaseEventFilters, MapStyle } from '@/types';


// Extend the base EventFilters with UI-specific properties
export interface EventFilters extends BaseEventFilters {
  showInViewOnly?: boolean;
  onShowInViewOnlyChange?: (val: boolean) => void;
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

  const handleClearSearch = () => {
    setSearchTerm('');
    // onSearchClear removed; nothing to do here
  };

  return (
    <motion.div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 max-w-2xl w-full px-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter location..."
            className="w-full pl-4 pr-20 h-12 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full shadow-lg text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-12 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="h-12 px-6 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full shadow-lg hover:bg-background/80"
          onClick={onFindMyLocation}
          disabled={locationRequested}
        >
          {locationRequested ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          Find my location
        </Button>
      </div>

      {/* Map style controls */}
      <div className="flex items-center gap-1 bg-background/90 backdrop-blur-xl rounded-full border border-border/50 p-1 shadow-lg">
        <Button
          variant={currentMapStyle.includes('dark-v11') ? "secondary" : "ghost"}
          size="icon"
          onClick={() => onMapStyleChange('mapbox://styles/mapbox/dark-v11')}
          className="h-8 w-8 rounded-full"
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
        </Button>
        <Button
          variant={currentMapStyle.includes('light-v11') ? "secondary" : "ghost"}
          size="icon"
          onClick={() => onMapStyleChange('mapbox://styles/mapbox/light-v11')}
          className="h-8 w-8 rounded-full"
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          variant={currentMapStyle.includes('satellite-streets-v12') ? "secondary" : "ghost"}
          size="icon"
          onClick={() => onMapStyleChange('mapbox://styles/mapbox/satellite-streets-v12')}
          className="h-8 w-8 rounded-full"
          aria-label="Satellite view"
        >
          <Satellite className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};
