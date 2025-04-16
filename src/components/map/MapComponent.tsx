import { useRef, useEffect, useState, useCallback } from 'react';
import ReactDOMServer from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { MapControls } from './components/MapControls';
import { MapPopup } from './components/MapPopup';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, Search } from 'lucide-react';
import { searchEvents } from '@/services/eventService';
import { Button } from '@/components/ui/button';
import UserLocationMarker from './markers/UserLocationMarker';
import type { EventFilters } from './components/MapControls';
import { formatISO } from 'date-fns';
import * as GeoJSON from 'geojson';
import bbox from '@turf/bbox';
import { motion } from 'framer-motion';

// Define map styles
const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

interface MapComponentProps {
  onEventSelect?: (event: Event) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onEventsChange?: (events: Event[]) => void;
}

// --- Map Layer Definitions ---
const clusterLayer: mapboxgl.CircleLayer = {
  id: 'clusters',
  type: 'circle',
  source: 'events',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#51bbd6', 10, '#f1f075', 100, '#f28cb1'
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20, 10, 30, 100, 40
    ],
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      2, 0
    ],
    'circle-stroke-color': '#fff'
  }
};

const clusterCountLayer: mapboxgl.SymbolLayer = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'events',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  },
  paint: { "text-color": "#ffffff" }
};

const unclusteredPointLayer: mapboxgl.CircleLayer = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'events',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
      'match',
      ['get', 'category'],
      'music', '#fbb03b',
      'sports', '#223b53',
      'arts', '#e55e5e',
      'theatre', '#e55e5e',
      'family', '#3bb2d0',
      'food', '#3ca951',
      'restaurant', '#3ca951',
      '#cccccc'
    ],
    'circle-radius': 6,
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      2, 1
    ],
    'circle-stroke-color': '#ffffff',
    'circle-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      1, 0.8
    ]
  }
};
// --- End Layer Definitions ---

// Helper function to convert events to GeoJSON features
const eventsToGeoJSON = (events: Event[]): GeoJSON.FeatureCollection<GeoJSON.Point> => {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  let skipped = 0;
  let missingCategory = 0;
  events.forEach(event => {
    // Validate coordinates
    if (
      !event.coordinates ||
      !Array.isArray(event.coordinates) ||
      event.coordinates.length !== 2 ||
      typeof event.coordinates[0] !== 'number' ||
      typeof event.coordinates[1] !== 'number' ||
      isNaN(event.coordinates[0]) ||
      isNaN(event.coordinates[1])
    ) {
      skipped++;
      return;
    }
    // Validate category
    if (!event.category) {
      missingCategory++;
    }
    features.push({
      type: 'Feature',
      properties: {
        id: event.id,
        title: event.title,
        category: event.category?.toLowerCase() || 'other',
      },
      geometry: {
        type: 'Point',
        coordinates: event.coordinates as [number, number]
      }
    });
  });
  // Debug logging
  // eslint-disable-next-line no-console
  console.log(`[Map] eventsToGeoJSON: received=${events.length}, output=${features.length}, skipped_invalid_coords=${skipped}, missing_category=${missingCategory}`);
  return {
    type: 'FeatureCollection',
    features
  };
};


