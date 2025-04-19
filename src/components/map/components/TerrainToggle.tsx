
import React from 'react';
import { Mountain, MountainSnow } from 'lucide-react';
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
      className={`bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-border/50 hover:bg-background/90 transition-colors ${className}`}
      title={enabled ? "Disable 3D terrain" : "Enable 3D terrain"}
      disabled={!map}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {enabled ? (
          <MountainSnow className="h-5 w-5" />
        ) : (
          <Mountain className="h-5 w-5" />
        )}
      </div>
    </button>
  );
};

export default TerrainToggle;
