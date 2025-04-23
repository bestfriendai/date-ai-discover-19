import React, { useState } from 'react';
import { Search, X, Calendar, MapPin, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format, addDays } from 'date-fns';

interface SearchFilters {
  keyword: string;
  location: string;
  dateRange: DateRange;
  partyTypes: string[];
  radius: number;
}

interface PartySearchProps {
  onSearch: (params: any) => void;
  initialFilters?: Partial<SearchFilters>;
  initialParams?: any;
  loading?: boolean;
}

// Party-specific categories
const partyTypes = [
  { id: 'club', label: 'Club Events' },
  { id: 'day-party', label: 'Day Parties' },
  { id: 'celebration', label: 'Celebrations' },
  { id: 'networking', label: 'Networking Events' },
  { id: 'brunch', label: 'Brunch Parties' },
  { id: 'social', label: 'Social Gatherings' }
];

const PartySearch = ({ onSearch, initialFilters, initialParams, loading = false }: PartySearchProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: initialFilters?.keyword || '',
    location: initialFilters?.location || '',
    dateRange: initialFilters?.dateRange || { from: undefined, to: undefined },
    partyTypes: initialFilters?.partyTypes || [],
    radius: initialFilters?.radius || 10
  });

  const [showFilters, setShowFilters] = useState(false);

  // Handle input changes
  const handleInputChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle search submission
  const handleSearch = () => {
    // Always include 'party' category
    const searchParams = {
      ...filters,
      categories: ['party'],
      // Add party-specific keywords based on selected party types
      keyword: filters.keyword || 'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival'
    };
    
    onSearch(searchParams);
  };

  // Toggle party type selection
  const togglePartyType = (partyTypeId: string) => {
    setFilters(prev => {
      const partyTypes = [...prev.partyTypes];
      const index = partyTypes.indexOf(partyTypeId);

      if (index === -1) {
        partyTypes.push(partyTypeId);
      } else {
        partyTypes.splice(index, 1);
      }

      return {
        ...prev,
        partyTypes
      };
    });
  };

  return (
    <div className="w-full bg-card border border-border rounded-lg p-4">
      <div className="flex flex-col space-y-4">
        {/* Main search bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="DJs, clubs, rooftop parties, celebrations..."
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
            <Filter className="h-4 w-4" />
          </Button>

          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Find Hot Parties
          </Button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <h3 className="text-sm font-medium mb-2">Party Types</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {partyTypes.map((partyType) => (
                  <div key={partyType.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`partyType-${partyType.id}`}
                      checked={filters.partyTypes.includes(partyType.id)}
                      onCheckedChange={() => togglePartyType(partyType.id)}
                    />
                    <label
                      htmlFor={`partyType-${partyType.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {partyType.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Location</h3>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter location..."
                  value={filters.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Date Range</h3>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(range) => handleInputChange('dateRange', range)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Distance (miles)</h3>
                <span className="text-sm text-muted-foreground">{filters.radius} miles</span>
              </div>
              <Slider
                value={[filters.radius]}
                min={1}
                max={100}
                step={1}
                onValueChange={(value) => handleInputChange('radius', value[0])}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartySearch;
