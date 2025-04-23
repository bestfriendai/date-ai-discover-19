import React, { useState } from 'react';
import { MapControls, EventFilters } from './MapControls';
import { MapStyleControls } from './MapStyleControls';
import { CoordinatesDisplay } from './CoordinatesDisplay';
import { Clock } from 'lucide-react/dist/esm/icons/clock';
import { DollarSign } from 'lucide-react/dist/esm/icons/dollar-sign';
import { Filter } from 'lucide-react/dist/esm/icons/filter';
import { Settings } from 'lucide-react/dist/esm/icons/settings';
import { CollapsiblePanel } from './CollapsiblePanel';
import { TimeSlider } from './TimeSlider';
import { PriceRangeFilter } from './PriceRangeFilter';

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
        icon={<Clock className="h-4 w-4" />}
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
        icon={<DollarSign className="h-4 w-4" />}
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
      <MapControls
        filters={filters}
        onLocationSearch={onLocationSearch}
        currentMapStyle={currentMapStyle}
        onMapStyleChange={onMapStyleChange}
        onFindMyLocation={onFindMyLocation}
        locationRequested={locationRequested}
      />
    </>
  );
};
