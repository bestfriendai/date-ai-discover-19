import React from 'react';

interface SourceStatsDisplayProps {
  stats: Record<string, number>;
}

export const SourceStatsDisplay: React.FC<SourceStatsDisplayProps> = ({ stats }) => {
  // Calculate total events
  const totalEvents = Object.values(stats).reduce((sum, count) => sum + count, 0);
  
  // Skip rendering if no events
  if (totalEvents === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-10 bg-gray-900 p-2 rounded-lg text-xs opacity-70 hover:opacity-100 transition-opacity">
      <div className="font-semibold mb-1">Event Sources:</div>
      <div className="space-y-1">
        {Object.entries(stats).map(([source, count]) => (
          <div key={source} className="flex justify-between">
            <span className="capitalize mr-2">{source}:</span>
            <span>{count} ({Math.round((count / totalEvents) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};
