import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  SlidersHorizontalIcon,
  LocateIcon,
  Plus,
  Minus,
  LayersIcon,
  Map as MapIcon,
  FilterIcon,
  SatelliteIcon,
  Monitor,
  NavigationIcon,
  MountainIcon,
  SunIcon,
  MoonIcon,
  GlobeIcon,
  BuildingIcon
} from '@/lib/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetNorth: () => void;
  onRecenter: () => void;
  onToggle3D: () => void;
  is3D: boolean;
  onMapStyleChange: (style: string) => void;
  currentMapStyle: string;
}

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  outdoor: 'mapbox://styles/mapbox/outdoors-v12',
  navigation: 'mapbox://styles/mapbox/navigation-day-v1'
};

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetNorth,
  onRecenter,
  onToggle3D,
  is3D,
  onMapStyleChange,
  currentMapStyle
}) => {
  const [open, setOpen] = useState(false)

  const handleMapStyleChange = useCallback((style: string) => {
    onMapStyleChange(style);
    setOpen(false); // Close the sheet after style change
  }, [onMapStyleChange]);

  return (
    <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
      <TooltipProvider>
        <div className="flex flex-col gap-2 bg-background/80 backdrop-blur p-1.5 rounded-lg shadow-lg border border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={onZoomIn} aria-label="Zoom In">
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={onZoomOut} aria-label="Zoom Out">
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={onResetNorth} aria-label="Reset North">
                <LayersIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Reset North</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={onRecenter} aria-label="Recenter">
                <LocateIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Recenter</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button size="icon" aria-label="Map Style">
                  <MapIcon className="h-4 w-4" />
                </Button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Map Style</p>
            </TooltipContent>
          </Tooltip>
          <SheetContent className="sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Map Style</SheetTitle>
              <SheetDescription>
                Choose the map style that best suits your needs.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Button
                variant={currentMapStyle === MAP_STYLES.streets ? "default" : "outline"}
                onClick={() => handleMapStyleChange(MAP_STYLES.streets)}
              >
                Streets
              </Button>
              <Button
                variant={currentMapStyle === MAP_STYLES.light ? "default" : "outline"}
                onClick={() => handleMapStyleChange(MAP_STYLES.light)}
              >
                Light
              </Button>
              <Button
                variant={currentMapStyle === MAP_STYLES.dark ? "default" : "outline"}
                onClick={() => handleMapStyleChange(MAP_STYLES.dark)}
              >
                Dark
              </Button>
              <Button
                variant={currentMapStyle === MAP_STYLES.satellite ? "default" : "outline"}
                onClick={() => handleMapStyleChange(MAP_STYLES.satellite)}
              >
                Satellite
              </Button>
              <Button
                variant={currentMapStyle === MAP_STYLES.outdoor ? "default" : "outline"}
                onClick={() => handleMapStyleChange(MAP_STYLES.outdoor)}
              >
                Outdoor
              </Button>
              <Button
                variant={currentMapStyle === MAP_STYLES.navigation ? "default" : "outline"}
                onClick={() => handleMapStyleChange(MAP_STYLES.navigation)}
              >
                Navigation
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="bg-background/80 backdrop-blur p-1.5 rounded-lg shadow-lg border border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={onToggle3D} aria-label="Toggle 3D">
                <Monitor className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Toggle 3D Buildings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};
