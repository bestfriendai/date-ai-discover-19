import { useState, useCallback } from 'react';
import type { Event } from '@/types';

export const useMapState = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [mapHasMoved, setMapHasMoved] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleEventSelect = useCallback((event: Event | null) => {
    setSelectedEvent(event);
    if (event) setRightSidebarOpen(true);
  }, []);

  return {
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    selectedEvent,
    setSelectedEvent,
    showSearch,
    setShowSearch,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    mapHasMoved,
    setMapHasMoved,
    mapLoaded,
    setMapLoaded,
    handleEventSelect
  };
};
