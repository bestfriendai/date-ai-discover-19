import { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import type { Event } from '@/types';

// Mock data removed as it's passed via props

interface EventsSidebarProps {
  onClose: () => void;
  onEventSelect?: (event: Event) => void;
  isLoading?: boolean;
  events: Event[];
}

const EventsSidebar = ({ onClose, onEventSelect, isLoading, events }: EventsSidebarProps) => {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);

  const displayEvents = isLoading ? [] : events;
  const skeletonCount = 5;

  return (
    <aside
      // Use theme variables for background and border
      className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] shadow-lg rounded-r-xl"
      role="complementary"
      aria-label="Events Sidebar"
      tabIndex={0} // Keep tabIndex if needed for accessibility
    >
      {/* Sticky header with animated transition */}
      {/* Use theme variables for background and border */}
      <div className="sticky top-0 z-10 bg-[hsl(var(--sidebar-background))]/95 backdrop-blur-md border-b border-[hsl(var(--sidebar-border))] p-4 transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Events</h2>
            <div className="ml-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-xs font-medium">
              {isLoading ? '...' : events.length} Events
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

        {/* Search/filter input */}
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
              // Use theme variables for input styling
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))]/50 text-[hsl(var(--sidebar-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))] transition placeholder:text-[hsl(var(--muted-foreground))]"
              aria-label="Search events"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded ${view === 'list'
                ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]'
                : 'hover:bg-[hsl(var(--sidebar-accent))]/50 text-[hsl(var(--sidebar-foreground))]'
              } focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]`}
              aria-label="List view"
              aria-pressed={view === 'list'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded ${view === 'grid'
                ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]'
                : 'hover:bg-[hsl(var(--sidebar-accent))]/50 text-[hsl(var(--sidebar-foreground))]'
              } focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]`}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </button>
          </div>
          <button
            className="p-1.5 rounded-full bg-[hsl(var(--sidebar-accent))]/80 border border-[hsl(var(--sidebar-border))]/50 hover:bg-[hsl(var(--sidebar-accent))]/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]"
            aria-label="Filter events"
            tabIndex={0}
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 p-3 bg-[hsl(var(--sidebar-accent))]/30 rounded-md border border-[hsl(var(--sidebar-border))]">
            <h3 className="text-sm font-medium mb-2">Filter Events</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Categories</label>
                <div className="flex flex-wrap gap-1">
                  {['music', 'sports', 'arts', 'family', 'food'].map(category => (
                    <button
                      key={category}
                      className="text-xs px-2 py-1 rounded-full border border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-accent))]"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="text-xs p-1 rounded border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] flex-1"
                  />
                  <input
                    type="date"
                    className="text-xs p-1 rounded border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] flex-1"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button className="text-xs px-3 py-1 bg-[hsl(var(--sidebar-accent))] rounded hover:bg-[hsl(var(--sidebar-accent))]/80">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Show Skeletons while loading
          <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 p-3' : ''}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={index} className="p-4 border-b border-[hsl(var(--sidebar-border))]">
                <div className={view === 'grid' ? '' : 'flex items-start'}>
                  <Skeleton className={view === 'grid' ? 'w-full h-32 rounded-md mb-2' : 'w-16 h-16 rounded-md mr-3 flex-shrink-0'} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-4 w-24 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayEvents.length > 0 ? (
          // Show actual events when loaded
          <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 p-3' : ''}>
            {displayEvents.map(event => (
              <div
                key={event.id}
                className={`${view === 'grid'
                  ? 'p-3 border border-[hsl(var(--sidebar-border))] rounded-lg'
                  : 'p-4 border-b border-[hsl(var(--sidebar-border))]'}
                  hover:bg-[hsl(var(--sidebar-accent))]/50 cursor-pointer transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]`}
                onClick={() => onEventSelect && onEventSelect(event)}
                tabIndex={0}
                role="button"
                aria-pressed="false"
                aria-label={`View details for ${event.title}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onEventSelect && onEventSelect(event);
                  }
                }}
              >
                {view === 'grid' ? (
                  // Grid view layout
                  <div className="flex flex-col">
                    <div className="w-full h-32 rounded-md overflow-hidden bg-[hsl(var(--sidebar-accent))] mb-2">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).onerror = null;
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-sm mb-0.5 line-clamp-1 text-[hsl(var(--sidebar-primary))]">{event.title}</h3>
                    <div className="flex items-center text-xs text-[hsl(var(--sidebar-foreground))]/70 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      {event.date}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <div className={`
                        text-xs rounded px-1.5 py-0.5 capitalize font-medium mr-1
                        ${event.category?.toLowerCase() === 'music' ? 'bg-blue-500/80 text-white'
                          : event.category?.toLowerCase() === 'sports' ? 'bg-green-500/80 text-white'
                          : event.category?.toLowerCase() === 'arts' || event.category?.toLowerCase() === 'theatre' ? 'bg-pink-500/80 text-white'
                          : event.category?.toLowerCase() === 'family' ? 'bg-yellow-400/80 text-gray-900'
                          : event.category?.toLowerCase() === 'food' || event.category?.toLowerCase() === 'restaurant' ? 'bg-orange-500/80 text-white'
                          : 'bg-gray-700/80 text-white'
                        }
                      `}>
                        {event.category}
                      </div>
                      {event.price && (
                        <div className="text-xs bg-gray-100/80 text-gray-800 rounded px-1 py-0.5 mr-1 font-semibold">
                          {event.price}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // List view layout
                  <div className="flex">
                    <div className="w-16 h-16 rounded-md overflow-hidden mr-3 bg-[hsl(var(--sidebar-accent))] flex-shrink-0">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).onerror = null;
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-0.5 line-clamp-2 text-[hsl(var(--sidebar-primary))]">{event.title}</h3>
                      {/* Description snippet */}
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
                        {/* Category badge with color */}
                        <div className={`
                          text-xs rounded px-1.5 py-0.5 capitalize font-medium mr-1
                          ${event.category?.toLowerCase() === 'music' ? 'bg-blue-500/80 text-white'
                            : event.category?.toLowerCase() === 'sports' ? 'bg-green-500/80 text-white'
                            : event.category?.toLowerCase() === 'arts' || event.category?.toLowerCase() === 'theatre' ? 'bg-pink-500/80 text-white'
                            : event.category?.toLowerCase() === 'family' ? 'bg-yellow-400/80 text-gray-900'
                            : event.category?.toLowerCase() === 'food' || event.category?.toLowerCase() === 'restaurant' ? 'bg-orange-500/80 text-white'
                            : 'bg-gray-700/80 text-white'
                          }
                        `}>
                          {event.category}
                        </div>
                        {/* Price */}
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
          // Show empty state if not loading and no events
          <div className="p-8 flex flex-col items-center text-center text-[hsl(var(--sidebar-foreground))]/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>
            <span className="font-medium">No events found for the current view or filters.</span>
            <span className="text-sm mt-2 max-w-xs">Try adjusting your search criteria, changing location, or exploring a different area on the map.</span>
            <button
              className="mt-4 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              onClick={() => onClose()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Search in a different area
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default EventsSidebar;
