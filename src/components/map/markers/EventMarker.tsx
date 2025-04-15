
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EventMarkerProps {
  event: Event;
  selected?: boolean;
}

export const EventMarker = ({ event, selected }: EventMarkerProps) => {
  return (
    <motion.div 
      className="relative cursor-pointer group z-10"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shadow-lg transform-gpu transition-all duration-300",
        selected ? "bg-secondary ring-4 ring-secondary/20" : "bg-primary"
      )}>
        <div className="w-5 h-5 bg-background rounded-full" />
      </div>
      <div className={cn(
        "w-2 h-2 absolute -bottom-1 left-1/2 transform -translate-x-1/2 rotate-45 transition-colors duration-300",
        selected ? "bg-secondary" : "bg-primary"
      )} />
    </motion.div>
  );
};
