import { useState, useEffect, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchFunction: (params: any) => Promise<{ events: T[], totalEvents?: number }>;
  initialParams: any;
  pageSize?: number;
}

const useInfiniteScroll = <T,>({
  fetchFunction,
  initialParams,
  pageSize = 20
}: UseInfiniteScrollOptions<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalEvents, setTotalEvents] = useState<number | undefined>(undefined);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        ...initialParams,
        limit: pageSize,
        page: page
      };
      const result = await fetchFunction(params);

      if (result.events.length === 0) {
        setHasMore(false);
      } else {
        setData(prevData => [...prevData, ...result.events]);
        setPage(prevPage => prevPage + 1);
        if (result.totalEvents !== undefined) {
          setTotalEvents(result.totalEvents);
        }
      }
    } catch (err: any) {
      console.error('Error loading more data:', err);
      setError(err);
      setHasMore(false); // Stop loading more on error
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, initialParams, page, pageSize, loading, hasMore]);

  // Initial load
  useEffect(() => {
    setData([]); // Clear data on initial params change
    setPage(1);
    setHasMore(true);
    setTotalEvents(undefined);
    loadMore();
  }, [fetchFunction, initialParams]); // Re-run on fetch function or initial params change

  return {
    data,
    loading,
    error,
    hasMore,
    totalEvents,
    loadMore
  };
};

export default useInfiniteScroll;