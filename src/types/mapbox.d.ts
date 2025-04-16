// Custom type definitions for mapbox-gl to fix TypeScript errors
import mapboxgl from 'mapbox-gl';

declare module 'mapbox-gl' {
  export interface Map {
    on(type: string, layerId: string, listener: (e: any) => void): this;
    off(type: string): this;
  }
}