const MapComponent = ({ onEventSelect, onLoadingChange, onEventsChange }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const hoverPopup = useRef<mapboxgl.Popup | null>(null);
  const isProgrammaticMove = useRef(false);
  const [viewState, setViewState] = useState({ longitude: -73.9712, latitude: 40.7831, zoom: 14 });
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true); // Internal loading for map init/fetch
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'grid'>('list');
  const [locationRequested, setLocationRequested] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('New York');
  const [filters, setFilters] = useState<EventFilters>({});
  const [mapHasMoved, setMapHasMoved] = useState(false);
  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.dark);

  // --- Event Fetching ---
  const fetchEvents = useCallback(async (latitude: number, longitude: number, radius: number = 30, currentFilters: EventFilters = {}) => {
    setLoading(true); onLoadingChange?.(true);
    try {
      const startDate = currentFilters.dateRange?.from ? formatISO(currentFilters.dateRange.from, { representation: 'date' }) : undefined;
      const endDate = currentFilters.dateRange?.to ? formatISO(currentFilters.dateRange.to, { representation: 'date' }) : undefined;
      const fetchedEvents = await searchEvents({ latitude, longitude, radius, startDate, endDate, categories: currentFilters.categories });
      setEvents(fetchedEvents); onEventsChange?.(fetchedEvents);
      // Optional: Add success/no results toast here
    } catch (error) { console.error('Error fetching events:', error); toast({ title: "Error", description: "Failed to fetch events.", variant: "destructive" }); }
    finally { setLoading(false); onLoadingChange?.(false); }
  }, [onEventsChange, onLoadingChange]);

  // --- Filter Handling ---
  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters); setMapHasMoved(false);
    fetchEvents(viewState.latitude, viewState.longitude, 30, updatedFilters);
  }, [filters, viewState.latitude, viewState.longitude, fetchEvents]);

  // --- Location Handling ---
  const getUserLocation = useCallback(async (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast({ title: "Geolocation not supported", variant: "destructive" });
        return reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve([position.coords.longitude, position.coords.latitude]),
        (error) => {
          let msg = "An unknown error occurred.";
          if (error.code === 1) msg = "Location permission denied.";
          if (error.code === 2) msg = "Location information unavailable.";
          if (error.code === 3) msg = "Location request timed out.";
          toast({ title: "Location error", description: msg, variant: "destructive" });
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  // --- Map Setup and Source/Layer Management ---
  const setupMapFeatures = useCallback(() => {
    if (!map.current) return;
    const currentMap = map.current;

    // Add Source (or check if exists)
    if (!currentMap.getSource('events')) {
      currentMap.addSource('events', { type: 'geojson', data: eventsToGeoJSON(events), cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
    } else {
      // Update data if source exists
       (currentMap.getSource('events') as mapboxgl.GeoJSONSource).setData(eventsToGeoJSON(events));
    }

    // Add Layers (or check if exists)
    if (!currentMap.getLayer('clusters')) {
      currentMap.addLayer({ id: 'clusters', type: 'circle', source: 'events', filter: ['has', 'point_count'], paint: { 'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 100, '#f28cb1'], 'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 100, 40], 'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0], 'circle-stroke-color': '#fff' } });
    }
    if (!currentMap.getLayer('cluster-count')) {
      currentMap.addLayer({ id: 'cluster-count', type: 'symbol', source: 'events', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12 }, paint: { "text-color": "#ffffff" } });
    }
    if (!currentMap.getLayer('unclustered-point')) {
      currentMap.addLayer({ id: 'unclustered-point', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get', 'category'], 'music', '#fbb03b', 'sports', '#223b53', 'arts', '#e55e5e', 'theatre', '#e55e5e', 'family', '#3bb2d0', 'food', '#3ca951', 'restaurant', '#3ca951', '#cccccc'], 'circle-radius': 6, 'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 1], 'circle-stroke-color': '#ffffff', 'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.8] } });
    }

    // --- Interactions (Re-attach after style change) ---
    let hoveredFeatureId: string | number | undefined = undefined;
    const setHoverState = (id: string | number | undefined, state: boolean) => { if (id !== undefined && currentMap?.getSource('events')) currentMap.setFeatureState({ source: 'events', id }, { hover: state }); };

    // Remove existing listeners first
    currentMap.off('mousemove', 'clusters'); currentMap.off('mouseleave', 'clusters');
    currentMap.off('mousemove', 'unclustered-point'); currentMap.off('mouseleave', 'unclustered-point');
    currentMap.off('click', 'clusters'); currentMap.off('click', 'unclustered-point');
    currentMap.off('mouseenter', 'clusters'); currentMap.off('mouseleave', 'clusters');
    currentMap.off('mouseenter', 'unclustered-point'); currentMap.off('mouseleave', 'unclustered-point');

    // Add new listeners
    currentMap.on('mousemove', 'clusters', (e) => { if (e.features?.length) { if (hoveredFeatureId !== undefined) setHoverState(hoveredFeatureId, false); hoveredFeatureId = e.features[0].id; setHoverState(hoveredFeatureId, true); } });
    currentMap.on('mouseleave', 'clusters', () => { if (hoveredFeatureId !== undefined) setHoverState(hoveredFeatureId, false); hoveredFeatureId = undefined; });
    currentMap.on('mousemove', 'unclustered-point', (e) => {
      if (e.features?.length) {
        const currentFeature = e.features[0]; const currentFeatureId = currentFeature.properties?.id;
        if (hoveredFeatureId !== currentFeatureId) { if (hoveredFeatureId !== undefined) setHoverState(hoveredFeatureId, false); hoveredFeatureId = currentFeatureId; setHoverState(hoveredFeatureId, true); }
        if (map.current && currentFeature.geometry.type === 'Point') {
          const coords = currentFeature.geometry.coordinates.slice() as [number, number]; const title = currentFeature.properties?.title || 'Event';
          while (Math.abs(e.lngLat.lng - coords[0]) > 180) coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
          if (!hoverPopup.current) hoverPopup.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15, className: 'date-ai-hover-popup' });
          hoverPopup.current.setLngLat(coords).setHTML(`<p class="text-xs font-medium">${title}</p>`).addTo(map.current);
        }
      } else { if (hoveredFeatureId !== undefined) setHoverState(hoveredFeatureId, false); hoveredFeatureId = undefined; hoverPopup.current?.remove(); }
    });
    currentMap.on('mouseleave', 'unclustered-point', () => { if (hoveredFeatureId !== undefined) setHoverState(hoveredFeatureId, false); hoveredFeatureId = undefined; hoverPopup.current?.remove(); });
    currentMap.on('click', 'clusters', (e) => {
      const features = currentMap.queryRenderedFeatures(e.point, { layers: ['clusters'] }); if (!features?.length) return; const clusterId = features[0].properties?.cluster_id; const source = currentMap.getSource('events') as mapboxgl.GeoJSONSource;
      source?.getClusterExpansionZoom(clusterId, (err, zoom) => { if (err || !e.features?.[0]?.geometry || e.features[0].geometry.type !== 'Point') return; isProgrammaticMove.current = true; currentMap.easeTo({ center: e.features[0].geometry.coordinates as [number, number], zoom: zoom }); setTimeout(() => { isProgrammaticMove.current = false; }, 1100); });
    });
    currentMap.on('click', 'unclustered-point', (e) => { if (!e.features?.[0]?.properties) return; const eventId = e.features[0].properties.id; const clickedEvent = events.find(ev => ev.id === eventId); if (clickedEvent) { setSelectedEvent(clickedEvent); onEventSelect?.(clickedEvent); } });
    currentMap.on('mouseenter', 'clusters', () => { if(currentMap) currentMap.getCanvas().style.cursor = 'pointer'; });
    currentMap.on('mouseleave', 'clusters', () => { if(currentMap) currentMap.getCanvas().style.cursor = ''; });
    currentMap.on('mouseenter', 'unclustered-point', () => { if(currentMap) currentMap.getCanvas().style.cursor = 'pointer'; });
    currentMap.on('mouseleave', 'unclustered-point', () => { if(currentMap) currentMap.getCanvas().style.cursor = ''; });

  }, [events, onEventSelect]); // Include events and onEventSelect

  // --- Map Initialization Effect ---
  useEffect(() => {
    let isMounted = true;
    const initializeMap = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (!isMounted || error || !data?.MAPBOX_TOKEN || !mapContainer.current) throw error || new Error('Map init failed');

        mapboxgl.accessToken = data.MAPBOX_TOKEN;
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyle, // Use state variable for initial style
          center: [viewState.longitude, viewState.latitude],
          zoom: viewState.zoom,
          pitch: 45, bearing: -17.6, attributionControl: false, preserveDrawingBuffer: true
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        map.current.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), 'bottom-right');

        map.current.on('load', () => {
  if (!isMounted || !map.current) return;
  setMapLoaded(true);
  setupMapFeatures(); // Setup sources, layers, interactions
  fetchEvents(viewState.latitude, viewState.longitude, 30, filters);
});

// Ensure sources/layers are re-added after style changes
map.current.on('style.load', () => {
  if (!isMounted || !map.current) return;
  setupMapFeatures();
});

        map.current.on('move', (e) => {
          if (!map.current) return;
          const center = map.current.getCenter();
          setViewState({ longitude: parseFloat(center.lng.toFixed(4)), latitude: parseFloat(center.lat.toFixed(4)), zoom: parseFloat(map.current.getZoom().toFixed(2)) });
          if (!isProgrammaticMove.current && mapLoaded && (e.originalEvent || (e as any).isUserInteraction)) { setMapHasMoved(true); }
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error initializing map:', error);
        toast({ title: "Map initialization failed", description: "Could not load the map.", variant: "destructive" });
        setLoading(false);
      }
    };
    initializeMap();
    return () => { isMounted = false; if (userMarker) userMarker.remove(); if (map.current) map.current.remove(); };
  }, []); // Run only once on mount

  // --- Effect to Update Map Data ---
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource('events')) return; // Ensure source exists
    const source = map.current.getSource('events') as mapboxgl.GeoJSONSource;
    if (source) {
      const geojsonData = eventsToGeoJSON(events);
      source.setData(geojsonData);
      // Fit bounds only if not loading and map hasn't just been moved by user
      if (geojsonData.features.length > 0 && !loading && !mapHasMoved) {
        try {
          isProgrammaticMove.current = true;
          const bounds = bbox(geojsonData) as mapboxgl.LngLatBoundsLike;
          map.current.fitBounds(bounds, { padding: { top: 100, bottom: 50, left: 50, right: 50 }, maxZoom: 15, duration: 1000 });
          setTimeout(() => { isProgrammaticMove.current = false; }, 1100);
        } catch (e) { console.error("Error fitting bounds:", e); }
      }
    }
  }, [events, mapLoaded, loading, mapHasMoved]);

  // --- Effect to Handle Style Changes ---
   useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleStyleData = () => {
      if (map.current?.isStyleLoaded()) {
        console.log("Style loaded, re-adding features...");
        setupMapFeatures(); // Re-run setup (adds source if needed, layers, interactions)
      } else {
         map.current?.once('styledata', handleStyleData);
      }
    };

    map.current.setStyle(mapStyle);
    map.current.once('styledata', handleStyleData);

  }, [mapStyle, mapLoaded, setupMapFeatures]); // Depend on mapStyle


  // --- Handlers ---
  const handleSearchThisArea = () => {
    if (!map.current) return;
    setMapHasMoved(false);
    const center = map.current.getCenter();
    fetchEvents(center.lat, center.lng, 30, filters);
    toast({ title: "Searching Area", description: "Fetching events for the current map view." });
  };

  const handleClearSearch = () => {
    setMapHasMoved(false); // Also reset move state on clear
    // Re-fetch for the original or last known good viewState? Let's use current viewState.
    fetchEvents(viewState.latitude, viewState.longitude, 30, filters);
  };

  const handleViewChange = (view: 'list' | 'grid') => { setCurrentView(view); };

  const handleLocationSearch = async (location: string) => {
    if (!location.trim() || !mapboxgl.accessToken) return;
    setLoading(true); onLoadingChange?.(true); setMapHasMoved(false);
    toast({ title: "Searching", description: `Looking for events near ${location}...` });
    try {
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
      const response = await fetch(geocodeUrl); const data = await response.json();
      if (data.features?.length) {
        const feature = data.features[0]; const [longitude, latitude] = feature.center; const placeName = feature.text || location;
        setCurrentLocation(placeName);
        if (map.current) {
          isProgrammaticMove.current = true;
          map.current.easeTo({ center: [longitude, latitude], zoom: 13, duration: 1500 });
          setTimeout(() => { isProgrammaticMove.current = false; }, 1600);
          setViewState({ longitude, latitude, zoom: 13 });
          await fetchEvents(latitude, longitude, 30, filters);
          // Toast removed, fetchEvents handles success/fail toast
        }
      } else { toast({ title: "Location not found", variant: "destructive" }); setLoading(false); onLoadingChange?.(false); } // Stop loading if not found
    } catch (error) { console.error('Geocoding error:', error); toast({ title: "Search Error", variant: "destructive" }); setLoading(false); onLoadingChange?.(false); }
    // finally block removed as fetchEvents handles the final loading state change
  };

  const handleGetUserLocation = async () => {
    setLocationRequested(true); setMapHasMoved(false);
    try {
      const [longitude, latitude] = await getUserLocation();
      if (!map.current) throw new Error("Map not initialized");
      if (userMarker) userMarker.remove();
      const markerHtml = ReactDOMServer.renderToString(<UserLocationMarker color="blue" />); const el = document.createElement('div'); el.innerHTML = markerHtml;
      const marker = new mapboxgl.Marker({ element: el.firstChild as HTMLElement }).setLngLat([longitude, latitude]).addTo(map.current); setUserMarker(marker);
      isProgrammaticMove.current = true;
      setViewState({ longitude, latitude, zoom: 14 });
      map.current.jumpTo({ center: [longitude, latitude], zoom: 14 });
      setTimeout(() => { if (map.current) map.current.easeTo({ pitch: 50, bearing: Math.random() * 60 - 30, duration: 1500 }); isProgrammaticMove.current = false; }, 100);
      try { // Reverse geocode
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`); const data = await response.json();
        if (data.features?.length) { const place = data.features.find((f: any) => f.place_type.includes('place') || f.place_type.includes('locality')); if (place) setCurrentLocation(place.text); }
      } catch (geoError) { console.error('Reverse geocode error:', geoError); }
      fetchEvents(latitude, longitude, 30, filters);
      // Toast removed, fetchEvents handles success/fail toast
    } catch (error) {
      console.error('Get location error:', error);
      const fallbackLng = -73.9712, fallbackLat = 40.7831;
      // Toast handled by getUserLocation
      if (map.current) {
        if (userMarker) userMarker.remove();
        const fallbackMarkerHtml = ReactDOMServer.renderToString(<UserLocationMarker color="red" />); const fallbackEl = document.createElement('div'); fallbackEl.innerHTML = fallbackMarkerHtml;
        const marker = new mapboxgl.Marker({ element: fallbackEl.firstChild as HTMLElement }).setLngLat([fallbackLng, fallbackLat]).addTo(map.current); setUserMarker(marker);
        isProgrammaticMove.current = true;
        map.current.jumpTo({ center: [fallbackLng, fallbackLat], zoom: 14 });
        setTimeout(() => { isProgrammaticMove.current = false; }, 100);
        setViewState({ longitude: fallbackLng, latitude: fallbackLat, zoom: 14 });
        fetchEvents(fallbackLat, fallbackLng, 30, filters);
      }
    } finally { setLocationRequested(false); }
  };

   const handleMapStyleChange = (newStyle: string) => {
      if (mapStyle !== newStyle && map.current) {
          setMapStyle(newStyle);
          setSelectedEvent(null); // Clear selection
          hoverPopup.current?.remove(); // Remove hover popup
          console.log(`Changing map style to: ${newStyle}`);
          // Style change is handled by the useEffect hook watching mapStyle
      }
  };


  // --- Render ---
  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {mapLoaded && (
         <MapControls
           currentView={currentView}
           onViewChange={handleViewChange}
           filters={filters}
           onFiltersChange={handleFiltersChange}
           onLocationSearch={handleLocationSearch}
           onSearchClear={handleClearSearch}
           currentMapStyle={mapStyle} // Pass current style
           onMapStyleChange={handleMapStyleChange} // Pass handler
         />
      )}

       {mapLoaded && mapHasMoved && (
         <motion.div className="absolute top-20 left-1/2 -translate-x-1/2 z-10" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
           <Button onClick={handleSearchThisArea} className="shadow-lg bg-background/90 hover:bg-background backdrop-blur-sm border border-border/50">
             <Search className="mr-2 h-4 w-4" /> Search This Area
           </Button>
         </motion.div>
       )}

      {selectedEvent && map.current && (
        <MapPopup map={map.current} event={selectedEvent} onClose={() => setSelectedEvent(null)} onViewDetails={onEventSelect} />
      )}

      {mapLoaded && ( <CoordinatesDisplay latitude={viewState.latitude} longitude={viewState.longitude} zoom={viewState.zoom} /> )}

      {mapLoaded && (
        <div className="absolute bottom-4 right-20 z-10 bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg rounded-full px-4 py-2 flex items-center gap-3">
           <span className="text-xs text-muted-foreground hidden sm:inline">Location: {currentLocation}</span>
           <Button variant="ghost" size="icon" onClick={handleGetUserLocation} disabled={locationRequested} className="rounded-full h-8 w-8" aria-label="Get Current Location">
             {locationRequested ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
           </Button>
         </div>
      )}
    </div>
  );
};


export default MapComponent;
