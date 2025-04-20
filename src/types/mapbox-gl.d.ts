// Type definitions for mapbox-gl
declare namespace GeoJSON {
  interface GeoJsonObject {
    type: string;
  }
  interface Geometry extends GeoJsonObject {}
  interface Feature<G extends Geometry | null = Geometry, P = GeoJsonProperties> extends GeoJsonObject {
    type: 'Feature';
    geometry: G;
    properties: P;
    id?: string | number;
  }
  interface GeoJsonProperties {
    [name: string]: any;
  }
  interface FeatureCollection<G extends Geometry | null = Geometry, P = GeoJsonProperties> extends GeoJsonObject {
    type: 'FeatureCollection';
    features: Array<Feature<G, P>>;
  }
  type GeoJSON = FeatureCollection | Feature | Geometry;
}

declare module 'mapbox-gl' {
  // --- Core Types ---
  export interface LngLat {
    lng: number;
    lat: number;
    toArray(): [number, number];
    toString(): string;
    distanceTo(lngLat: LngLat): number;
    toBounds(radius: number): LngLatBounds;
    wrap(): LngLat;
    static convert(input: LngLatLike): LngLat;
  }

  export type LngLatLike =
    | LngLat
    | { lng: number; lat: number }
    | { lon: number; lat: number }
    | [number, number];

  export interface LngLatBounds {
    sw: LngLatLike;
    ne: LngLatLike;
    _sw: LngLat;
    _ne: LngLat;
    extend(lngLat: LngLatLike | LngLatBoundsLike): this;
    getCenter(): LngLat;
    getSouth(): number;
    getWest(): number;
    getNorth(): number;
    getEast(): number;
    isEmpty(): boolean;
    toArray(): [[number, number], [number, number]];
    toString(): string;
    contains(lngLat: LngLatLike): boolean;
  }

  export type LngLatBoundsLike =
    | LngLatBounds
    | [LngLatLike, LngLatLike]
    | [number, number, number, number];

  export interface Point {
    x: number;
    y: number;
  }

  export type PointLike = Point | [number, number];

  export interface MapboxOptions {
    container: HTMLElement | string;
    style: string | object;
    center?: LngLatLike;
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
    maxBounds?: LngLatBoundsLike;
    interactive?: boolean;
    bearingSnap?: number;
    pitchWithRotate?: boolean;
    clickTolerance?: number;
    hash?: boolean | string;
    touchPitch?: boolean;
    touchZoomRotate?: boolean;
    cooperativeGestures?: boolean;
    trackResize?: boolean;
    transformRequest?: (url: string, resourceType: string) => { url: string; headers?: { [key: string]: string }; credentials?: string };
    localIdeographFontFamily?: string;
    locale?: { [key: string]: string };
    fadeDuration?: number;
    crossSourceCollisions?: boolean;
  }

  export interface MarkerOptions {
    element?: HTMLElement;
    anchor?: string;
    offset?: PointLike;
    color?: string;
    draggable?: boolean;
    rotation?: number;
    rotationAlignment?: string;
    pitchAlignment?: string;
  }

  export interface PopupOptions {
    closeButton?: boolean;
    closeOnClick?: boolean;
    anchor?: string;
    offset?: PointLike | number | { [key: string]: PointLike | number };
    className?: string;
    maxWidth?: string;
  }

  // --- Event Types ---
  export interface MapMouseEvent {
    type: string;
    target: Map;
    originalEvent: MouseEvent;
    lngLat: LngLat;
    point: Point;
    features?: GeoJSON.Feature[];
    preventDefault(): void;
  }

  export interface MapTouchEvent {
    type: string;
    target: Map;
    originalEvent: TouchEvent;
    points: Point[];
    lngLats: LngLat[];
    features?: GeoJSON.Feature[];
    preventDefault(): void;
  }

  export interface MapWheelEvent {
    type: string;
    target: Map;
    originalEvent: WheelEvent;
    point: Point;
    lngLat: LngLat;
    preventDefault(): void;
  }

  export interface MapDataEvent {
    type: string;
    target: Map;
    dataType: 'source' | 'style';
    isSourceLoaded: boolean;
    sourceId?: string;
    source?: Source;
  }

