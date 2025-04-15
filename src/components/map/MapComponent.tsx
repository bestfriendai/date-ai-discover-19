
import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { MapControls } from './components/MapControls';
import { MapMarkers } from './components/MapMarkers';
import { MapPopup } from './components/MapPopup';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { toast } from '@/hooks/use-toast';

interface MapComponentProps {
  onEventSelect?: (event: Event) => void;
}

const MapComponent = ({ onEventSelect }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -73.9712,
    latitude: 40.7831,
    zoom: 12
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);

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
      if (data?.events) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = async (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  useEffect(() => {
    const initializeMap = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        
        if (data?.MAPBOX_TOKEN && mapContainer.current) {
          mapboxgl.accessToken = data.MAPBOX_TOKEN;
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom
          });

          try {
            const [longitude, latitude] = await getUserLocation();
            
            if (userMarker) userMarker.remove();
            
            // Create a new marker for user location with green color
            const marker = new mapboxgl.Marker({ color: '#10b981' })
              .setLngLat([longitude, latitude])
              .addTo(map.current);
            setUserMarker(marker);

            // Use easeTo instead of flyTo for compatibility
            map.current.easeTo({
              center: [longitude, latitude],
              zoom: 14,
              duration: 2000,
              essential: true
            });

            setViewState({ longitude, latitude, zoom: 14 });
            fetchEvents(latitude, longitude);
          } catch (locationError) {
            console.error('Location error:', locationError);
            toast({
              title: "Location Access Denied",
              description: "Using default location. Please enable location access for a better experience.",
              variant: "destructive",
            });
            fetchEvents(viewState.latitude, viewState.longitude);
          }
          
          map.current.on('load', () => {
            fetchEvents(viewState.latitude, viewState.longitude);
          });
          
          map.current.on('moveend', () => {
            const center = map.current?.getCenter();
            if (center) {
              fetchEvents(center.lat, center.lng);
              setViewState({
                longitude: center.lng,
                latitude: center.lat,
                zoom: map.current?.getZoom() || viewState.zoom
              });
            }
          });
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Map Error",
          description: "Failed to initialize map. Please try again later.",
          variant: "destructive",
        });
      }
    };

    initializeMap();

    return () => {
      userMarker?.remove();
      map.current?.remove();
    };
  }, []);

  const handleEventSelect = (event: Event) => {
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
      
      {map.current && (
        <>
          <MapControls map={map.current} />
          <MapMarkers 
            map={map.current}
            events={events}
            onMarkerClick={handleEventSelect}
          />
          {selectedEvent && (
            <MapPopup
              map={map.current}
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
