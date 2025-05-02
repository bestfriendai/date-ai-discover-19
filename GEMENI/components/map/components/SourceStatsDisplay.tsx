import React from 'react';
import { motion } from 'framer-motion';

interface SourceStats {
  count: number;
  error: string | null;
}

interface SourceStatsDisplayProps {
  stats: {
    ticketmaster?: SourceStats;
    eventbrite?: SourceStats;
    serpapi?: SourceStats;
    predicthq?: SourceStats;
  } | null;
  className?: string;
}

export const SourceStatsDisplay: React.FC<SourceStatsDisplayProps> = ({ stats, className }) => {
  if (!stats) return null;
  
  const sourceNames = Object.keys(stats) as Array<keyof typeof stats>;
  
  if (sourceNames.length === 0 || sourceNames.every(name => !stats[name]?.count && !stats[name]?.error)) {
    return null; // Don't show if no stats
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`absolute top-4 left-4 z-40 bg-background/80 backdrop-blur rounded-lg shadow-lg border border-border/50 p-3 text-xs space-y-1 ${className}`}
    >
      <div className="font-semibold mb-1">Event Sources</div>
      {sourceNames.map(name => {
        const sourceStats = stats[name];
        if (!sourceStats || (!sourceStats.count && !sourceStats.error)) return null; // Skip if no data

        return (
          <div key={name} className="flex items-center gap-2">
            <span className="capitalize">{name}:</span>
            {sourceStats.error ? (
              <span className="text-destructive" title={sourceStats.error}>Error</span>
            ) : (
              <span className="font-medium text-primary">{sourceStats.count} events</span>
            )}
          </div>
        );
      })}
    </motion.div>
  );
};