  export interface MapErrorEvent {
    type: 'error';
    target: Map;
    error: {
      message: string;
      status?: number;
    };
  }

  // --- Control Types ---
  export interface Control {
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getDefaultPosition?: () => string;
  }

  export class NavigationControl implements Control {
    constructor(options?: { showCompass?: boolean; showZoom?: boolean; visualizePitch?: boolean });
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getDefaultPosition(): string;
  }

  export class GeolocateControl implements Control {
    constructor(options?: any);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    trigger(): boolean;
    stop(): void;
    getDefaultPosition(): string;
  }

  // --- Source Types ---
  export interface Source {
    type: string;
    id?: string;
    minzoom?: number;
    maxzoom?: number;
  }

  export interface GeoJSONSourceOptions {
    type: 'geojson';
    data: GeoJSON.GeoJSON | string;
    maxzoom?: number;
    attribution?: string;
    buffer?: number;
    tolerance?: number;
    cluster?: boolean;
    clusterRadius?: number;
    clusterMaxZoom?: number;
    clusterMinPoints?: number;
    clusterProperties?: { [key: string]: any };
    lineMetrics?: boolean;
    generateId?: boolean;
    promoteId?: string;
    filter?: any[];
  }

  export interface GeoJSONSource extends Source {
    type: 'geojson';
    data: GeoJSON.GeoJSON | string;
    setData(data: GeoJSON.GeoJSON | string): void;
    getClusterExpansionZoom(clusterId: number, callback: (error: any, zoom: number) => void): void;
    getClusterLeaves(clusterId: number, limit: number, offset: number, callback: (error: any, features: GeoJSON.Feature[]) => void): void;
    getClusterChildren(clusterId: number, callback: (error: any, features: GeoJSON.Feature[]) => void): void;
  }

  // --- Layer Types ---
  export interface Layer {
    id: string;
    type: string;
    source?: string; // Make source optional for layers like 'sky' that don't require a source
    'source-layer'?: string;
    minzoom?: number;
    maxzoom?: number;
    filter?: any[];
    layout?: { [key: string]: any };
    paint?: { [key: string]: any };
  }

  export interface CircleLayer extends Layer {
    id: string;
    type: 'circle';
    source: string;
    filter?: any[];
    paint?: { [key: string]: any };
    layout?: { [key: string]: any };
  }

  export interface SymbolLayer extends Layer {
    id: string;
    type: 'symbol';
    source: string;
    filter?: any[];
    paint?: { [key: string]: any };
    layout?: { [key: string]: any };
  }

  export interface SkyLayer extends Layer {
    type: 'sky';
    paint?: {
      'sky-type'?: 'flat' | 'atmosphere';
      'sky-atmosphere-sun'?: [number, number];
      'sky-atmosphere-sun-intensity'?: number;
    }
  }

  export interface FillLayer extends Layer {
    type: 'fill';
    paint?: {
      'fill-color'?: string | any[];
      'fill-opacity'?: number | any[];
    };
  }

  export interface LineLayer extends Layer {
    type: 'line';
    paint?: {
      'line-color'?: string | any[];
      'line-width'?: number | any[];
    };
  }

  // --- Map Class ---
  export class Map {
    constructor(options: MapboxOptions);

    // Evented methods - with proper overloads for layer-specific events
    on(type: string, listener: (ev: any) => void): this;
    on(type: string, layerId: string, listener: (ev: MapMouseEvent | MapTouchEvent | MapWheelEvent | MapDataEvent | any) => void): this;
    
    off(type: string, listener?: (ev: any) => void): this;
    off(type: string, layerId: string, listener?: (ev: MapMouseEvent | MapTouchEvent | MapWheelEvent | MapDataEvent | any) => void): this;
    
    once(type: string, listener: (ev: any) => void): this;

