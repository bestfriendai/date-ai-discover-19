import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { useTheme } from '../../hooks/use-theme';
import { motion } from 'framer-motion'; // Import motion

interface EventsGlobeProps {
  // Array of event locations as [longitude, latitude]
  eventLocations: [number, number][]; // Make eventLocations required
  size?: number;
  className?: string;
}

// Colors for different types of events
const EVENT_MARKER_COLORS: [number, number, number][] = [
  [0.4, 0.7, 1.0], // Blue (music) - brighter indigo
  [1.0, 0.5, 0.9], // Pink (arts) - brighter pink
  [0.4, 1.0, 0.6], // Green (sports) - brighter emerald
  [1.0, 0.9, 0.4], // Yellow (family) - brighter amber
  [1.0, 0.7, 0.4], // Orange (food) - brighter orange
  [0.9, 0.5, 1.0], // Purple (party) - brighter violet
];

// Major cities around the world (focused on land areas)
const MAJOR_CITIES: [number, number][] = [
  // North America
  [-74.006, 40.7128], // New York
  [-118.2437, 34.0522], // Los Angeles
  [-87.6298, 41.8781], // Chicago
  [-79.3832, 43.6532], // Toronto
  [-123.1207, 49.2827], // Vancouver
  [-99.1332, 19.4326], // Mexico City
  [-112.0740, 33.4484], // Phoenix
  [-95.3698, 29.7604], // Houston
  [-104.9903, 39.7392], // Denver
  [-122.3321, 47.6062], // Seattle
  [-122.4194, 37.7749], // San Francisco
  [-80.1918, 25.7617], // Miami
  [-97.7431, 30.2672], // Austin
  [-86.7816, 36.1627], // Nashville
  [-94.5786, 39.0997], // Kansas City
  [-71.0589, 42.3601], // Boston
  [-75.1652, 39.9526], // Philadelphia
  [-77.0369, 38.9072], // Washington DC
  [-84.3880, 33.7490], // Atlanta
  [-115.1398, 36.1699], // Las Vegas

  // Europe
  [-0.1278, 51.5074], // London
  [2.3522, 48.8566], // Paris
  [13.4050, 52.5200], // Berlin
  [4.9041, 52.3676], // Amsterdam
  [-3.7038, 40.4168], // Madrid
  [12.4964, 41.9028], // Rome
  [19.0402, 47.4979], // Budapest
  [21.0122, 52.2297], // Warsaw
  [4.3517, 50.8503], // Brussels
  [16.3738, 48.2082], // Vienna
  [14.4378, 50.0755], // Prague
  [18.0686, 59.3293], // Stockholm
  [10.7522, 59.9139], // Oslo
  [12.5683, 55.6761], // Copenhagen
  [8.5417, 47.3769], // Zurich
  [28.9784, 41.0082], // Istanbul
  [23.7275, 37.9838], // Athens
  [30.5234, 50.4501], // Kyiv
  [37.6173, 55.7558], // Moscow
  [2.1734, 41.3851], // Barcelona

  // Asia
  [121.4737, 31.2304], // Shanghai
  [116.4074, 39.9042], // Beijing
  [139.6917, 35.6895], // Tokyo
  [126.9780, 37.5665], // Seoul
  [103.8198, 1.3521], // Singapore
  [77.2090, 28.6139], // New Delhi
  [72.8777, 19.0760], // Mumbai
  [106.8456, -6.2088], // Jakarta
  [100.5018, 13.7563], // Bangkok
  [114.1095, 22.3964], // Hong Kong
  [101.6869, 3.1390], // Kuala Lumpur
  [120.9842, 14.5995], // Manila
  [96.1956, 16.8661], // Yangon
  [104.9282, 11.5564], // Phnom Penh
  [85.3240, 27.7172], // Kathmandu
  [67.0011, 24.8607], // Karachi
  [106.6297, 10.8231], // Ho Chi Minh City
  [51.3890, 35.6892], // Tehran
  [44.3915, 33.3152], // Baghdad
  [55.2708, 25.2048], // Dubai

  // Africa
  [31.2357, 30.0444], // Cairo
  [18.4241, -33.9249], // Cape Town
  [3.3792, 6.5244], // Lagos
  [36.8219, -1.2921], // Nairobi
  [32.5599, 15.5007], // Khartoum
  [7.4898, 9.0765], // Abuja
  [13.1913, -8.8147], // Luanda
  [15.2993, -4.2634], // Kinshasa
  [30.0444, -1.9706], // Kigali
  [39.2695, -6.8235], // Dar es Salaam
  [28.0473, -26.2041], // Johannesburg
  [2.3387, 6.3703], // Cotonou
  [10.7969, 59.9139], // Dakar
  [32.5851, 0.3476], // Kampala
  [38.7578, 9.0320], // Addis Ababa

  // South America
  [-46.6333, -23.5505], // São Paulo
  [-58.3816, -34.6037], // Buenos Aires
  [-70.6693, -33.4489], // Santiago
  [-74.0721, 4.7110], // Bogotá
  [-66.9036, 10.4806], // Caracas
  [-78.4678, -0.1807], // Quito
  [-57.5759, -25.2637], // Asunción
  [-56.1645, -34.9011], // Montevideo
  [-68.1193, -16.4897], // La Paz
  [-77.0428, -12.0464], // Lima

  // Australia & Oceania
  [151.2093, -33.8688], // Sydney
  [144.9631, -37.8136], // Melbourne
  [153.0251, -27.4698], // Brisbane
  [115.8575, -31.9505], // Perth
  [174.7633, -36.8485], // Auckland
  [174.7762, -41.2924], // Wellington
  [166.4572, -22.2758], // Nouméa
  [158.1621, -6.9147], // Honiara
  [178.4419, -18.1416], // Suva

  // Additional cities for better land coverage
  [-79.9959, 40.4406], // Pittsburgh
  [-83.0458, 42.3314], // Detroit
  [-90.1994, 38.6270], // St. Louis
  [-93.2650, 44.9778], // Minneapolis
  [-114.0719, 51.0447], // Calgary
  [-123.1216, 49.2827], // Vancouver
  [-110.9265, 32.2226], // Tucson
  [-106.6504, 35.0844], // Albuquerque
  [-111.8910, 40.7608], // Salt Lake City
  [-81.3792, 28.5383], // Orlando
  [-82.4572, 27.9506], // Tampa
  [-90.0715, 29.9511], // New Orleans
  [-98.4936, 29.4241], // San Antonio
  [-117.1611, 32.7157], // San Diego

  // Additional European cities
  [11.5820, 48.1351], // Munich
  [7.4474, 43.7384], // Monaco
  [9.1900, 45.4642], // Milan
  [3.7038, 40.4168], // Madrid
  [7.6261, 45.0703], // Turin
  [11.2558, 43.7696], // Florence
  [15.9819, 45.8150], // Zagreb
  [19.0402, 47.4979], // Budapest
  [26.1025, 44.4268], // Bucharest
  [24.9384, 60.1699], // Helsinki

  // Additional Asian cities
  [113.2644, 23.1291], // Guangzhou
  [120.3380, 36.0671], // Qingdao
  [108.9402, 34.3416], // Xi'an
  [104.0665, 30.5723], // Chengdu
  [91.1710, 29.6500], // Lhasa
  [78.4867, 17.3850], // Hyderabad
  [80.2707, 13.0827], // Chennai
  [73.8567, 18.5204], // Pune
  [88.3639, 22.5726], // Kolkata
  [90.4152, 23.8103], // Dhaka

  // Additional African cities
  [2.3522, 48.8566], // Algiers
  [10.1815, 36.8065], // Tunis
  [7.9810, 36.8950], // Annaba
  [13.1913, 32.8872], // Tripoli
  [31.1342, 29.9792], // Alexandria
  [34.8516, 31.0461], // Gaza
  [35.2137, 31.7683], // Jerusalem
  [35.5018, 33.8938], // Beirut
  [36.2765, 33.5138], // Damascus
  [47.4818, 29.3117], // Kuwait City
];

