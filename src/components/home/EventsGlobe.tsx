import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { useTheme } from '../../hooks/use-theme';
import { motion } from 'framer-motion'; // Import motion

interface EventsGlobeProps {
  // Array of event locations as [longitude, latitude]
  eventLocations?: [number, number][];
  size?: number;
  className?: string;
}

// Generate 50+ event locations around the world
const generateEventLocations = (): [number, number][] => {
  // Start with some known major cities
  const majorCities: [number, number][] = [
    [-73.9857, 40.7484], // New York
    [-0.1278, 51.5074], // London
    [2.3522, 48.8566], // Paris
    [139.6917, 35.6895], // Tokyo
    [-118.2437, 34.0522], // Los Angeles
    [37.6173, 55.7558], // Moscow
    [28.9784, 41.0082], // Istanbul
    [77.1025, 28.7041], // New Delhi
    [121.4737, 31.2304], // Shanghai
    [-43.1729, -22.9068], // Rio de Janeiro
    [18.4241, -33.9249], // Cape Town
    [151.2093, -33.8688], // Sydney
    [-46.6333, -23.5505], // São Paulo
    [55.2708, 25.2048], // Dubai
    [-3.7038, 40.4168], // Madrid
    [30.5234, 50.4501], // Kyiv
    [100.5018, 13.7563], // Bangkok
    [-79.3832, 43.6532], // Toronto
    [114.1095, 22.3964], // Hong Kong
    [103.8198, 1.3521], // Singapore
    [13.4050, 52.5200], // Berlin
    [12.4964, 41.9028], // Rome
    [4.9041, 52.3676], // Amsterdam
    [-58.3816, -34.6037], // Buenos Aires
    [31.2357, 30.0444], // Cairo
  ];

  // Add more randomly generated locations
  const randomLocations: [number, number][] = [];
  for (let i = 0; i < 50; i++) {
    // Generate random lat/long (-180 to 180 for long, -85 to 85 for lat to avoid poles)
    const long = (Math.random() * 360 - 180);
    const lat = (Math.random() * 170 - 85);
    randomLocations.push([long, lat]);
  }

  return [...majorCities, ...randomLocations];
};

const DEFAULT_EVENT_LOCATIONS = generateEventLocations();

// Colors for different types of events
const EVENT_MARKER_COLORS: [number, number, number][] = [
  [0.4, 0.7, 1.0], // Blue (music) - brighter indigo
  [1.0, 0.5, 0.9], // Pink (arts) - brighter pink
  [0.4, 1.0, 0.6], // Green (sports) - brighter emerald
  [1.0, 0.9, 0.4], // Yellow (family) - brighter amber
  [1.0, 0.7, 0.4], // Orange (food) - brighter orange
  [0.9, 0.5, 1.0], // Purple (party) - brighter violet
];

export function EventsGlobe({ eventLocations = DEFAULT_EVENT_LOCATIONS, size = 450, className = '' }: EventsGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const locationToAngles = (lat: number, long: number) => {
    return [Math.PI - ((long * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
  };
  const focusRef = useRef([0, 0]);
  const [r, setR] = useState(0); // State for zoom level (0 = default, >0 zoomed in)

  useEffect(() => {
    let currentPhi = 0;
    let currentTheta = 0.3;
    let width = 0;

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: window.devicePixelRatio || 2,
      width: size * 2,
      height: size * 2,
      phi: currentPhi,
      theta: currentTheta,
      dark: theme === 'dark' ? 1 : 0,
      diffuse: theme === 'dark' ? 1.5 : 2.0, // Adjust diffuse based on theme
      mapSamples: 24000, // Slightly reduced for performance
      mapBrightness: theme === 'dark' ? 5 : 3.5, // Adjust brightness for theme
      baseColor: theme === 'dark' ? [0.15, 0.15, 0.35] : [0.8, 0.8, 0.95], // Dark/Light base
      markerColor: [1.0, 0.5, 0.9], // Consistent marker color base (can be overridden) - Adjusted to brighter pink/purple
      glowColor: theme === 'dark' ? [0.2, 0.2, 0.4] : [0.7, 0.7, 0.9], // Dark/Light glow
      markers: eventLocations.map((location) => {
        // Add a bit of randomness to marker colors and sizes
        const colorIndex = Math.floor(Math.random() * EVENT_MARKER_COLORS.length);
        const willPulse = Math.random() > 0.85; // Only a few markers will pulse
        return {
          location,
          size: Math.random() * 0.06 + 0.03, // Slightly adjusted size range
          color: EVENT_MARKER_COLORS[colorIndex],
          willPulse,
        };
      }),
      onRender: (state) => {
        // Update marker sizes for pulsing effect
        state.markers.forEach((marker: any) => {
          if (marker.willPulse) {
            marker.size = Math.abs(Math.sin(Date.now() * 0.0015 + marker.location[0])) * 0.06 + 0.04;
          }
        });

        // Handle rotation and interaction
        if (!isInteracting) {
          // Auto-rotation
          currentPhi += 0.002;
          currentTheta = 0.3 + Math.sin(currentPhi * 0.5) * 0.1; // Gentle up/down motion
        } else if (pointerInteracting.current !== null) {
          // Manual rotation based on drag
          const delta = pointerInteractionMovement.current;
          currentPhi += delta / 200; // Adjust sensitivity as needed
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
      const newR = r + e.deltaY * 0.0005; // Adjust zoom sensitivity
      setR(Math.max(0, Math.min(1.5, newR))); // Clamp zoom level (0 to 1.5)
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
    <motion.div // Wrap in motion.div for potential future animations
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent filter blur-xl"></div>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, aspectRatio: "1", cursor: 'grab' }}
        width={size * 2}
        height={size * 2}
        className="z-10 relative rounded-full"
      />
      {/* Optional: add a subtle inner shadow or glow? */}
      {/* <div className="absolute inset-0 rounded-full shadow-inner shadow-black/20 pointer-events-none z-15"></div> */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80 pointer-events-none z-20 rounded-full"></div>
      <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-blue-300/60 pointer-events-none">
        <span>Drag to rotate • Scroll to zoom</span>
      </div>
    </motion.div>
  );
}
