
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatSidebar from './ChatSidebar';
import { EventDetail } from '@/components/events/EventDetail';
import { ChatMessage } from '@/services/perplexityService';
import { Event } from '@/types';

interface ChatMapSidebarsProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedEvent: Event | null;
  messages: ChatMessage[];
  isLoading: boolean;
  extractedEvents: Event[];
  onLeftSidebarClose: () => void;
  onRightSidebarClose: () => void;
  onEventSelect: (event: Event | null) => void;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
}

export const ChatMapSidebars: React.FC<ChatMapSidebarsProps> = ({
  leftSidebarOpen,
  rightSidebarOpen,
  selectedEvent,
  messages,
  isLoading,
  extractedEvents,
  onLeftSidebarClose,
  onRightSidebarClose,
  onEventSelect,
  onSendMessage,
  onClearChat
}) => {
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
            <ChatSidebar
              messages={messages}
              isLoading={isLoading}
              onClose={onLeftSidebarClose}
              onSendMessage={onSendMessage}
              onClearChat={onClearChat}
              extractedEvents={extractedEvents}
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
