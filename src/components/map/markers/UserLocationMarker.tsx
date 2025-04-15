import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface UserLocationMarkerProps {
  color?: 'blue' | 'red';
}

const UserLocationMarker = ({ color = 'blue' }: UserLocationMarkerProps) => {
  const colorClasses = {
    blue: {
      pulse: 'bg-blue-500/30',
      dot: 'bg-blue-600',
    },
    red: {
      pulse: 'bg-red-500/30',
      dot: 'bg-red-600',
    },
  };

  return (
    <div className="relative flex items-center justify-center w-8 h-8">
      {/* Pulsing outer circle */}
      <div
        className={cn(
          'absolute w-8 h-8 rounded-full animate-ping',
          colorClasses[color].pulse
        )}
      ></div>
      {/* Inner solid circle */}
      <div
        className={cn(
          'relative w-4 h-4 rounded-full border-2 border-white shadow-md',
          colorClasses[color].dot
        )}
      ></div>
    </div>
  );
};

export default UserLocationMarker;