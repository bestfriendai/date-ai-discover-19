import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types';

// Define marker colors for different event categories
const CATEGORY_COLORS: Record<string, string> = {
  'music': '#e91e63', // Pink
  'sports': '#4caf50', // Green
  'arts': '#9c27b0', // Purple
  'food': '#ff9800', // Orange
  'nightlife': '#673ab7', // Deep Purple
  'outdoors': '#2196f3', // Blue
  'family': '#8bc34a', // Light Green
  'business': '#607d8b', // Blue Grey
  'default': '#3b82f6', // Default Blue
};

/**
 * Creates a marker element with styling based on event category
 */
export const createMarkerElement = (event: Event, onClick: () => void): HTMLDivElement => {
  // Determine category and color
  const category = event.category?.toLowerCase() || 'default';
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

  // Create marker container
  const container = document.createElement('div');
  container.className = 'event-marker-container';
  container.setAttribute('data-event-id', event.id);
  container.setAttribute('data-category', category);

  // Create marker dot
  const dot = document.createElement('div');
  dot.className = 'event-marker-dot';

  // Apply styles to container
  container.style.position = 'relative';
  container.style.width = '30px';
  container.style.height = '30px';
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.cursor = 'pointer';
  container.style.transition = 'transform 0.2s ease-in-out';

  // Apply styles to dot
  dot.style.width = '16px';
  dot.style.height = '16px';
  dot.style.borderRadius = '50%';
  dot.style.backgroundColor = color;
  dot.style.border = '2px solid white';
  dot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

  // Add pulse effect
  const pulse = document.createElement('div');
  pulse.className = 'event-marker-pulse';
  pulse.style.position = 'absolute';
  pulse.style.width = '30px';
  pulse.style.height = '30px';
  pulse.style.borderRadius = '50%';
  pulse.style.backgroundColor = color;
  pulse.style.opacity = '0.4';
  pulse.style.transform = 'scale(0.8)';
  pulse.style.zIndex = '-1';

  // Add hover effect
  container.addEventListener('mouseenter', () => {
    container.style.transform = 'scale(1.2)';
    pulse.style.animation = 'pulse 1.5s infinite';
  });

  container.addEventListener('mouseleave', () => {
    container.style.transform = 'scale(1)';
    pulse.style.animation = 'none';
  });

  // Add click handler
  container.addEventListener('click', onClick);

  // Assemble the marker
  container.appendChild(pulse);
  container.appendChild(dot);

  return container;
};

/**
 * Creates a cluster marker element
 */
export const createClusterMarkerElement = (count: number, onClick: () => void): HTMLDivElement => {
  // Create cluster container
  const container = document.createElement('div');
  container.className = 'cluster-marker-container';

  // Create inner circle
  const inner = document.createElement('div');
  inner.className = 'cluster-marker-inner';

  // Calculate size based on count
  const size = Math.min(Math.max(35, count * 3 + 30), 70);

  // Apply styles to container
  container.style.position = 'relative';
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.cursor = 'pointer';
  container.style.transition = 'transform 0.2s ease-in-out';

  // Apply styles to inner circle
  inner.style.width = `${size - 10}px`;
  inner.style.height = `${size - 10}px`;
  inner.style.borderRadius = '50%';
  inner.style.backgroundColor = '#1e40af';
  inner.style.border = '3px solid white';
  inner.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
  inner.style.color = 'white';
  inner.style.display = 'flex';
  inner.style.justifyContent = 'center';
  inner.style.alignItems = 'center';
  inner.style.fontWeight = 'bold';
  inner.style.fontSize = `${Math.min(16 + count / 10, 22)}px`;
  inner.textContent = count.toString();

  // Add outer ring
  const ring = document.createElement('div');
  ring.className = 'cluster-marker-ring';
  ring.style.position = 'absolute';
  ring.style.width = '100%';
  ring.style.height = '100%';
  ring.style.borderRadius = '50%';
  ring.style.border = '2px solid #1e40af';
  ring.style.opacity = '0.5';
  ring.style.zIndex = '-1';

  // Add hover effect
  container.addEventListener('mouseenter', () => {
    container.style.transform = 'scale(1.1)';
    ring.style.animation = 'pulse-ring 1.5s infinite';
  });

  container.addEventListener('mouseleave', () => {
    container.style.transform = 'scale(1)';
    ring.style.animation = 'none';
  });

  // Add click handler
  container.addEventListener('click', onClick);

  // Assemble the marker
  container.appendChild(ring);
  container.appendChild(inner);

  return container;
};

/**
 * Creates and adds a marker to the map
 */
export const addEventMarker = (
  map: mapboxgl.Map,
  event: Event,
  onEventSelect: (event: Event) => void
): mapboxgl.Marker | null => {
  if (!event.coordinates || event.coordinates.length !== 2) return null;

  const el = createMarkerElement(event, () => onEventSelect(event));

  // Add CSS animation for pulse effect
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 0.4; }
      50% { transform: scale(1.2); opacity: 0.2; }
      100% { transform: scale(0.8); opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);

  // Create marker with proper anchor and offset
  return new mapboxgl.Marker({
    element: el,
    anchor: 'center', // Anchor to center of marker
    offset: [0, 0]    // No offset
  })
    .setLngLat(event.coordinates as [number, number])
    .addTo(map);
};

/**
 * Creates and adds a cluster marker to the map
 */
export const addClusterMarker = (
  map: mapboxgl.Map,
  coordinates: [number, number],
  pointCount: number,
  onClick: () => void
): mapboxgl.Marker => {
  const el = createClusterMarkerElement(pointCount, onClick);

  // Add CSS animation for ring pulse effect
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.2); opacity: 0.3; }
      100% { transform: scale(1); opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);

  // Create marker with proper anchor and offset
  return new mapboxgl.Marker({
    element: el,
    anchor: 'center', // Anchor to center of marker
    offset: [0, 0]    // No offset
  })
    .setLngLat(coordinates)
    .addTo(map);
};

// Note: The marker management logic has been moved to the useMarkerManager hook
// for better performance and stability during map interactions
