
import { useRef, useEffect, useState } from 'react';
import Map, { 
  Marker, 
  Popup, 
  NavigationControl,
  FullscreenControl,
  Source,
  Layer,
  MapRef
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Compass, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { EventMarker } from './markers/EventMarker';
import { EventPopup } from './popups/EventPopup';

interface MapComponentProps {
  onEventSelect?: (event: Event) => void;
}

const MapComponent = ({ onEventSelect }: MapComponentProps) => {
  const mapRef = useRef<MapRef>(null);
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
        
        if (MAPBOX_TOKEN) {
          fetchEvents(viewState.latitude, viewState.longitude);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();
  }, []);

  const handleMarkerClick = (event: Event) => {
    setSelectedEvent(event);
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  const handleMapMove = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    fetchEvents(center.lat, center.lng);
  };

  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onMoveEnd={handleMapMove}
        >
          <NavigationControl position="bottom-right" />
          <FullscreenControl position="bottom-right" />

          {events.map((event) => (
            <Marker
              key={event.id}
              longitude={event.coordinates?.[0] || 0}
              latitude={event.coordinates?.[1] || 0}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(event);
              }}
            >
              <EventMarker event={event} />
            </Marker>
          ))}

          {selectedEvent && selectedEvent.coordinates && (
            <Popup
              longitude={selectedEvent.coordinates[0]}
              latitude={selectedEvent.coordinates[1]}
              anchor="bottom"
              onClose={() => setSelectedEvent(null)}
            >
              <EventPopup 
                event={selectedEvent}
                onViewDetails={() => onEventSelect?.(selectedEvent)}
              />
            </Popup>
          )}
        </Map>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-lg rounded-lg p-3 text-xs space-y-1 border border-border/50 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Longitude:</span>
          <span className="font-medium">{viewState.longitude.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Latitude:</span>
          <span className="font-medium">{viewState.latitude.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Zoom:</span>
          <span className="font-medium">{viewState.zoom.toFixed(2)}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default MapComponent;
