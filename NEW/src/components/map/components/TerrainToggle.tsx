import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface TerrainToggleProps {
  map: mapboxgl.Map | null;
}

const TerrainToggle: React.FC<TerrainToggleProps> = ({ map }) => {
  const [terrainEnabled, setTerrainEnabled] = useState(false);
  
  // Toggle terrain
  const toggleTerrain = () => {
    if (!map) return;
    
    if (terrainEnabled) {
      // Disable terrain
      map.setTerrain(null);
      setTerrainEnabled(false);
    } else {
      // Enable terrain
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      setTerrainEnabled(true);
    }
  };
  
  // Add terrain source when map is available
  useEffect(() => {
    if (!map) return;
    
    // Check if the map already has the terrain source
    if (!map.getSource('mapbox-dem')) {
      map.on('load', () => {
        // Add terrain source
        map.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
      });
    }
  }, [map]);
  
  return (
    <button
      onClick={toggleTerrain}
      disabled={!map}
      className={`p-2 rounded-full transition-colors shadow-lg ${
        terrainEnabled 
          ? 'bg-blue-600 hover:bg-blue-700' 
          : 'bg-gray-900 hover:bg-gray-800'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={terrainEnabled ? 'Disable 3D terrain' : 'Enable 3D terrain'}
      title={terrainEnabled ? 'Disable 3D terrain' : 'Enable 3D terrain'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    </button>
  );
};

export default TerrainToggle;
