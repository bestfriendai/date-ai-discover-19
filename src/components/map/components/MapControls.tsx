
import { useState } from 'react';
import { Filter, Grid, List, MapPin, Search, X } from 'lucide-react'; // Assuming lucide-react installed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface MapControlsProps {
  onViewChange: (view: 'list' | 'grid') => void;
  onToggleFilters: () => void;
  onLocationSearch: (location: string) => void;
  onSearchClear?: () => void; // Add prop for clearing search
  currentView: 'list' | 'grid';
}

export const MapControls = ({
  onViewChange,
  onToggleFilters,
  onLocationSearch,
  onSearchClear, // Destructure new prop
  currentView
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
         <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFilters}
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
          aria-label="Filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};
