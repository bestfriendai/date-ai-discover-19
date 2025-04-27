import { useState, useCallback } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import type { Event } from '@/types';
import { Button } from "@/components/ui/button";
import { 
  PartyPopper, 
  Music, 
  Palette, 
  Trophy, 
  Users, 
  Utensils, 
  Calendar 
} from '@/lib/icons';

interface EventsSidebarProps {
  onClose: () => void;
  onEventSelect?: (event: Event) => void;
  isLoading?: boolean;
  events: Event[];
}

const EventsSidebar = ({ onClose, onEventSelect, isLoading, events }: EventsSidebarProps) => {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | null>(null);

  const filteredEvents = useCallback(() => {
    if (isLoading) return [];

    let filtered = [...events];

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event =>
        selectedCategories.includes(event.category?.toLowerCase() || 'other')
      );
    }

    if (dateFilter) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (dateFilter === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (dateFilter === 'week') {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59);
      } else { // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      filtered = filtered.filter(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    return filtered;
  }, [events, selectedCategories, dateFilter, isLoading]);

  const displayEvents = filteredEvents();
  const skeletonCount = 5;

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleDateFilter = (filter: 'today' | 'week' | 'month') => {
    setDateFilter(prev => prev === filter ? null : filter);
  };

  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'music': return <Music className="h-4 w-4" />;
      case 'arts': return <Palette className="h-4 w-4" />;
      case 'sports': return <Trophy className="h-4 w-4" />;
      case 'family': return <Users className="h-4 w-4" />;
      case 'food': return <Utensils className="h-4 w-4" />;
      case 'party': return <PartyPopper className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const formatPartySubcategory = (subcategory: string): string => {
    switch(subcategory) {
      case 'day-party': return 'Day Party';
      case 'brunch': return 'Brunch';
      case 'club': return 'Club';
      case 'networking': return 'Networking';
      case 'celebration': return 'Celebration';
      case 'social': return 'Social';
      default: return subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
    }
  };

  return (
    <aside
      className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] shadow-lg rounded-r-xl"
      role="complementary"
      aria-label="Events Sidebar"
      tabIndex={0}
    >
      <div className="sticky top-0 z-10 bg-[hsl(var(--sidebar-background))]/95 backdrop-blur-md border-b border-[hsl(var(--sidebar-border))] p-4 transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Events</h2>
            <div className="ml-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-xs font-medium">
              {isLoading ? '...' : displayEvents.length} Events
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[hsl(var(--sidebar-accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))] transition"
            aria-label="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              id="event-search"
              type="text"
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))]/50 text-[hsl(var(--sidebar-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))] transition placeholder:text-[hsl(var(--muted-foreground))]"
              aria-label="Search events"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-2 mb-2 bg-background/30 hover:bg-background/50 rounded-lg transition-all"
        >
          <span className="font-medium">Filters</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {showFilters && (
          <div className="space-y-3 mb-4 animate-in fade-in duration-200">
            <div className="p-4 border-b border-[hsl(var(--sidebar-border))]">
              <h3 className="font-medium mb-3 text-sm">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'music', color: 'bg-indigo-600 hover:bg-indigo-700' },
                  { name: 'arts', color: 'bg-pink-600 hover:bg-pink-700' },
                  { name: 'sports', color: 'bg-emerald-600 hover:bg-emerald-700' },
                  { name: 'family', color: 'bg-amber-600 hover:bg-amber-700' },
                  { name: 'food', color: 'bg-orange-600 hover:bg-orange-700' },
                  { name: 'party', color: 'bg-violet-600 hover:bg-violet-700' },
                ].map(category => (
                  <Button
                    key={category.name}
                    variant="outline"
                    size="sm"
                    className={`rounded-full px-3 py-1 transition-all ${selectedCategories.includes(category.name)
                      ? `${category.color} text-white border-transparent`
                      : 'bg-background/40 hover:bg-background/60 border-border/50'}`}
                    onClick={() => toggleCategory(category.name)}
                  >
                    {getCategoryIcon(category.name)}
                    <span className="ml-1 capitalize">{category.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Date Range</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={dateFilter === 'today' ? "default" : "outline"}
                  className={dateFilter === 'today' ? 'bg-blue-600 text-white' : ''}
                  onClick={() => toggleDateFilter('today')}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'week' ? "default" : "outline"}
                  className={dateFilter === 'week' ? 'bg-blue-600 text-white' : ''}
                  onClick={() => toggleDateFilter('week')}
                >
                  This Week
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'month' ? "default" : "outline"}
                  className={dateFilter === 'month' ? 'bg-blue-600 text-white' : ''}
                  onClick={() => toggleDateFilter('month')}
                >
                  This Month
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded ${view === 'list'
                ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]'
                : 'hover:bg-[hsl(var(--sidebar-accent))]/50 text-[hsl(var(--sidebar-foreground))]'
              } focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]}`}
              aria-label="List view"
              aria-pressed={view === 'list'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded ${view === 'grid'
                ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]'
                : 'hover:bg-[hsl(var(--sidebar-accent))]/50 text-[hsl(var(--sidebar-foreground))]'
              } focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]}`}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
          {displayEvents.length > 0 && (
            <span className="text-xs text-[hsl(var(--sidebar-foreground))]/60">
              Showing {displayEvents.length} of {events.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="h-16 w-20 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                  <Skeleton className="h-3 w-2/6" />
                </div>
              </div>
            ))}
          </div>
        ) : displayEvents.length > 0 ? (
          <div className={`p-4 ${view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}`}>
            {displayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventSelect?.(event)}
                className={`group cursor-pointer transition ${view === 'grid'
                  ? 'bg-[hsl(var(--sidebar-accent))]/50 hover:bg-[hsl(var(--sidebar-accent))]/80 rounded-lg p-3 border border-[hsl(var(--sidebar-border))]/80'
                  : 'hover:bg-[hsl(var(--sidebar-accent))]/50 rounded-lg p-3'
                }`}
              >
                {view === 'grid' ? (
                  <div className="space-y-2">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
                      <img
                        src={event.image || '/placeholder.jpg'}
                        alt={event.title}
                        className="object-cover w-full h-full transition-all"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.jpg';
                        }}
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        <div className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded">
                          {event.category?.charAt(0).toUpperCase() + event.category?.slice(1) || 'Event'}
                        </div>
                        {event.category === 'party' && event.partySubcategory && (
                          <div className="bg-purple-600 text-white text-xs font-medium px-2 py-0.5 rounded">
                            {formatPartySubcategory(event.partySubcategory)}
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold line-clamp-1 text-[hsl(var(--sidebar-primary))]">{event.title}</h3>
                    <div className="flex items-center text-xs text-[hsl(var(--sidebar-foreground))]/70">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      {event.date} • {event.time || 'TBD'}
                    </div>
                    <div className="flex items-center text-xs text-[hsl(var(--sidebar-foreground))]/60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="truncate">{event.location || event.venue || 'Location TBD'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                      <img
                        src={event.image || '/placeholder.jpg'}
                        alt={event.title}
                        className="object-cover h-full w-full transition-all"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.jpg';
                        }}
                      />
                      <div className="absolute bottom-1 right-1 rounded-full w-5 h-5 flex items-center justify-center bg-background/80 backdrop-blur-sm border border-white/10">
                        {getCategoryIcon(event.category || 'other')}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-0.5 line-clamp-2 text-[hsl(var(--sidebar-primary))]">{event.title}</h3>
                      {event.description && (
                        <div className="text-xs text-[hsl(var(--sidebar-foreground))]/80 mb-1 line-clamp-2">
                          {event.description.slice(0, 100)}
                          {event.description.length > 100 ? '…' : ''}
                        </div>
                      )}
                      <div className="flex items-center text-xs text-[hsl(var(--sidebar-foreground))]/70 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        {event.date} • <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {event.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-xs bg-blue-600/10 text-blue-500 rounded px-1.5 py-0.5 mr-1 font-medium">
                          {event.category?.charAt(0).toUpperCase() + event.category?.slice(1) || 'Event'}
                        </div>
                        {event.category === 'party' && event.partySubcategory && (
                          <div className="text-xs bg-purple-100 text-purple-800 rounded px-1.5 py-0.5 mr-1 font-medium">
                            {formatPartySubcategory(event.partySubcategory)}
                          </div>
                        )}
                        {event.price && (
                          <div className="text-xs bg-gray-100/80 text-gray-800 rounded px-1 py-0.5 mr-1 font-semibold">
                            {event.price}
                          </div>
                        )}
                        <div className="flex items-center text-xs text-[hsl(var(--sidebar-foreground))]/60 ml-auto">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span className="truncate max-w-[120px]">{event.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center text-center text-[hsl(var(--sidebar-foreground))]/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>
            <span className="font-medium">No events found for the current view or filters.</span>
            <span className="text-sm mt-2 max-w-xs">Try adjusting your search criteria, changing location, or exploring a different area on the map.</span>
            <button
              className="mt-4 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              onClick={() => {
                setSelectedCategories([]);
                setDateFilter(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default EventsSidebar;
