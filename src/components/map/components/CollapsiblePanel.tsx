import React, { useState } from 'react';
import { ChevronUp } from 'lucide-react/dist/esm/icons/chevron-up';
import { ChevronDown } from 'lucide-react/dist/esm/icons/chevron-down';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsiblePanelProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  position?: 'left' | 'right' | 'bottom';
}

export function CollapsiblePanel({
  title,
  icon,
  children,
  defaultOpen = false,
  className = '',
  position = 'right'
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Position styling
  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'left-4';
      case 'right':
        return 'right-4';
      case 'bottom':
        return 'bottom-24 left-1/2 -translate-x-1/2';
      default:
        return 'right-4';
    }
  };

  return (
    <div className={`absolute z-20 ${getPositionClasses()} ${className}`}>
      <div className="flex flex-col items-end">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 mb-2 px-3 py-2 bg-background/80 backdrop-blur rounded-lg shadow-lg border border-border/50 hover:bg-background/90 transition-colors"
          aria-expanded={isOpen}
          aria-controls="panel-content"
        >
          <span className="flex items-center gap-1.5">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-2" />
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="panel-content"
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="origin-top overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
