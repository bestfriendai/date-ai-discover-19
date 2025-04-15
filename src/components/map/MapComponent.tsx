import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Compass, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';

interface MapComponentProps {
  onEventSelect?: (event: Event) => void;
}

const MapComponent = ({ onEventSelect }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [lng, setLng] = useState(-73.9712);
  const [lat, setLat] = useState(40.7831);
  const [zoom, setZoom] = useState(12);
  const [events, setEvents] = useState<Event[]>([]);
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
        addEventMarkers(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEventMarkers = (events: Event[]) => {
    if (!mapInstance.current) return;

    const existingMarkers = document.querySelectorAll('.map-marker');
    existingMarkers.forEach(marker => marker.remove());

    events.forEach(event => {
      if (!event.coordinates) return;

      const el = document.createElement('div');
      el.className = 'map-marker';
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat(event.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: true })
            .setHTML(`
              <div>
                <h3 class="font-semibold text-sm mb-1">${event.title}</h3>
                <div class="text-xs text-muted-foreground mb-2">
                  Category: ${event.category}
                </div>
                <button class="text-xs bg-primary text-white px-2 py-1 rounded-sm view-details-btn" data-event-id="${event.id}">
                  View Details
                </button>
              </div>
            `)
        )
        .addTo(mapInstance.current);
        
      marker.getPopup().on('open', () => {
        setTimeout(() => {
          const detailsBtn = document.querySelector(`.view-details-btn[data-event-id="${event.id}"]`);
          if (detailsBtn) {
            detailsBtn.addEventListener('click', () => {
              if (onEventSelect) {
                const selectedEvent = events.find(e => e.id === event.id);
                if (selectedEvent) {
                  onEventSelect(selectedEvent);
                }
              }
            });
          }
        }, 100);
      });
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainer.current || mapInstance.current) return;

    const initializeMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        const { data: { MAPBOX_TOKEN }, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) throw error;
        
        mapboxgl.accessToken = MAPBOX_TOKEN;
        
        const map = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [lng, lat],
          zoom: zoom
        });
        
        mapInstance.current = map;

        map.on('move', () => {
          const center = map.getCenter();
          setLng(parseFloat(center.lng.toFixed(4)));
          setLat(parseFloat(center.lat.toFixed(4)));
          setZoom(parseFloat(map.getZoom().toFixed(2)));
        });

        map.on('moveend', () => {
          const center = map.getCenter();
          fetchEvents(center.lat, center.lng);
        });

        const NavigationControl = mapboxgl.NavigationControl;
        map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');

        fetchEvents(lat, lng);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/50" />
      
      <div className="absolute right-4 bottom-24 flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background/80 backdrop-blur-lg rounded-lg p-1.5 border border-border/50 shadow-lg"
        >
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="h-px bg-border/50 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-background/80 backdrop-blur-lg rounded-lg p-1.5 border border-border/50 shadow-lg"
        >
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Compass className="h-4 w-4" />
            </Button>
            <div className="h-px bg-border/50 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-lg rounded-lg p-3 text-xs space-y-1 border border-border/50 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Longitude:</span>
          <span className="font-medium">{lng.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Latitude:</span>
          <span className="font-medium">{lat.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Zoom:</span>
          <span className="font-medium">{zoom.toFixed(2)}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default MapComponent;
