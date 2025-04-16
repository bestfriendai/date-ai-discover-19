
// Type definitions for mapbox-gl
declare module 'mapbox-gl' {
  // --- Layer Types ---
  export interface CircleLayer {
    id: string;
    type: 'circle';
    source: string;
    filter?: any[];
    paint?: { [key: string]: any };
    layout?: { [key: string]: any };
  }
  export interface SymbolLayer {
    id: string;
    type: 'symbol';
    source: string;
    filter?: any[];
    paint?: { [key: string]: any };
    layout?: { [key: string]: any };
  }

  // --- Source Types ---
  export interface GeoJSONSource {
    setData(data: any): void;
    getClusterExpansionZoom(clusterId: number, callback: (error: any, zoom: number) => void): void;
  }

  // --- Bounds Type ---
  export type LngLatBoundsLike = [number, number, number, number] | [[number, number], [number, number]];

  // --- GeolocateControl ---
  export class GeolocateControl {
    constructor(options?: any);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  // --- Map Methods Patch ---
  // Extend Map class below with missing methods
  export interface Map {
    getLayer(id: string): any;
    addLayer(layer: any): this;
    setFeatureState(feature: { source: string; id: string | number }, state: any): void;
    fitBounds(bounds: LngLatBoundsLike, options?: any): void;
    jumpTo(options: { center: [number, number]; zoom: number }): void;
    isStyleLoaded(): boolean;
  }

  export interface MapboxOptions {
    container: HTMLElement | string;
    style: string;
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    projection?: string;
    pitch?: number;
    bearing?: number;
    antialias?: boolean;
    attributionControl?: boolean;
    customAttribution?: string | string[];
    logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    failIfMajorPerformanceCaveat?: boolean;
    preserveDrawingBuffer?: boolean;
    refreshExpiredTiles?: boolean;
    maxBounds?: [[number, number], [number, number]];
    interactive?: boolean;
    bearingSnap?: number;
    pitchWithRotate?: boolean;
    clickTolerance?: number;
    hash?: boolean | string;
    touchPitch?: boolean;
    touchZoomRotate?: boolean;
    cooperativeGestures?: boolean;
    trackResize?: boolean;
    transformRequest?: (url: string, resourceType: string) => {url: string, headers?: {[key: string]: string}, credentials?: string};
    localIdeographFontFamily?: string;
    locale?: {[key: string]: string};
    fadeDuration?: number;
    crossSourceCollisions?: boolean;
  }

  export interface MarkerOptions {
    element?: HTMLElement;
    anchor?: string;
    offset?: [number, number];
    color?: string;
    draggable?: boolean;
    rotation?: number;
    rotationAlignment?: string;
    pitchAlignment?: string;
  }

  export class Map {
    constructor(options: MapboxOptions);
    addControl(control: Control, position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): this;
    removeControl(control: Control): this;
    getContainer(): HTMLElement;
    getCanvas(): HTMLCanvasElement;
    getCanvasContainer(): HTMLElement;
    getStyle(): any;
    setStyle(style: string | object, options?: {diff?: boolean, localIdeographFontFamily?: string}): this;
    on(type: string, listener: (ev: any) => void): this;
    off(type: string, listener: (ev: any) => void): this;
    once(type: string, listener: (ev: any) => void): this;
    getCenter(): {lng: number, lat: number};
    setCenter(center: [number, number], options?: {duration?: number, easing?: (time: number) => number}): this;
    getZoom(): number;
    setZoom(zoom: number, options?: {duration?: number, easing?: (time: number) => number}): this;
    scrollZoom: {enable: () => void, disable: () => void};
    easeTo(options: {center?: [number, number], zoom?: number, bearing?: number, pitch?: number, duration?: number, easing?: (time: number) => number, essential?: boolean}): this;
    flyTo(options: {center?: [number, number], zoom?: number, bearing?: number, pitch?: number, duration?: number, easing?: (time: number) => number, essential?: boolean}): this;
    getSource(id: string): any;
    addSource(id: string, source: any): this;
    queryRenderedFeatures(point: [number, number] | [number, number][], options?: {layers?: string[], filter?: any[]}): any[];
    setFog(fog: {color?: string, 'high-color'?: string, 'horizon-blend'?: number}): this;
    remove(): void;
  }

  export class NavigationControl implements Control {
    constructor(options?: {showCompass?: boolean, showZoom?: boolean, visualizePitch?: boolean});
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  export class Marker {
    constructor(options?: MarkerOptions);
    setLngLat(lngLat: [number, number]): this;
    addTo(map: Map): this;
    setPopup(popup: Popup): this;
    remove(): void;
  }

  export class Popup {
    constructor(options?: {closeButton?: boolean, closeOnClick?: boolean, anchor?: string, offset?: number | [number, number] | {[key: string]: [number, number]}, className?: string, maxWidth?: string});
    setLngLat(lngLat: [number, number]): this;
    setHTML(html: string): this;
    setMaxWidth(maxWidth: string): this;
    setText(text: string): this;
    addTo(map: Map): this;
    remove(): this;
    getElement(): HTMLElement;
    on(type: string, listener: (ev: any) => void): this;
  }

  export interface Control {
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  export let accessToken: string;
}
