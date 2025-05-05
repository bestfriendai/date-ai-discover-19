
import React, { useState } from 'react';
import { MapControls } from './MapControls';
import { MapStyleControls } from './MapStyleControls';
import { CoordinatesDisplay } from './CoordinatesDisplay';
import { ClockIcon, DollarSignIcon, FilterIcon, SettingsIcon } from '@/lib/icons';
import { CollapsiblePanel } from './CollapsiblePanel';
import { TimeSlider } from './TimeSlider';
import { PriceRangeFilter } from './PriceRangeFilter';
import { EventFilters } from '@/types';

interface MapControlsContainerProps {
  mapLoaded: boolean;
  viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  filters: EventFilters;
  currentMapStyle: string;
  locationRequested: boolean;
  onLocationSearch: (location: string) => void;
  onMapStyleChange: (style: string) => void;
  onFindMyLocation: () => void;
  onTimeRangeChange?: (range: [number, number]) => void;
  onPriceRangeChange?: (range: [number, number]) => void;
  onFreeEventsChange?: (showFreeOnly: boolean) => void;
  userPosition?: [number, number];
}

export const MapControlsContainer: React.FC<MapControlsContainerProps> = ({
  mapLoaded,
  viewState,
  filters,
  currentMapStyle,
  locationRequested,
  onLocationSearch,
  onMapStyleChange,
  onFindMyLocation,
  onTimeRangeChange,
  onPriceRangeChange,
  onFreeEventsChange,
  userPosition
}) => {
  const [showSettings, setShowSettings] = useState(false);

  if (!mapLoaded) return null;

  return (
    <>
      {/* Bottom center: Map Style Controls */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
        <MapStyleControls
          currentMapStyle={currentMapStyle}
          onMapStyleChange={onMapStyleChange}
        />
      </div>

      {/* Bottom right: Time Filter Panel */}
      <CollapsiblePanel
        title="Time Filter"
        icon={<ClockIcon className="h-4 w-4" />}
        position="right"
        className="bottom-4"
      >
        <TimeSlider
          onTimeRangeChange={(range) => onTimeRangeChange?.(range)}
          defaultValue={[8, 23]} // Default 8am to 11pm
        />
      </CollapsiblePanel>

      {/* Bottom left: Price Filter Panel */}
      <CollapsiblePanel
        title="Price Filter"
        icon={<DollarSignIcon className="h-4 w-4" />}
        position="left"
        className="bottom-4"
      >
        <PriceRangeFilter
          onPriceRangeChange={(range) => onPriceRangeChange?.(range)}
          onFreeEventsChange={(showFreeOnly) => onFreeEventsChange?.(showFreeOnly)}
          defaultValue={[0, 200]}
        />
      </CollapsiblePanel>

      {/* Debug coordinates (hidden in production) */}
      {process.env.NODE_ENV === 'development' && (
        <CoordinatesDisplay
          latitude={viewState.latitude}
          longitude={viewState.longitude}
          zoom={viewState.zoom}
        />
      )}

      {/* Main Map Controls (search, etc) */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <MapControls
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onResetNorth={() => {}}
          onRecenter={() => {}}
          onToggle3D={() => {}}
          is3D={false}
          onMapStyleChange={onMapStyleChange}
          currentMapStyle={currentMapStyle}
        />
      </div>
    </>
  );
};
