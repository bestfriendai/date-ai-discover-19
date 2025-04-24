import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { SearchIcon, CalendarIcon, MapPinIcon, FilterIcon } from '@/lib/icons';
import { format } from 'date-fns';

// Custom hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface SearchFilters {
  keyword: string;
  location: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  categories: string[];
  priceRange: [number, number];
  radius: number;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
  initialParams?: any;
  loading?: boolean;
}

const categories = [
  { id: 'music', label: 'Music' },
  { id: 'sports', label: 'Sports' },
  { id: 'arts', label: 'Arts & Theater' },
  { id: 'family', label: 'Family' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'party', label: 'Party' },
  { id: 'community', label: 'Community' }
];

const AdvancedSearch = ({ onSearch, initialFilters, initialParams, loading = false }: AdvancedSearchProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: initialFilters?.keyword || '',
    location: initialFilters?.location || '',
    dateRange: initialFilters?.dateRange || { from: undefined, to: undefined },
    categories: initialFilters?.categories || [],
    priceRange: initialFilters?.priceRange || [0, 500],
    radius: initialFilters?.radius || 10
  });

  const [showFilters, setShowFilters] = useState(false);
  const debouncedKeyword = useDebounce(filters.keyword, 500);

  // Trigger search when debounced keyword changes
  useEffect(() => {
    if (debouncedKeyword !== undefined) {
      onSearch(filters);
    }
  }, [debouncedKeyword, filters.location, filters.dateRange, filters.categories, filters.radius]);

  // Handle input changes
  const handleInputChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setFilters(prev => {
      const categories = [...prev.categories];
      const index = categories.indexOf(categoryId);

      if (index === -1) {
        categories.push(categoryId);
      } else {
        categories.splice(index, 1);
      }

      return {
        ...prev,
        categories
      };
    });
  };

  return (
    <div className="w-full bg-card border border-border rounded-lg p-4">
      <div className="flex flex-col space-y-4">
        {/* Main search bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search events..."
              value={filters.keyword}
              onChange={(e) => handleInputChange('keyword', e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <FilterIcon className="h-4 w-4" />
          </Button>

          <Button type="submit" onClick={() => onSearch(filters)} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Location and date picker */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "MMM d")} - {format(filters.dateRange.to, "MMM d")}
                    </>
                  ) : (
                    format(filters.dateRange.from, "MMM d")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.dateRange.from,
                  to: filters.dateRange.to
                }}
                onSelect={(range) => handleInputChange('dateRange', range)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <h3 className="text-sm font-medium mb-2">Categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={filters.categories.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {category.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Distance (miles)</h3>
              <div className="px-2">
                <Slider
                  value={[filters.radius]}
                  min={1}
                  max={50}
                  step={1}
                  onValueChange={(value) => handleInputChange('radius', value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 mile</span>
                  <span>{filters.radius} miles</span>
                  <span>50 miles</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Price Range</h3>
              <div className="px-2">
                <Slider
                  value={filters.priceRange}
                  min={0}
                  max={500}
                  step={10}
                  onValueChange={(value) => handleInputChange('priceRange', value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>${filters.priceRange[0]}</span>
                  <span>${filters.priceRange[1]}+</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
