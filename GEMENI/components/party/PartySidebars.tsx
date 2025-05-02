import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PartySidebar from './PartySidebar';
import EventDetail from '@/components/events/EventDetail';
import type { Event } from '@/types';

interface PartySidebarsProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedEvent: Event | null;
  events: Event[];
  isLoading: boolean;
  onLeftSidebarClose: () => void;
  onRightSidebarClose: () => void;
  onEventSelect: (event: Event | null) => void;
}

export const PartySidebars = ({
  leftSidebarOpen,
  rightSidebarOpen,
  selectedEvent,
  events,
  isLoading,
  onLeftSidebarClose,
  onRightSidebarClose,
  onEventSelect,
}: PartySidebarsProps) => {
  return (
    <>
      <AnimatePresence mode="wait">
        {leftSidebarOpen && (
          <motion.div
            initial={{ x: -380 }}
            animate={{ x: 0 }}
            exit={{ x: -380 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="w-full max-w-[380px] sm:w-[380px] relative z-20 overflow-y-auto h-full fixed sm:static left-0 top-0 sm:relative"
            style={{ height: '100%', maxHeight: 'calc(100vh - 64px)' }}
          >
            <PartySidebar
              onClose={onLeftSidebarClose}
              onEventSelect={onEventSelect}
              isLoading={isLoading}
              events={events}
              selectedEvent={selectedEvent}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {rightSidebarOpen && selectedEvent && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="w-full max-w-[400px] sm:w-[400px] bg-card/50 backdrop-blur-xl border-l border-border/50 relative z-20 overflow-y-auto h-full fixed sm:static right-0 top-0 sm:relative"
            style={{ height: '100%', maxHeight: 'calc(100vh - 64px)' }}
          >
            <EventDetail
              event={selectedEvent}
              onClose={onRightSidebarClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