    // Map methods
    addControl(control: Control, position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): this;
    removeControl(control: Control): this;
    getContainer(): HTMLElement;
    getCanvas(): HTMLCanvasElement;
    getCanvasContainer(): HTMLElement;
    getStyle(): any;
    setStyle(style: string | object, options?: { diff?: boolean; localIdeographFontFamily?: string }): this;
    getCenter(): LngLat;
    setCenter(center: LngLatLike, options?: { duration?: number, easing?: (time: number) => number }): this;
    getZoom(): number; // Ensure this always returns a number
    setZoom(zoom: number, options?: { duration?: number, easing?: (time: number) => number }): this;
    getBounds(): LngLatBounds;
    fitBounds(bounds: LngLatBoundsLike, options?: any, eventData?: any): this;
    jumpTo(options: { center?: LngLatLike; zoom?: number; bearing?: number; pitch?: number; animate?: boolean }, eventData?: any): this;
    easeTo(options: { center?: LngLatLike; zoom?: number; bearing?: number; pitch?: number; duration?: number; easing?: (time: number) => number; essential?: boolean; animate?: boolean }, eventData?: any): this;
    flyTo(options: { center?: LngLatLike; zoom?: number; bearing?: number; pitch?: number; speed?: number; curve?: number; easing?: (time: number) => number; essential?: boolean; duration?: number }, eventData?: any): this;

    getSource(id: string): Source | undefined;
    getSource(id: string): GeoJSONSource | undefined; // Overload for specific source type
    addSource(id: string, source: Source | GeoJSONSourceOptions): this;
    removeSource(id: string): this;

    getLayer(id: string): Layer | undefined;
    addLayer(layer: Layer, beforeId?: string): this;
    removeLayer(id: string): this;

    queryRenderedFeatures(point: PointLike, options?: { layers?: string[]; filter?: any[] }): GeoJSON.Feature[];
    queryRenderedFeatures(points: PointLike[], options?: { layers?: string[]; filter?: any[] }): GeoJSON.Feature[];

    setFeatureState(feature: { source: string; id: string | number }, state: { [key: string]: any } | null): void;
    removeFeatureState(feature: { source: string; id: string | number }, key?: string): void;

    isStyleLoaded(): boolean;
    loaded(): boolean;

    setFog(fog: any): this;
    getFog(): any;

    remove(): void;

    scrollZoom: { enable(): void; disable(): void; isEnabled(): boolean; };
    boxZoom: { enable(): void; disable(): void; isEnabled(): boolean; };
    dragRotate: { enable(): void; disable(): void; isEnabled(): boolean; };
    dragPan: { enable(): void; disable(): void; isEnabled(): boolean; };
    keyboard: { enable(): void; disable(): void; isEnabled(): boolean; };
    doubleClickZoom: { enable(): void; disable(): void; isEnabled(): boolean; };
    touchZoomRotate: { enable(): void; disable(): void; isEnabled(): boolean; };
    setTerrain(terrain: any): this;
    getTerrain(): any;
  }

  export class Marker {
    constructor(options?: MarkerOptions, legacyOptions?: any);
    getElement(): HTMLElement;
    getLngLat(): LngLat;
    setLngLat(lngLat: LngLatLike): this;
    addTo(map: Map): this;
    remove(): this;
    setPopup(popup?: Popup): this;
    getPopup(): Popup | undefined;
    setDraggable(draggable: boolean): this;
    isDraggable(): boolean;
    setRotation(rotation: number): this;
    getRotation(): number;
    setRotationAlignment(alignment: string): this;
    getRotationAlignment(): string;
    setPitchAlignment(alignment: string): this;
    getPitchAlignment(): string;
    togglePopup(): this;
  }

  export class Popup {
    constructor(options?: PopupOptions);
    addTo(map: Map): this;
    remove(): this;
    setLngLat(lngLat: LngLatLike): this;
    getLngLat(): LngLat | undefined;
    setHTML(html: string): this;
    setText(text: string): this;
    setMaxWidth(maxWidth: string): this;
    isOpen(): boolean;
    getElement(): HTMLElement;
    trackPointer(): this;
    setOffset(offset?: PointLike | number | { [key: string]: PointLike | number }): this;
    on(type: string, listener: (ev: any) => void): this;
    off(type: string, listener?: (ev: any) => void): this;
  }

  export let accessToken: string;
}
