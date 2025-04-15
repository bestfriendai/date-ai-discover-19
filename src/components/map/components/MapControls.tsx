
import { Filter, Grid, List, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-2">
      <div className="flex-1 relative">
        <Input
          type="text"
          placeholder="Search location..."
          className="w-full pl-10 bg-background/80 backdrop-blur-xl border-border/50"
          onChange={(e) => onLocationSearch(e.target.value)}
        />
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
      
      <Button variant="ghost" size="icon" onClick={onToggleFilters} className="bg-background/80 backdrop-blur-xl border border-border/50">
        <Filter className="h-4 w-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-xl border border-border/50">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
