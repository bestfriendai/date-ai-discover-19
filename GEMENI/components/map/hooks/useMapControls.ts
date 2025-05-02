
import { useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from '@/hooks/use-toast';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { Event } from '@/types';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import UserLocationMarker from '../markers/UserLocationMarker';

export const useMapControls = (
  map: mapboxgl.Map | null,
  onLoadingChange?: (isLoading: boolean) => void,
  onEventSelect?: (event: Event | null) => void,
  onLocationFound?: (coords: { latitude: number; longitude: number; locationName?: string }) => void,
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentLocation, setCurrentLocation] = useState<string>('New York');
  const [locationRequested, setLocationRequested] = useState(false);
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);
  const { getUserLocation } = useUserLocation();

  const handleLocationSearch = async (location: string) => {
    if (!location.trim() || !mapboxgl.accessToken || !map) {
      console.error('[MAP_CONTROLS] Cannot search location: Missing location, mapbox token, or map instance');
      return;
    }

    console.log('[MAP_CONTROLS] Searching for location:', location);
    onLoadingChange?.(true);

    toast({
      title: "Searching",
      description: `Looking for events near ${location}...`
    });

    try {
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
      console.log('[MAP_CONTROLS] Geocoding URL:', geocodeUrl);

      const response = await fetch(geocodeUrl);
      const data = await response.json();
      console.log('[MAP_CONTROLS] Geocoding response:', data);

      if (data.features?.length) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        const placeName = feature.text || location;

        console.log('[MAP_CONTROLS] Location found:', {
          placeName,
          longitude,
          latitude,
          fullFeature: feature
        });

        setCurrentLocation(placeName);

        // Remove existing marker if any
        if (userMarker) userMarker.remove();

        // Create a new marker for the searched location
        const markerHtml = ReactDOMServer.renderToString(
          React.createElement(UserLocationMarker, { color: "red" })
        );
        const el = document.createElement('div');
        el.innerHTML = markerHtml;

        const marker = new mapboxgl.Marker({ element: el.firstChild as HTMLElement })
          .setLngLat([longitude, latitude])
          .addTo(map);

        setUserMarker(marker);

        map.easeTo({
          center: [longitude, latitude],
          zoom: 13,
          duration: 1500
        });

        // Trigger event loading with the new coordinates and location name
        // Use the original search term instead of just the placeName to preserve the full location name
        if (onLocationFound) {
          console.log('[MAP_CONTROLS] Triggering event loading for searched location:', { latitude, longitude, locationName: location });
          onLocationFound({ latitude, longitude, locationName: location });
        } else {
          console.warn('[MAP_CONTROLS] onLocationFound callback is not defined');
        }
      } else {
        console.warn('[MAP_CONTROLS] Location not found in geocoding response');
        toast({ title: "Location not found", variant: "destructive" });
      }
    } catch (error) {
      console.error('[MAP_CONTROLS] Geocoding error:', error);
      toast({ title: "Search Error", variant: "destructive" });
    } finally {
      onLoadingChange?.(false);
    }
  };

  const handleGetUserLocation = useCallback(async () => {
    if (!map) return;

    setLocationRequested(true);

    try {
      const [longitude, latitude] = await getUserLocation();

      if (userMarker) userMarker.remove();

      // Fix: Using React.createElement instead of JSX directly
      const markerHtml = ReactDOMServer.renderToString(
        React.createElement(UserLocationMarker, { color: "blue" })
      );
      const el = document.createElement('div');
      el.innerHTML = markerHtml;

      const marker = new mapboxgl.Marker({ element: el.firstChild as HTMLElement })
        .setLngLat([longitude, latitude])
        .addTo(map);

      setUserMarker(marker);

      map.jumpTo({
        center: [longitude, latitude],
        zoom: 14
      });

      // Trigger event loading with the new coordinates
      if (onLocationFound) {
        console.log('[MAP_CONTROLS] Location found, triggering event loading:', { latitude, longitude });

        // Try to get a location name from reverse geocoding first
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`
          );
          const data = await response.json();

          if (data.features?.length) {
            // Look for a city or locality name
            const place = data.features.find((f: any) =>
              f.place_type.includes('place') || f.place_type.includes('locality')
            );

            if (place) {
              const locationName = place.text;
              console.log('[MAP_CONTROLS] Found location name from reverse geocoding:', locationName);
              setCurrentLocation(locationName);
              onLocationFound({ latitude, longitude, locationName });
              return;
            }
          }
        } catch (geoError) {
          console.error('[MAP_CONTROLS] Reverse geocode error:', geoError);
        }

        // If reverse geocoding fails, use "Current Location" as the location name
        onLocationFound({ latitude, longitude, locationName: "Current Location" });
      }

    } catch (error) {
      console.error('Get location error:', error);
      handleFallbackLocation();
    } finally {
      setLocationRequested(false);
    }
  }, [map, userMarker]);

  const handleFallbackLocation = () => {
    if (!map) return;

    const fallbackLocations = [
      { name: "New York", lng: -74.0060, lat: 40.7128 },
      { name: "Los Angeles", lng: -118.2437, lat: 34.0522 },
      { name: "Chicago", lng: -87.6298, lat: 41.8781 },
      { name: "Miami", lng: -80.1918, lat: 25.7617 },
      { name: "Las Vegas", lng: -115.1398, lat: 36.1699 }
    ];

    const randomIndex = Math.floor(Math.random() * fallbackLocations.length);
    const fallback = fallbackLocations[randomIndex];

    toast({
      title: "Using Popular Location",
      description: `Showing events in ${fallback.name}. You can search for a specific location using the search bar above.`,
      duration: 5000
    });

    setCurrentLocation(fallback.name);

    if (userMarker) userMarker.remove();

    // Fix: Using React.createElement instead of JSX directly
    const fallbackMarkerHtml = ReactDOMServer.renderToString(
      React.createElement(UserLocationMarker, { color: "red" })
    );
    const fallbackEl = document.createElement('div');
    fallbackEl.innerHTML = fallbackMarkerHtml;

    const marker = new mapboxgl.Marker({ element: fallbackEl.firstChild as HTMLElement })
      .setLngLat([fallback.lng, fallback.lat])
      .addTo(map);

    setUserMarker(marker);

    map.flyTo({
      center: [fallback.lng, fallback.lat],
      zoom: 12,
      duration: 2000,
      essential: true
    });

    // Trigger event loading with the fallback coordinates and location name
    if (onLocationFound) {
      console.log('[MAP_CONTROLS] Using fallback location, triggering event loading:', { latitude: fallback.lat, longitude: fallback.lng, locationName: fallback.name });
      onLocationFound({ latitude: fallback.lat, longitude: fallback.lng, locationName: fallback.name });
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    currentLocation,
    locationRequested,
    handleLocationSearch,
    handleGetUserLocation
  };
};
