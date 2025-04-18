import React from 'react';
import { MapControls, EventFilters } from './MapControls';
import { MapStyleControls } from './MapStyleControls';
import { CoordinatesDisplay } from './CoordinatesDisplay';

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
}) => {
  if (!mapLoaded) return null;
  
  return (
    <>
      <CoordinatesDisplay
        latitude={viewState.latitude}
        longitude={viewState.longitude}
        zoom={viewState.zoom}
      />
      
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
        <MapStyleControls
          currentMapStyle={currentMapStyle}
          onMapStyleChange={onMapStyleChange}
        />
      </div>
      
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
