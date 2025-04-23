
import React from 'react';
import { Mountain } from 'lucide-react/dist/esm/icons/mountain';
import { MountainSnow } from 'lucide-react/dist/esm/icons/mountain-snow';
import mapboxgl from 'mapbox-gl';

interface TerrainToggleProps {
  map: mapboxgl.Map | null;
  enabled: boolean;
  onToggle: () => void;
  className?: string;
}

const TerrainToggle: React.FC<TerrainToggleProps> = ({ 
  map, 
  enabled, 
  onToggle,
  className = ""
}) => {
  return (
    <button
      onClick={onToggle}
      className={`
        bg-background/80 backdrop-blur-md p-2.5
        rounded-full shadow-lg border border-border/50
        hover:bg-background/90 hover:scale-110
        transition-all duration-200 ease-in-out
        ${enabled ? 'ring-2 ring-primary/50' : ''}
        ${className}
      `}
      title={enabled ? "Disable 3D terrain" : "Enable 3D terrain"}
      disabled={!map}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {enabled ? (
          <MountainSnow className="h-5 w-5 text-primary animate-pulse" />
        ) : (
          <Mountain className="h-5 w-5" />
        )}
      </div>
    </button>
  );
};

export default TerrainToggle;
