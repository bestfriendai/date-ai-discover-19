
import { useState } from 'react';
import { Filter, Grid, List, MapPin, Search, X, Calendar as CalendarIcon, Moon, Sun, Satellite } from 'lucide-react';
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


// Define Filter state structure
export interface EventFilters {
  dateRange?: DateRange;
  categories?: string[];
  // Add other filters like price, distance later
}

interface MapControlsProps {
  onViewChange: (view: 'list' | 'grid') => void;
  // onToggleFilters: () => void; // Replaced by Popover
  onLocationSearch: (location: string) => void;
  onSearchClear?: () => void;
  currentView: 'list' | 'grid';
  filters: EventFilters;
  onFiltersChange: (newFilters: Partial<EventFilters>) => void;
  currentMapStyle: string; // Add current style prop
  onMapStyleChange: (styleUrl: string) => void; // Add style change handler prop
}

export const MapControls = ({
  onViewChange,
  // onToggleFilters,
  onLocationSearch,
  onSearchClear,
  currentView,
  filters,
  onFiltersChange,
  currentMapStyle, // Destructure style props
  onMapStyleChange // Destructure style props
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
    onSearchClear?.(); // Call the new prop function if provided
  };

  return (
    <motion.div
      className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-2" // Added flex-wrap for smaller screens
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 relative">
        <Input
          type="text"
          placeholder="Search location or address..." // More specific placeholder
          className="w-full pl-10 pr-20 bg-background/80 backdrop-blur-xl border-border/50 rounded-full h-10" // Added pr padding, explicit height
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full" // Added rounded-full
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
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
      </div>

      {/* Group View Toggle and Filters */}
      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-xl rounded-full border border-border/50 p-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full ${currentView === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => onViewChange('list')}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full ${currentView === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => onViewChange('grid')}
          aria-label="Grid view"
        >
          <Grid className="h-4 w-4" />
        </Button>
         {/* Separator */}
         <div className="h-4 w-px bg-border mx-1"></div>
         {/* Filter Popover */}
         {/* Style Toggle Buttons */}
         <div className="flex items-center gap-1">
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

         {/* Separator */}
         <div className="h-4 w-px bg-border mx-1"></div>

         {/* Filter Popover */}
         <Popover>
           <PopoverTrigger asChild>
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full relative"
               aria-label="Filters"
             >
               <Filter className="h-4 w-4" />
               {/* Optional: Add a badge if filters are active */}
               {(filters.dateRange?.from || filters.categories?.length) && (
                 <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
               )}
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-auto p-4" align="end">
             <div className="grid gap-4">
               <div className="space-y-2">
                 <h4 className="font-medium leading-none">Filters</h4>
                 <p className="text-sm text-muted-foreground">
                   Refine events by date and category.
                 </p>
               </div>
               <div className="grid gap-2">
                 {/* Date Range Picker */}
                 <div className="grid gap-2">
                   <Label htmlFor="date-range">Date Range</Label>
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button
                         id="date-range"
                         variant={"outline"}
                         className={cn(
                           "w-[260px] justify-start text-left font-normal",
                           !filters.dateRange && "text-muted-foreground"
                         )}
                       >
                         <CalendarIcon className="mr-2 h-4 w-4" />
                         {filters.dateRange?.from ? (
                           filters.dateRange.to ? (
                             <>
                               {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                               {format(filters.dateRange.to, "LLL dd, y")}
                             </>
                           ) : (
                             format(filters.dateRange.from, "LLL dd, y")
                           )
                         ) : (
                           <span>Pick a date range</span>
                         )}
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start">
                       <Calendar
                         initialFocus
                         mode="range"
                         defaultMonth={filters.dateRange?.from}
                         selected={filters.dateRange}
                         onSelect={(range) => onFiltersChange({ dateRange: range })}
                         numberOfMonths={2}
                       />
                     </PopoverContent>
                   </Popover>
                 </div>
                 {/* Category Filters */}
                 <div className="grid gap-2 mt-4">
                   <Label>Categories</Label>
                   <div className="grid grid-cols-2 gap-2">
                     {['music', 'sports', 'arts', 'family', 'food', 'theatre'].map((category) => (
                       <div key={category} className="flex items-center space-x-2">
                         <Checkbox
                           id={`category-${category}`}
                           checked={filters.categories?.includes(category)}
                           onCheckedChange={(checked) => {
                             const currentCategories = filters.categories || [];
                             let newCategories: string[];
                             if (checked) {
                               newCategories = [...currentCategories, category];
                             } else {
                               newCategories = currentCategories.filter(c => c !== category);
                             }
                             onFiltersChange({ categories: newCategories.length > 0 ? newCategories : undefined }); // Set to undefined if empty
                           }}
                         />
                         <label
                           htmlFor={`category-${category}`}
                           className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize" // Capitalize label
                         >
                           {category}
                         </label>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
                {/* Clear Filters Button */}
                {(filters.dateRange?.from || filters.categories?.length) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFiltersChange({ dateRange: undefined, categories: undefined })}
                    >
                        Clear Filters
                    </Button>
                )}
             </div>
           </PopoverContent>
         </Popover>
      </div>
    </motion.div>
  );
};
