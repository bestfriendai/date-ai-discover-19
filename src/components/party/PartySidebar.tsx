import React, { useState } from 'react';
import { Event } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Filter, Music } from 'lucide-react';
import PartyEventCard from './PartyEventCard';
import PartySubcategoryBadge from './PartySubcategoryBadge';
import { PartySubcategory } from '@/utils/eventNormalizers';

interface PartySidebarProps {
  events: Event[];
  isLoading: boolean;
  onClose: () => void;
  onEventSelect: (event: Event) => void;
  selectedEvent?: Event | null;
}

const PartySidebar: React.FC<PartySidebarProps> = ({
  events,
  isLoading,
  onClose,
  onEventSelect,
  selectedEvent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<PartySubcategory[]>([]);
  
  // Filter events based on search term and selected subcategories
  const filteredEvents = events.filter(event => {
    // Search term filter
    const matchesSearch = searchTerm === '' || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.venue && event.venue.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Subcategory filter
    const matchesSubcategory = selectedSubcategories.length === 0 || 
      (event.partySubcategory && selectedSubcategories.includes(event.partySubcategory));
    
    return matchesSearch && matchesSubcategory;
  });
  
  // Get unique subcategories from events
  const subcategories = Array.from(new Set(
    events
      .filter(event => event.partySubcategory)
      .map(event => event.partySubcategory as PartySubcategory)
  ));
  
  // Toggle subcategory selection
  const toggleSubcategory = (subcategory: PartySubcategory) => {
    setSelectedSubcategories(prev => 
      prev.includes(subcategory)
        ? prev.filter(sc => sc !== subcategory)
        : [...prev, subcategory]
    );
  };
  
  return (
    <aside className="h-full flex flex-col bg-gradient-to-b from-black/90 to-purple-950/90 backdrop-blur-xl border-r border-purple-900/30 shadow-lg rounded-r-xl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-purple-900/30 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Party Events
            </h2>
            <div className="ml-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-xs font-medium">
              {isLoading ? '...' : filteredEvents.length} Events
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-purple-900/30 focus:outline-none transition"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-300" />
          </button>
        </div>
        
        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search party events..."
            className="pl-10 pr-4 py-2 bg-black/50 border-purple-900/50 text-white placeholder:text-gray-400 focus-visible:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Subcategory filters */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Filter className="h-4 w-4 mr-2 text-purple-400" />
            <span className="text-sm font-medium text-gray-200">Filter by type</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {subcategories.map(subcategory => (
              <button
                key={subcategory}
                onClick={() => toggleSubcategory(subcategory)}
                className={`transition-all duration-300 transform hover:scale-105 ${
                  selectedSubcategories.includes(subcategory) ? 'ring-2 ring-white' : ''
                }`}
              >
                <PartySubcategoryBadge subcategory={subcategory} size="sm" />
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Event list */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-3 bg-black/30 p-3 rounded-xl">
                <Skeleton className="h-24 w-24 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-5/6 bg-gray-700/50" />
                  <Skeleton className="h-3 w-4/6 bg-gray-700/50" />
                  <Skeleton className="h-3 w-2/6 bg-gray-700/50" />
                  <Skeleton className="h-6 w-20 rounded-full bg-gray-700/50" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          // Event cards
          <div>
            {filteredEvents.map(event => (
              <PartyEventCard
                key={event.id}
                event={event}
                onClick={() => onEventSelect(event)}
                isSelected={selectedEvent?.id === event.id}
              />
            ))}
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Music className="h-16 w-16 text-purple-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No parties found</h3>
            <p className="text-gray-400 mb-4">
              Try adjusting your filters or search for different party events
            </p>
            {(searchTerm || selectedSubcategories.length > 0) && (
              <Button
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-900/30"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSubcategories([]);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default PartySidebar;
