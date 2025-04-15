
import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

// In a real app, this would be in an env variable
// Using a public token for this demo as we're showing map tiles only
const MAPBOX_TOKEN = 'pk.eyJ1Ijoiam9obi1zbWlsZ2EiLCJhIjoiY2p1dDB3bDR5MGJwcTQzcGJ2YWV6MnJjaiJ9.Q2H-8kXgHSuHcbYfDO4qjQ';

interface MapComponentProps {
  onEventSelect?: (event: any) => void;
}

const MapComponent = ({ onEventSelect }: MapComponentProps = {}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [lng, setLng] = useState(-73.9712);
  const [lat, setLat] = useState(40.7831);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    // Wait for window to be defined (client-side)
    if (typeof window === 'undefined' || !mapContainer.current || mapInstance.current) return;

    // Dynamically import mapbox-gl
    const initializeMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        
        // Set access token
        (mapboxgl as any).default.accessToken = MAPBOX_TOKEN;
        
        // Initialize map
        const map = new (mapboxgl as any).default.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [lng, lat],
          zoom: zoom
        });
        
        mapInstance.current = map;

        // Add map movement event listener
        map.on('move', () => {
          const center = map.getCenter();
          setLng(parseFloat(center.lng.toFixed(4)));
          setLat(parseFloat(center.lat.toFixed(4)));
          setZoom(parseFloat(map.getZoom().toFixed(2)));
        });

        // Add navigation controls
        const NavigationControl = (mapboxgl as any).default.NavigationControl;
        map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');

        // Add search box placeholder
        const searchBox = document.createElement('div');
        searchBox.className = 'absolute top-4 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded-md flex items-center p-2 shadow-md w-96 max-w-[90%]';
        searchBox.innerHTML = `
          <input type="text" placeholder="New York" class="bg-transparent border-none outline-none flex-1 text-sm" />
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m21 21-6.05-6.05m0 0a7 7 0 1 0-9.9-9.9 7 7 0 0 0 9.9 9.9Z"/></svg>
        `;
        mapContainer.current.appendChild(searchBox);

        // Add mock event markers
        const mockEvents = [
          { lng: -73.9712, lat: 40.7831, title: 'Madison Square Garden Event', category: 'music' },
          { lng: -73.9653, lat: 40.7799, title: 'Times Square Concert', category: 'music' },
          { lng: -73.9844, lat: 40.7484, title: 'Chelsea Gallery Opening', category: 'arts' },
          { lng: -73.9947, lat: 40.7359, title: 'Greenwich Village Festival', category: 'festival' }
        ];

        const Marker = (mapboxgl as any).default.Marker;
        const Popup = (mapboxgl as any).default.Popup;

        mockEvents.forEach(event => {
          // Create a DOM element for the marker
          const el = document.createElement('div');
          el.className = 'map-marker';
          
          // Add the marker to the map
          const marker = new Marker(el)
            .setLngLat([event.lng, event.lat])
            .setPopup(
              new Popup({ offset: 25, closeButton: true, closeOnClick: true })
                .setHTML(`
                  <div>
                    <h3 class="font-semibold text-sm mb-1">${event.title}</h3>
                    <div class="text-xs text-muted-foreground mb-2">
                      Category: ${event.category}
                    </div>
                    <button class="text-xs bg-primary text-white px-2 py-1 rounded-sm view-details-btn" data-event-id="${event.title}">
                      View Details
                    </button>
                  </div>
                `)
            )
            .addTo(map);
            
          // Handle popup details button click
          marker.getPopup().on('open', () => {
            setTimeout(() => {
              const detailsBtn = document.querySelector(`.view-details-btn[data-event-id="${event.title}"]`);
              if (detailsBtn) {
                detailsBtn.addEventListener('click', () => {
                  if (onEventSelect) {
                    // Create a mock event for the detail view
                    onEventSelect({
                      id: event.title.toLowerCase().replace(/\s+/g, '-'),
                      title: event.title,
                      description: `This is a sample description for ${event.title}. In a real application, this would contain detailed information about the event.`,
                      date: 'Apr 25, 2025',
                      time: '7:00 PM',
                      location: `${event.title.split(' ')[0]} Venue, New York`,
                      category: event.category,
                      image: '/lovable-uploads/abdea098-9a65-4c79-8fad-c2ad27c07525.png'
                    });
                  }
                });
              }
            }, 100); // Short delay to ensure DOM is ready
          });
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();
    
    // Cleanup function
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // Empty dependency array so this only runs once

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-md p-2 text-xs">
        <div>
          <span className="text-muted-foreground">Longitude:</span> {lng}
        </div>
        <div>
          <span className="text-muted-foreground">Latitude:</span> {lat}
        </div>
        <div>
          <span className="text-muted-foreground">Zoom:</span> {zoom}
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
