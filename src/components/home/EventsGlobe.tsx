import React, { useEffect, useRef, useState } from 'react';
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

export function EventsGlobe({ eventLocations, size = 450, className = '' }: EventsGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const locationToAngles = (lat: number, long: number) => {
    return [Math.PI - ((long * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
  };
  const focusRef = useRef([0, 0]);
  // Start with a lower zoom level if there are no events
  const [r, setR] = useState(eventLocations.length > 0 ? 0.8 : 0.3);
  const [isZoomedIn, setIsZoomedIn] = useState(eventLocations.length > 0); // Only start zoomed in if we have events

  // Effect to automatically zoom out after a delay
  useEffect(() => {
    if (isZoomedIn && eventLocations.length > 0) {
      // Wait 3 seconds before zooming out
      const timer = setTimeout(() => {
        setIsZoomedIn(false);
        // Gradually zoom out
        const zoomOutAnimation = () => {
          setR((prevR) => {
            const newR = prevR - 0.05;
            if (newR <= 0) {
              return 0; // Fully zoomed out
            }
            requestAnimationFrame(zoomOutAnimation);
            return newR;
          });
        };
        requestAnimationFrame(zoomOutAnimation);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isZoomedIn, eventLocations]);

  // Update zoom level when eventLocations changes
  useEffect(() => {
    if (eventLocations.length === 0) {
      // If no events, set a lower zoom level
      setR(0.3);
      setIsZoomedIn(false);
    } else if (!isZoomedIn) {
      // If we have events but aren't zoomed in, zoom in
      setR(0.8);
      setIsZoomedIn(true);
    }
  }, [eventLocations, isZoomedIn]);

  useEffect(() => {
    let currentPhi = 0;
    let currentTheta = 0.3;
    let width = 0;

    const globe = createGlobe(canvasRef.current!, {
      // Cap devicePixelRatio to 1.5 to ensure compatibility with more devices
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      width: size * 2,
      height: size * 2,
      phi: currentPhi,
      theta: currentTheta,
      dark: theme === 'dark' ? 1 : 0,
      diffuse: theme === 'dark' ? 1.5 : 2.0, // Adjust diffuse based on theme
      mapSamples: 16000, // Reduced for better performance
      mapBrightness: theme === 'dark' ? 5 : 3.5, // Adjust brightness for theme
      baseColor: theme === 'dark' ? [0.15, 0.15, 0.35] : [0.8, 0.8, 0.95], // Dark/Light base
      markerColor: [1.0, 0.5, 0.9], // Consistent marker color base (can be overridden) - Adjusted to brighter pink/purple
      glowColor: theme === 'dark' ? [0.2, 0.2, 0.4] : [0.7, 0.7, 0.9], // Dark/Light glow
      markers: eventLocations.length > 0
        ? eventLocations.map((location) => {
            // Add a bit of randomness to marker colors and sizes
            const colorIndex = Math.floor(Math.random() * EVENT_MARKER_COLORS.length);
            const willPulse = Math.random() > 0.85; // Only a few markers will pulse
            return {
              location,
              size: Math.random() * 0.06 + 0.03, // Slightly adjusted size range
              color: EVENT_MARKER_COLORS[colorIndex],
              willPulse,
            };
          })
        : [
            // Add a default marker at the center if there are no events
            {
              location: [0, 0],
              size: 0.05,
              color: EVENT_MARKER_COLORS[0], // Use the first color from the EVENT_MARKER_COLORS array
              willPulse: true,
            }
          ],
      onRender: (state) => {
        // Update marker sizes for pulsing effect
        if (state.markers) { // Add check for state.markers
          state.markers.forEach((marker: any) => {
            if (marker.willPulse) {
              marker.size = Math.abs(Math.sin(Date.now() * 0.0015 + marker.location[0])) * 0.06 + 0.04;
            }
          });
        }

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
      className={`relative w-full h-full flex items-center justify-center ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent filter blur-xl"></div>
      
      {/* Canvas container to ensure proper centering */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
        <canvas
          ref={canvasRef}
          style={{
            width: size,
            height: size,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            cursor: 'grab'
          }}
          width={size * 2}
          height={size * 2}
          className="rounded-full"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80 pointer-events-none rounded-full"></div>
        
        {/* Instructions */}
        <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-blue-300/60 pointer-events-none">
          <span>Drag to rotate • Scroll to zoom</span>
        </div>
      </div>
    </motion.div>
  );
}
