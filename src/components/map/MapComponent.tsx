
import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { MapControls } from './components/MapControls';
import { MapMarkers } from './components/MapMarkers';
import { MapPopup } from './components/MapPopup';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';

interface MapComponentProps {
  onEventSelect?: (event: Event) => void;
}

const MapComponent = ({ onEventSelect }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -73.9712,
    latitude: 40.7831,
    zoom: 12
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async (latitude: number, longitude: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
          radius: 10
        })
      });

      if (error) throw error;
      if (data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeMap = async () => {
      try {
        const { data: { MAPBOX_TOKEN }, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        
        if (MAPBOX_TOKEN && mapContainer.current) {
          mapboxgl.accessToken = MAPBOX_TOKEN;
          
          mapInstance.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom
          });
          
          // Fetch events once map is loaded
          mapInstance.current.on('load', () => {
            fetchEvents(viewState.latitude, viewState.longitude);
          });
          
          // Update events when map moves
          mapInstance.current.on('moveend', () => {
            const center = mapInstance.current?.getCenter();
            if (center) {
              fetchEvents(center.lat, center.lng);
              setViewState({
                longitude: center.lng,
                latitude: center.lat,
                zoom: mapInstance.current?.getZoom() || viewState.zoom
              });
            }
          });
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  const handleMarkerClick = (event: Event) => {
    setSelectedEvent(event);
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50"
      />
      
      {mapInstance.current && (
        <>
          <MapControls map={mapInstance.current} />
          <MapMarkers 
            map={mapInstance.current}
            events={events}
            onMarkerClick={handleMarkerClick}
          />
          {selectedEvent && (
            <MapPopup
              map={mapInstance.current}
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onViewDetails={() => onEventSelect?.(selectedEvent)}
            />
          )}
        </>
      )}
      
      <CoordinatesDisplay
        longitude={viewState.longitude}
        latitude={viewState.latitude}
        zoom={viewState.zoom}
      />
    </div>
  );
};

export default MapComponent;
