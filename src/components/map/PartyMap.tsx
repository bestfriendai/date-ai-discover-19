
import React, { useEffect, useRef, useState } from 'react';
import { Event } from '@/types';
import { getPartyMarkerConfig } from './utils/partyMarkers';
import Script from 'next/script';

// Define global window type with Google Maps properties
declare global {
  interface Window {
    initMap: () => void;
    google: any;
    MarkerClusterer: any;
  }
}

interface PartyMapProps {
  events: Event[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onMarkerClick?: (event: Event) => void;
  showClusters?: boolean;
  showHeatmap?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

const PartyMap: React.FC<PartyMapProps> = ({
  events,
  center = { lat: 40.7128, lng: -74.0060 }, // Default to New York
  zoom = 11,
  height = '400px',
  onMarkerClick,
  showClusters = true,
  showHeatmap = false,
  userLocation = null
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markerCluster, setMarkerCluster] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Initialize global map for window.initMap
  useEffect(() => {
    window.initMap = () => {
      setGoogleLoaded(true);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map || !googleLoaded) return;
    
    try {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'cooperative'
      });

      setMap(newMap);
      setInfoWindow(new window.google.maps.InfoWindow());

      // Load MarkerClusterer if needed
      if (showClusters && !window.MarkerClusterer) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
        script.async = true;
        document.head.appendChild(script);
      }

      // Load heatmap library if needed
      if (showHeatmap && !window.google.maps.visualization) {
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&libraries=visualization';
        script.async = true;
        document.head.appendChild(script);
      }
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      // Clean up
      if (markerCluster) {
        markerCluster.clearMarkers();
      }
      if (heatmap) {
        heatmap.setMap(null);
      }
    };
  }, [mapRef, map, center, zoom, showClusters, showHeatmap, googleLoaded]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (!map) return;
    map.setCenter(center);
    map.setZoom(zoom);
  }, [map, center, zoom]);

  // Add user location marker
  useEffect(() => {
    if (!map || !userLocation || !googleLoaded) return;

    try {
      // Create user location marker
      const userMarker = new window.google.maps.Marker({
        position: userLocation,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        },
        title: 'Your Location',
        zIndex: 1000 // Ensure it's on top of other markers
      });

      // Add accuracy circle
      const accuracyCircle = new window.google.maps.Circle({
        map,
        center: userLocation,
        radius: 500, // 500 meters accuracy (example)
        strokeColor: '#4285F4',
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: '#4285F4',
        fillOpacity: 0.2
      });

      return () => {
        userMarker.setMap(null);
        accuracyCircle.setMap(null);
      };
    } catch (error) {
      console.error("Error adding user location marker:", error);
    }
  }, [map, userLocation, googleLoaded]);

  // Update markers when events change
  useEffect(() => {
    if (!map || !infoWindow || !googleLoaded) return;

    try {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      
      if (markerCluster) {
        markerCluster.clearMarkers();
      }
      
      if (heatmap) {
        heatmap.setMap(null);
      }

      // Create new markers
      const newMarkers = events
        .filter(event => {
          // Check for valid coordinates in event data
          return (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2) || 
                 (typeof event.latitude === 'number' && typeof event.longitude === 'number');
        })
        .map(event => {
          try {
            // Get coordinates - either from coordinates array or latitude/longitude properties
            const coordinates = event.coordinates 
              ? { lat: event.coordinates[1], lng: event.coordinates[0] }
              : { lat: Number(event.latitude), lng: Number(event.longitude) };
            
            // Skip if coordinates are invalid
            if (isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
              console.warn(`Invalid coordinates for event ${event.id}`);
              return null;
            }
            
            // Create marker with configuration based on event type
            const markerConfig = getPartyMarkerConfig(event);
            const marker = new window.google.maps.Marker({
              position: coordinates,
              map: showClusters ? null : map, // Don't add to map if using clusters
              title: markerConfig.title,
              icon: markerConfig.icon,
              animation: markerConfig.animation,
              zIndex: markerConfig.zIndex
            });

            // Add click listener
            marker.addListener('click', () => {
              // Close any open info windows
              infoWindow.close();
              
              // Set info window content
              infoWindow.setContent(`
                <div style="max-width: 300px;">
                  <h3 style="margin: 0 0 8px; font-size: 16px;">${event.title || 'Unknown event'}</h3>
                  <p style="margin: 0 0 4px; font-size: 14px;">${event.date} ${event.time ? `at ${event.time}` : ''}</p>
                  <p style="margin: 0 0 4px; font-size: 14px;">${event.location || ''}</p>
                  ${event.partySubcategory ? `<p style="margin: 0 0 8px; font-size: 14px;">Type: ${event.partySubcategory}</p>` : ''}
                  <a href="/events/${event.id}" style="color: #4285F4; text-decoration: none; font-size: 14px;">View Details</a>
                </div>
              `);
              
              // Open info window
              infoWindow.open(map, marker);
              
              // Call onMarkerClick callback if provided
              if (onMarkerClick) {
                onMarkerClick(event);
              }
            });

            return marker;
          } catch (error) {
            console.error(`Error creating marker for event ${event.id}:`, error);
            return null;
          }
        })
        .filter(Boolean); // Remove null markers

      setMarkers(newMarkers);

      // Create marker clusterer if enabled
      if (showClusters && newMarkers.length > 0 && window.MarkerClusterer && googleLoaded) {
        try {
          const clusterer = new window.MarkerClusterer(map, newMarkers, {
            imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
            maxZoom: 15,
            gridSize: 50,
            minimumClusterSize: 3,
            styles: [
              {
                textColor: 'white',
                url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m1.png',
                height: 53,
                width: 53
              },
              {
                textColor: 'white',
                url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m2.png',
                height: 56,
                width: 56
              },
              {
                textColor: 'white',
                url: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m3.png',
                height: 66,
                width: 66
              }
            ]
          });
          
          setMarkerCluster(clusterer);
        } catch (error) {
          console.error("Error creating marker clusterer:", error);
        }
      }

      // Create heatmap if enabled
      if (showHeatmap && newMarkers.length > 0 && window.google?.maps?.visualization && googleLoaded) {
        try {
          const heatmapData = events
            .filter(event => {
              // Filter for events with valid coordinates
              return (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2) || 
                    (typeof event.latitude === 'number' && typeof event.longitude === 'number');
            })
            .map(event => {
              const coordinates = event.coordinates 
                ? { lat: event.coordinates[1], lng: event.coordinates[0] }
                : { lat: Number(event.latitude), lng: Number(event.longitude) };
              
              // Skip if coordinates are invalid
              if (isNaN(coordinates.lat) || isNaN(coordinates.lng)) return null;
              
              // Weight by party type - give more weight to specific types
              let weight = 1;
              if (event.category === 'party' && event.partySubcategory === 'club') weight = 2;
              if (event.category === 'party' && event.partySubcategory === 'celebration') weight = 3;
              
              return {
                location: new window.google.maps.LatLng(coordinates.lat, coordinates.lng),
                weight
              };
            })
            .filter(Boolean); // Remove null points

          const newHeatmap = new window.google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: map,
            radius: 20,
            opacity: 0.7
          });
          
          setHeatmap(newHeatmap);
        } catch (error) {
          console.error("Error creating heatmap:", error);
        }
      }

      // Fit bounds to markers if we have events
      if (newMarkers.length > 0 && googleLoaded) {
        try {
          const bounds = new window.google.maps.LatLngBounds();
          
          newMarkers.forEach(marker => {
            if (marker && marker.getPosition) {
              bounds.extend(marker.getPosition());
            }
          });
          
          // If we have user location, include it in bounds
          if (userLocation) {
            bounds.extend(userLocation);
          }
          
          // Don't zoom in too far
          map.fitBounds(bounds);
          const listener = window.google.maps.event.addListener(map, 'idle', () => {
            if (map.getZoom() > 16) {
              map.setZoom(16);
            }
            window.google.maps.event.removeListener(listener);
          });
        } catch (error) {
          console.error("Error fitting bounds:", error);
        }
      }
    } catch (error) {
      console.error("Error updating markers:", error);
    }
  }, [map, events, infoWindow, showClusters, showHeatmap, onMarkerClick, userLocation, googleLoaded, markers]);

  return (
    <>
      <Script
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&callback=initMap&libraries=places"
        strategy="afterInteractive"
      />
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height, 
          borderRadius: '0.5rem',
          overflow: 'hidden'
        }}
      />
    </>
  );
};

export default PartyMap;
