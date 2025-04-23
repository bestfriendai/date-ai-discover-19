import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2Icon, PlusIcon } from '@/lib/icons';

interface LoadMoreButtonProps {
  isLoading: boolean;
  hasMore: boolean;
  totalEvents: number;
  loadedEvents: number;
  onLoadMore: () => void;
}

export const LoadMoreButton = ({
  isLoading,
  hasMore,
  totalEvents,
  loadedEvents,
  onLoadMore
}: LoadMoreButtonProps) => {
  if (!hasMore) return null;

  return (
    <div className="absolute bottom-24 left-0 right-0 flex justify-center z-30">
      <Button
        onClick={onLoadMore}
        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg text-sm sm:text-base px-3 py-2 h-auto transition-all hover:scale-105"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <PlusIcon className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Load More Events</span>
            <span className="sm:hidden">Load More</span>
            <span className="ml-1">({loadedEvents}/{totalEvents})</span>
          </>
        )}
      </Button>
    </div>
  );
};
