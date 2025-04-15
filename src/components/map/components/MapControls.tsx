
import mapboxgl from 'mapbox-gl';

interface MapControlsProps {
  map: mapboxgl.Map;
}

export const MapControls = ({ map }: MapControlsProps) => {
  // Add navigation controls when the component mounts
  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  return null; // This is a utility component that doesn't render anything
};
