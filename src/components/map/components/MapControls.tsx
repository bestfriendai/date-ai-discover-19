
import { useState } from 'react';
import { Filter, Grid, List, MapPin, Search, X, Calendar as CalendarIcon, Moon, Sun, Satellite, Loader2, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 max-w-2xl w-full px-2"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 relative flex items-center gap-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full px-3 py-2 shadow-lg">
        <Input
          type="text"
          placeholder="Search location or address..."
          className="w-full pl-10 pr-20 bg-transparent border-none outline-none shadow-none h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-14 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
          onClick={handleSearch}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
        {/* Clear Button */}
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-5 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {/* Find My Location Button */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 rounded-full h-8 w-8"
          onClick={onFindMyLocation}
          disabled={locationRequested}
          aria-label="Find My Location"
        >
          {locationRequested ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Map Style Toggle Buttons */}
      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-xl rounded-full border border-border/50 p-1">
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
