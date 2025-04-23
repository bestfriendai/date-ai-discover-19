import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, MapPin, Filter, Music, Users, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

// Party-specific categories with icons
const partyTypes = [
  { id: 'club', label: 'Club Events', icon: <Music className="h-3.5 w-3.5" /> },
  { id: 'day-party', label: 'Day Parties', icon: <span className="text-sm">☀️</span> },
  { id: 'celebration', label: 'Celebrations', icon: <span className="text-sm">🎉</span> },
  { id: 'networking', label: 'Networking Events', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'brunch', label: 'Brunch Parties', icon: <span className="text-sm">🍳</span> },
  { id: 'social', label: 'Social Gatherings', icon: <span className="text-sm">👥</span> }
];

// Popular search terms
const popularSearches = [
  { term: 'DJ Night', icon: '🎧' },
  { term: 'Rooftop Party', icon: '🏙️' },
  { term: 'Live Music', icon: '🎸' },
  { term: 'Dance Party', icon: '💃' },
  { term: 'Happy Hour', icon: '🍹' },
  { term: 'Singles Mixer', icon: '❤️' }
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

  // Add a function to apply popular search term
  const applyPopularSearch = (term: string) => {
    setFilters(prev => ({
      ...prev,
      keyword: term
    }));

    // Auto-search after selecting a popular term
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden"
    >
      <div className="p-4 flex flex-col space-y-4">
        {/* Main search bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="DJs, clubs, rooftop parties, celebrations..."
              value={filters.keyword}
              onChange={(e) => handleInputChange('keyword', e.target.value)}
              className="pl-9 bg-background/50 border-white/20 focus:border-purple-500/50 transition-colors"
            />
            {filters.keyword && (
              <button
                onClick={() => handleInputChange('keyword', '')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={`transition-colors ${showFilters ? 'bg-purple-500/20 border-purple-500/50 text-purple-500' : 'hover:border-purple-500/30 hover:text-purple-500'}`}
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {loading ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div> : <Sparkles className="h-4 w-4 mr-2" />}
            Find Hot Parties
          </Button>
        </div>

        {/* Popular searches */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center">
            <span className="mr-1">Popular:</span>
          </span>
          {popularSearches.map((search) => (
            <Badge
              key={search.term}
              variant="outline"
              className="cursor-pointer hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors"
              onClick={() => applyPopularSearch(search.term)}
            >
              <span className="mr-1">{search.icon}</span> {search.term}
            </Badge>
          ))}
        </div>

        {/* Advanced filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-3 border-t border-border">
                <Tabs defaultValue="types" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-2">
                    <TabsTrigger value="types">Party Types</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    <TabsTrigger value="date">Date & Distance</TabsTrigger>
                  </TabsList>

                  <TabsContent value="types" className="mt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {partyTypes.map((partyType) => (
                        <div
                          key={partyType.id}
                          className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${filters.partyTypes.includes(partyType.id) ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => togglePartyType(partyType.id)}
                        >
                          <div className="flex items-center justify-center w-6 h-6">
                            {partyType.icon}
                          </div>
                          <span className="text-sm font-medium">{partyType.label}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="location" className="mt-0">
                    <div className="space-y-3">
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
                      <p className="text-xs text-muted-foreground">Enter a city, address, or leave blank to use your current location</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="date" className="mt-0">
                    <div className="space-y-4">
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
                          className="py-2"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PartySearch;
