
import { useState } from 'react';
import { Filter, Grid, List, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface MapControlsProps {
  onViewChange: (view: 'list' | 'grid') => void;
  onToggleFilters: () => void;
  onLocationSearch: (location: string) => void;
  currentView: 'list' | 'grid';
}

export const MapControls = ({
  onViewChange,
  onToggleFilters,
  onLocationSearch,
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
  
  return (
    <motion.div 
      className="absolute top-4 left-4 right-4 z-10 flex items-center gap-2"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 relative">
        <Input
          type="text"
          placeholder="Search location..."
          className="w-full pl-10 bg-background/80 backdrop-blur-xl border-border/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-xl rounded-md border border-border/50 p-1">
        <Button
          variant="ghost"
          size="icon"
          className={currentView === 'list' ? 'bg-muted' : ''}
          onClick={() => onViewChange('list')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={currentView === 'grid' ? 'bg-muted' : ''}
          onClick={() => onViewChange('grid')}
        >
          <Grid className="h-4 w-4" />
        </Button>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onToggleFilters} 
        className="bg-background/80 backdrop-blur-xl border border-border/50"
      >
        <Filter className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="bg-background/80 backdrop-blur-xl border border-border/50"
        onClick={() => setSearchTerm('')}
      >
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
};
