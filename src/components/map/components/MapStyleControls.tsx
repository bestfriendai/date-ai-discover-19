import React from 'react';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, SunIcon, MoonIcon, MountainIcon, GlobeIcon, BuildingIcon, LayersIcon } from '@/lib/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MapStyleControlsProps {
  currentMapStyle: string;
  onMapStyleChange: (style: string) => void;
}

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  outdoor: 'mapbox://styles/mapbox/outdoors-v12',
  navigation: 'mapbox://styles/mapbox/navigation-day-v1'
};

export const MapStyleControls: React.FC<MapStyleControlsProps> = ({
  currentMapStyle,
  onMapStyleChange,
}) => {
  return (
    <TooltipProvider>
      <div className="flex gap-2 bg-background/80 backdrop-blur p-1.5 rounded-lg shadow-lg border border-border/50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={currentMapStyle === MAP_STYLES.streets ? "default" : "ghost"}
              onClick={() => onMapStyleChange(MAP_STYLES.streets)}
              className="h-8 w-8 rounded-md"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Streets</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={currentMapStyle === MAP_STYLES.light ? "default" : "ghost"}
              onClick={() => onMapStyleChange(MAP_STYLES.light)}
              className="h-8 w-8 rounded-md"
            >
              <SunIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Light</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={currentMapStyle === MAP_STYLES.dark ? "default" : "ghost"}
              onClick={() => onMapStyleChange(MAP_STYLES.dark)}
              className="h-8 w-8 rounded-md"
            >
              <MoonIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Dark</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={currentMapStyle === MAP_STYLES.satellite ? "default" : "ghost"}
              onClick={() => onMapStyleChange(MAP_STYLES.satellite)}
              className="h-8 w-8 rounded-md"
            >
              <GlobeIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Satellite</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={currentMapStyle === MAP_STYLES.outdoor ? "default" : "ghost"}
              onClick={() => onMapStyleChange(MAP_STYLES.outdoor)}
              className="h-8 w-8 rounded-md"
            >
              <MountainIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Outdoor</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={currentMapStyle === MAP_STYLES.navigation ? "default" : "ghost"}
              onClick={() => onMapStyleChange(MAP_STYLES.navigation)}
              className="h-8 w-8 rounded-md"
            >
              <LayersIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Navigation</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
