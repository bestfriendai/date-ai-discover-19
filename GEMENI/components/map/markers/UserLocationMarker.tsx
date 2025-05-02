import React from 'react';
import { cn } from '@/lib/utils';

interface UserLocationMarkerProps {
  color?: 'blue' | 'red';
}

const UserLocationMarker = ({ color = 'blue' }: UserLocationMarkerProps) => {
  const colorClasses = {
    blue: {
      pulse: 'bg-blue-500/30',
      dot: 'bg-blue-600',
      ring: 'border-blue-400',
      shadow: 'shadow-blue-500/50'
    },
    red: {
      pulse: 'bg-red-500/30',
      dot: 'bg-red-600',
      ring: 'border-red-400',
      shadow: 'shadow-red-500/50'
    },
  };

  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      {/* Outer slow pulse */}
      <div
        className={cn(
          'absolute w-10 h-10 rounded-full animate-ping opacity-30',
          colorClasses[color].pulse
        )}
        style={{ animationDuration: '3s' }}
      ></div>

      {/* Middle pulse */}
      <div
        className={cn(
          'absolute w-8 h-8 rounded-full animate-ping opacity-50',
          colorClasses[color].pulse
        )}
        style={{ animationDuration: '2s' }}
      ></div>

      {/* Inner ring */}
      <div
        className={cn(
          'absolute w-6 h-6 rounded-full border-2',
          colorClasses[color].ring
        )}
      ></div>

      {/* Center dot */}
      <div
        className={cn(
          'relative w-4 h-4 rounded-full border-2 border-white shadow-lg',
          colorClasses[color].dot,
          colorClasses[color].shadow
        )}
      ></div>

      {/* Position indicator */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium border border-border/50 shadow-sm">
        {color === 'blue' ? 'You' : 'Default'}
      </div>
    </div>
  );
};

export default UserLocationMarker;