export function EventsGlobe({ eventLocations, size = 450, className = '' }: EventsGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  // Removed unused locationToAngles and focusRef
  const [r, setR] = useState(eventLocations.length > 0 ? 0.7 : 0.4);
  const [isZoomedIn, setIsZoomedIn] = useState(eventLocations.length > 0);

  // Effect to automatically zoom out after a delay with smoother animation
  useEffect(() => {
    if (isZoomedIn && eventLocations.length > 0) {
      // Wait 4 seconds before zooming out (longer viewing time)
      const timer = setTimeout(() => {
        setIsZoomedIn(false);

        // Smoother zoom out animation with easing
        let startTime: number | null = null;
        const startR = r;
        const targetR = 0.4; // Target zoom level (not fully zoomed out)
        const duration = 2000; // Animation duration in ms (2 seconds)

        const zoomOutAnimation = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1); // Clamp to 1

          // Easing function: cubic ease-out for smoother deceleration
          const easeOut = 1 - Math.pow(1 - progress, 3);

          // Calculate new zoom level with easing
          const newR = startR - ((startR - targetR) * easeOut);
          setR(newR);

          if (progress < 1) {
            requestAnimationFrame(zoomOutAnimation);
          }
        };

        requestAnimationFrame(zoomOutAnimation);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isZoomedIn, eventLocations, r]);

  // Update zoom level when eventLocations changes
  useEffect(() => {
    if (eventLocations.length === 0) {
      // If no events, set a medium zoom level to show more of the globe
      setR(0.4);
      setIsZoomedIn(false);
    } else if (!isZoomedIn) {
      // If we have events but aren't zoomed in, zoom in but not too close
      setR(0.7);
      setIsZoomedIn(true);
    }
  }, [eventLocations, isZoomedIn]);

  useEffect(() => {
    let currentPhi = 0;
    let currentTheta = 0.3;
    let width = 0;

    const globe = createGlobe(canvasRef.current!, {
      // Use a fixed devicePixelRatio for consistent rendering
      devicePixelRatio: 2.0, // Increased for better quality
      width: size * 2,
      height: size * 2,
      phi: currentPhi,
      theta: currentTheta,
      dark: theme === 'dark' ? 1 : 0,
      diffuse: theme === 'dark' ? 1.8 : 2.2, // Increased diffuse for better visibility
      mapSamples: 20000, // Increased for better quality
      mapBrightness: theme === 'dark' ? 7 : 5, // Increased brightness for better visibility
      baseColor: theme === 'dark' ? [0.1, 0.1, 0.3] : [0.8, 0.8, 0.95], // Adjusted Dark/Light base
      markerColor: [1.0, 0.5, 0.9], // Consistent marker color base
      glowColor: theme === 'dark' ? [0.4, 0.4, 0.7] : [0.7, 0.7, 0.9], // Enhanced glow
      markers: eventLocations.length > 0
        ? [
            // Include actual event locations
            ...eventLocations.map((location) => {
              // Add a bit of randomness to marker colors and sizes
              const colorIndex = Math.floor(Math.random() * EVENT_MARKER_COLORS.length);
              const willPulse = Math.random() > 0.7; // Increase number of pulsing markers
              return {
                location,
                size: Math.random() * 0.07 + 0.04, // Slightly larger size range
                color: EVENT_MARKER_COLORS[colorIndex],
                willPulse,
              };
            }),
            // Add major cities markers to fill in land areas
            ...MAJOR_CITIES.map((location) => {
              // Only add if not too close to an existing event location
              const colorIndex = Math.floor(Math.random() * EVENT_MARKER_COLORS.length);
              const willPulse = Math.random() > 0.6; // More pulsing for major cities
              return {
                location,
                size: Math.random() * 0.05 + 0.02, // Slightly smaller for background cities
                color: EVENT_MARKER_COLORS[colorIndex],
                willPulse,
              };
            })
          ]
        : [
            // If no events, show all major cities
            ...MAJOR_CITIES.map((location) => {
              const colorIndex = Math.floor(Math.random() * EVENT_MARKER_COLORS.length);
              const willPulse = Math.random() > 0.5; // More pulsing when no events
              return {
                location,
                size: Math.random() * 0.06 + 0.03,
                color: EVENT_MARKER_COLORS[colorIndex],
                willPulse,
              };
            })
          ],
      onRender: (state) => {
        // Update marker sizes for pulsing effect
        if (state.markers) { // Add check for state.markers
          state.markers.forEach((marker: any) => {
            if (marker.willPulse) {
              // More dynamic pulsing with varied frequencies based on location
              const pulseSpeed = 0.0015 + (Math.abs(marker.location[1]) * 0.0001); // Vary speed based on latitude
              const pulseRange = 0.06 + (Math.abs(marker.location[0]) * 0.0002); // Vary range based on longitude
              const baseSize = 0.04 + (Math.random() * 0.01); // Slight randomness in base size

              marker.size = Math.abs(Math.sin(Date.now() * pulseSpeed + marker.location[0])) * pulseRange + baseSize;
            }
          });
        }

        // Handle rotation and interaction
        if (!isInteracting) {
          // Enhanced auto-rotation with varied speed and more interesting motion
          const time = Date.now() * 0.001; // Current time in seconds for animation
          const baseSpeed = 0.0015; // Base rotation speed
          const speedVariation = Math.sin(time * 0.1) * 0.0005; // Speed varies slightly over time

          // Combine base speed with variation for more natural movement
          currentPhi += baseSpeed + speedVariation;

          // More complex up/down motion with multiple sine waves
          const primaryWave = Math.sin(currentPhi * 0.5) * 0.08;
          const secondaryWave = Math.sin(currentPhi * 0.2) * 0.03;
          currentTheta = 0.3 + primaryWave + secondaryWave; // Combined gentle motion
        } else if (pointerInteracting.current !== null) {
          // Manual rotation based on drag with improved sensitivity
          const delta = pointerInteractionMovement.current;
          currentPhi += delta / 180; // Slightly increased sensitivity
          pointerInteractionMovement.current = 0; // Reset movement after applying
        }

        state.phi = currentPhi;
        state.theta = currentTheta;
        state.r = r; // Apply zoom state

        // Update width if needed (for resizing)
        if (canvasRef.current && width !== canvasRef.current.offsetWidth) {
          width = canvasRef.current.offsetWidth;
        }
      }
    });

    const onWheel = (e: WheelEvent) => {
      if (!canvasRef.current?.contains(e.target as Node)) return; // Only zoom if wheel is over canvas
      e.preventDefault();

      // Improved zoom sensitivity with smoother feel
      const zoomFactor = 0.0004; // Slightly reduced for finer control
      const minZoom = 0.1; // Minimum zoom level (not fully zoomed in)
      const maxZoom = 1.2; // Maximum zoom level (not fully zoomed out)

      // Apply zoom with smoothing factor
      const newR = r + e.deltaY * zoomFactor;
      setR(Math.max(minZoom, Math.min(maxZoom, newR))); // Clamp zoom level
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!canvasRef.current?.contains(e.target as Node)) return;
      pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
      canvasRef.current!.style.cursor = 'grabbing';
      setIsInteracting(true);
    };

    const onPointerUp = () => {
      pointerInteracting.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      setIsInteracting(false);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        pointerInteractionMovement.current = e.clientX - pointerInteracting.current;
        // No need to update state here, onRender reads the ref
      }
    };

    // Add event listeners for interactivity
    if (canvasRef.current) {
      canvasRef.current.addEventListener('wheel', onWheel, { passive: false });
      canvasRef.current.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointermove', onPointerMove);
    }

    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('wheel', onWheel);
        canvasRef.current.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointermove', onPointerMove);
      }
      globe.destroy();
    };
  }, [theme, size, eventLocations, isInteracting, r]); // Dependency on r for zoom

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: '100%',
        maxHeight: '100%',
        background: 'transparent',
        overflow: 'visible',
        borderRadius: 0,
        boxShadow: '0 8px 40px 0 rgba(31,38,135,0.17)'
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Globe Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          background: 'transparent',
          zIndex: 1,
          borderRadius: 0,
          overflow: 'visible',
        }}
        width={size * 2}
        height={size * 2}
      />
      {/* Overlay gradient (optional, can be removed for full globe) */}
      {/* Instructions */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-blue-300/60 pointer-events-none" style={{ zIndex: 3 }}>
        <span>Drag to rotate • Scroll to zoom</span>
      </div>
    </motion.div>
  );
}
