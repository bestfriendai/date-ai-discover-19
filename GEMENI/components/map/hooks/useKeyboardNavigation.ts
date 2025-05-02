import { useEffect, useState, useCallback } from 'react';
import type { Event } from '@/types';

interface UseKeyboardNavigationProps {
  events: Event[];
  selectedEventId: string | null;
  onSelectEvent: (event: Event | null) => void;
  isEnabled?: boolean;
}

export const useKeyboardNavigation = ({
  events,
  selectedEventId,
  onSelectEvent,
  isEnabled = true
}: UseKeyboardNavigationProps) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Find the index of the currently selected event
  useEffect(() => {
    if (!selectedEventId || events.length === 0) {
      setFocusedIndex(-1);
      return;
    }

    const index = events.findIndex(event => String(event.id) === String(selectedEventId));
    if (index !== -1) {
      setFocusedIndex(index);
    }
  }, [selectedEventId, events]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEnabled || events.length === 0) return;

    // Only handle navigation keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Enter', 'Tab'].includes(e.key)) {
      return;
    }

    // If Escape is pressed, clear selection
    if (e.key === 'Escape') {
      onSelectEvent(null);
      setFocusedIndex(-1);
      return;
    }

    // If no event is focused yet, focus the first one on any arrow key
    if (focusedIndex === -1 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      setFocusedIndex(0);
      onSelectEvent(events[0]);
      e.preventDefault(); // Prevent scrolling
      return;
    }

    let newIndex = focusedIndex;

    // Navigate through events
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = Math.max(0, focusedIndex - 1);
        e.preventDefault(); // Prevent scrolling
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = Math.min(events.length - 1, focusedIndex + 1);
        e.preventDefault(); // Prevent scrolling
        break;
      case 'Tab':
        // Tab without shift moves forward, with shift moves backward
        if (e.shiftKey) {
          newIndex = Math.max(0, focusedIndex - 1);
        } else {
          newIndex = Math.min(events.length - 1, focusedIndex + 1);
        }
        e.preventDefault(); // Prevent default tab behavior
        break;
    }

    // If the index changed, update the focused event
    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      onSelectEvent(events[newIndex]);
    }
  }, [events, focusedIndex, onSelectEvent, isEnabled]);

  // Add and remove event listener
  useEffect(() => {
    if (isEnabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, isEnabled]);

  return {
    focusedIndex,
    setFocusedIndex
  };
};
