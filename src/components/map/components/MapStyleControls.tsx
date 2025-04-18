
import React from 'react';
import { Moon, Sun, Satellite, Map } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from '@/lib/utils';

interface MapStyleControlsProps {
  currentMapStyle: string;
  onMapStyleChange: (styleUrl: string) => void;
}

export const MapStyleControls = ({ currentMapStyle, onMapStyleChange }: MapStyleControlsProps) => {
  return (
    <ToggleGroup type="single" className="bg-background/80 backdrop-blur-xl rounded-full border border-border/50 p-1 shadow-lg">
      <ToggleGroupItem 
        value="dark" 
        onClick={() => onMapStyleChange('mapbox://styles/mapbox/dark-v11')}
        className={cn(
          "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground", 
          currentMapStyle.includes('dark-v11') && "bg-primary text-primary-foreground"
        )}
        aria-label="Dark mode"
      >
        <Moon className="h-5 w-5" />
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="light" 
        onClick={() => onMapStyleChange('mapbox://styles/mapbox/light-v11')}
        className={cn(
          "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground", 
          currentMapStyle.includes('light-v11') && "bg-primary text-primary-foreground"
        )}
        aria-label="Light mode"
      >
        <Sun className="h-5 w-5" />
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="satellite" 
        onClick={() => onMapStyleChange('mapbox://styles/mapbox/satellite-streets-v12')}
        className={cn(
          "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground", 
          currentMapStyle.includes('satellite-streets-v12') && "bg-primary text-primary-foreground"
        )}
        aria-label="Satellite view"
      >
        <Satellite className="h-5 w-5" />
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="streets" 
        onClick={() => onMapStyleChange('mapbox://styles/mapbox/streets-v12')}
        className={cn(
          "h-10 w-10 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground", 
          currentMapStyle.includes('streets-v12') && "bg-primary text-primary-foreground"
        )}
        aria-label="Streets view"
      >
        <Map className="h-5 w-5" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
