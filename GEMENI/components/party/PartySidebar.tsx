
import React, { useState, useEffect } from 'react';
import { Event } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  SearchIcon, 
  ChevronLeftIcon, 
  SlidersHorizontal, 
  MapPinIcon,
  XIcon,
  CalendarIcon,
  SparklesIcon,
  MusicIcon
} from '@/lib/icons';
import PartyEventCard from './PartyEventCard';
import PartySubcategoryBadge from './PartySubcategoryBadge';
import { PartySubcategory } from '@/utils/eventNormalizers';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' ||
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.venue && event.venue.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSubcategory = selectedSubcategories.length === 0 ||
      (event.partySubcategory && selectedSubcategories.includes(event.partySubcategory));

    return matchesSearch && matchesSubcategory;
  });

  const subcategories = Array.from(new Set(
    events
      .filter(event => event.partySubcategory)
      .map(event => event.partySubcategory as PartySubcategory)
  ));

  const toggleSubcategory = (subcategory: PartySubcategory) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategory)
        ? prev.filter(sc => sc !== subcategory)
        : [...prev, subcategory]
    );
  };

  const [sortBy, setSortBy] = useState<'date' | 'popularity'>('date');

  const sortEvents = (events: Event[]) => {
    if (sortBy === 'date') {
      return [...events].sort((a, b) => {
        const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
        const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
        return dateA.getTime() - dateB.getTime();
      });
    } else {
      return [...events].sort((a, b) => {
        const scoreA = (a.image ? 2 : 0) + (a.price ? 1 : 0) + (a.partySubcategory === 'club' ? 2 : 0);
        const scoreB = (b.image ? 2 : 0) + (b.price ? 1 : 0) + (b.partySubcategory === 'club' ? 2 : 0);
        return scoreB - scoreA;
      });
    }
  };

  const sortedEvents = sortEvents(filteredEvents);

  const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3
      }
    })
  };

  return (
    <aside className="h-full flex flex-col bg-gradient-to-b from-black/90 to-purple-950/90 backdrop-blur-xl border-r border-purple-900/30 shadow-lg rounded-r-xl">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-purple-900/30 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2 text-purple-400" />
              Party Finder
            </h2>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="ml-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-xs font-medium flex items-center"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="h-3 w-3 mr-1 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Loading
                </span>
              ) : (
                <span>{filteredEvents.length} Parties</span>
              )}
            </motion.div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-purple-900/30 focus:outline-none transition-colors"
            aria-label="Close sidebar"
          >
            <XIcon className="h-5 w-5 text-gray-300" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search party events..."
              className="pl-10 pr-10 bg-black/50 border-purple-900/50 text-white placeholder:text-gray-400 focus-visible:ring-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setSearchTerm('')}
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Sort by:</span>
              <div className="flex rounded-md overflow-hidden border border-purple-900/50">
                <button
                  className={`px-2 py-1 text-xs font-medium transition-colors ${sortBy === 'date' ? 'bg-purple-600 text-white' : 'bg-black/30 text-gray-300 hover:bg-purple-900/30'}`}
                  onClick={() => setSortBy('date')}
                >
                  <CalendarIcon className="h-3 w-3 inline mr-1" /> Date
                </button>
                <button
                  className={`px-2 py-1 text-xs font-medium transition-colors ${sortBy === 'popularity' ? 'bg-purple-600 text-white' : 'bg-black/30 text-gray-300 hover:bg-purple-900/30'}`}
                  onClick={() => setSortBy('popularity')}
                >
                  <SparklesIcon className="h-3 w-3 inline mr-1" /> Popular
                </button>
              </div>
            </div>

            {(selectedSubcategories.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSubcategories([])}
                className="text-xs h-7 px-2 text-purple-300 hover:text-purple-100 hover:bg-purple-900/30"
              >
                <XIcon className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-8 bg-black/30 border border-purple-900/30">
              <TabsTrigger value="all" className="text-xs h-6">All Types</TabsTrigger>
              <TabsTrigger value="day" className="text-xs h-6">Day Events</TabsTrigger>
              <TabsTrigger value="night" className="text-xs h-6">Night Events</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-2">
              <div className="flex flex-wrap gap-2">
                {[
                  'club' as PartySubcategory,
                  'day-party' as PartySubcategory,
                  'celebration' as PartySubcategory,
                  'networking' as PartySubcategory,
                  'brunch' as PartySubcategory,
                  'social' as PartySubcategory
                ].map(subcategory => (
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
            </TabsContent>

            <TabsContent value="day" className="mt-2">
              <div className="flex flex-wrap gap-2">
                {[
                  'day-party' as PartySubcategory,
                  'brunch' as PartySubcategory,
                  'networking' as PartySubcategory
                ].map(subcategory => (
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
            </TabsContent>

            <TabsContent value="night" className="mt-2">
              <div className="flex flex-wrap gap-2">
                {[
                  'club' as PartySubcategory,
                  'celebration' as PartySubcategory,
                  'social' as PartySubcategory
                ].map(subcategory => (
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="flex gap-3 bg-black/30 p-3 rounded-xl border border-purple-900/20"
              >
                <Skeleton className="h-24 w-24 rounded-lg bg-gradient-to-br from-purple-900/30 to-black/30" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-5/6 bg-gradient-to-r from-purple-900/30 to-black/30 rounded-md" />
                  <Skeleton className="h-3 w-4/6 bg-gradient-to-r from-purple-900/20 to-black/20 rounded-md" />
                  <Skeleton className="h-3 w-2/6 bg-gradient-to-r from-purple-900/20 to-black/20 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-full bg-gradient-to-r from-purple-900/30 to-black/30" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : sortedEvents.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-1"
          >
            {sortedEvents.map((event, index) => (
              <motion.div
                key={event.id}
                custom={index}
                variants={listItemVariants}
              >
                <PartyEventCard
                  event={event}
                  onClick={() => onEventSelect(event)}
                  isSelected={selectedEvent?.id === event.id}
                />
              </motion.div>
            ))}

            <div className="text-center py-4 text-xs text-gray-500">
              {sortedEvents.length} parties found • End of results
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full text-center p-6"
          >
            <div className="relative mb-6">
              <MusicIcon className="h-16 w-16 text-purple-500/50" />
              <motion.div
                className="absolute inset-0"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <MusicIcon className="h-16 w-16 text-purple-500/20" />
              </motion.div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">No parties found</h3>
            <p className="text-gray-400 mb-4 max-w-xs">
              {searchTerm || selectedSubcategories.length > 0 ?
                "Try adjusting your filters or search for different party events" :
                "Try searching for parties in this area or adjust the map location"}
            </p>

            {(searchTerm || selectedSubcategories.length > 0) && (
              <Button
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-900/30 transition-colors"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSubcategories([]);
                }}
              >
                <XIcon className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </aside>
  );
};

export default PartySidebar;
