import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { EventMarker } from './markers/EventMarker';
import { EventPopup } from './popups/EventPopup';

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
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom
          });
          
          // Add navigation controls
          map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
          
          // Fetch events once map is loaded
          map.current.on('load', () => {
            fetchEvents(viewState.latitude, viewState.longitude);
          });
          
          // Update events when map moves
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
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Add markers for events
    if (map.current && events.length > 0) {
      // Remove existing markers
      const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
      existingMarkers.forEach(marker => marker.remove());

      // Add markers for each event
      events.forEach(event => {
        if (!event.coordinates) return;
        
        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'mapboxgl-marker';
        
        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([event.coordinates[0], event.coordinates[1]])
          .addTo(map.current!);
        
        markerEl.addEventListener('click', () => {
          setSelectedEvent(event);
          if (onEventSelect) {
            onEventSelect(event);
          }
        });
      });
    }
  }, [events, onEventSelect]);

  useEffect(() => {
    // Add popup for selected event
    if (map.current && selectedEvent && selectedEvent.coordinates) {
      const popupEl = document.createElement('div');
      popupEl.className = 'p-2 max-w-[200px]';
      popupEl.innerHTML = `
        <h3 class="font-semibold text-sm mb-1">${selectedEvent.title}</h3>
        <div class="text-xs text-muted-foreground mb-2">
          Category: ${selectedEvent.category}
        </div>
        <button class="w-full px-4 py-2 text-xs bg-primary text-white rounded-md">
          View Details
        </button>
      `;
      
      const popup = new mapboxgl.Popup()
        .setLngLat([selectedEvent.coordinates[0], selectedEvent.coordinates[1]])
        .setHTML(popupEl.outerHTML)
        .addTo(map.current);
      
      // Cleanup
      return () => {
        popup.remove();
      };
    }
  }, [selectedEvent, onEventSelect]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50"
      />
      
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
