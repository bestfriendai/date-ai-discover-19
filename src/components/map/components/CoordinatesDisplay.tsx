
import { motion } from 'framer-motion';

interface CoordinatesDisplayProps {
  longitude: number;
  latitude: number;
  zoom: number;
}

export const CoordinatesDisplay = ({ longitude, latitude, zoom }: CoordinatesDisplayProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-lg rounded-lg p-3 text-xs space-y-1 border border-border/50 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Longitude:</span>
        <span className="font-medium">{longitude.toFixed(4)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Latitude:</span>
        <span className="font-medium">{latitude.toFixed(4)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Zoom:</span>
        <span className="font-medium">{zoom.toFixed(2)}</span>
      </div>
    </motion.div>
  );
};
