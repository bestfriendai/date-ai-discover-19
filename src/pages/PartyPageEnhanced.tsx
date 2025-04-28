import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { searchEvents } from '@/services/eventService.enhanced';
import { Event } from '@/types';
import EventGrid from '@/components/events/EventGrid';
import PartyTypeFilter, { PartySubcategory } from '@/components/party/PartyTypeFilter';
import { getPartyMarkerConfig } from '@/components/map/utils/partyMarkers';
import { initApiKeyManager } from '@/utils/apiKeyManager';
import { initEventCache } from '@/utils/eventCache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Search } from 'lucide-react';

// Initialize API key manager and event cache
if (typeof window !== 'undefined') {
  initApiKeyManager();
  initEventCache();
}

const PartyPage: React.FC = () => {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('New York');
  const [radius, setRadius] = useState(30);
  const [partyType, setPartyType] = useState<PartySubcategory>('all');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [totalEvents, setTotalEvents] = useState(0);

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && !map) {
      const mapElement = document.getElementById('map');
      if (mapElement) {
        const newMap = new google.maps.Map(mapElement, {
          center: { lat: 40.7128, lng: -74.0060 }, // New York
          zoom: 11,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });
        setMap(newMap);
      }
    }
  }, [map]);

  // Get user's location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);

          // Center map on user's location
          if (map) {
            map.setCenter(userLoc);
            map.setZoom(12);

            // Add a marker for the user's location
            new google.maps.Marker({
              position: userLoc,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2
              },
              title: 'Your Location'
            });

            // Search for events near the user's location
            searchPartyEvents({
              latitude: userLoc.lat,
              longitude: userLoc.lng
            });
          }
        },
        (error) => {
          console.error('Error getting user location:', error);
          setError('Could not get your location. Please enter a location manually.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  // Search for party events
  const searchPartyEvents = async (params: any = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Build search parameters
      const searchParams = {
        ...params,
        location: params.location || location,
        radius: params.radius || radius,
        categories: ['party'],
        limit: 100,
        startDate: todayStr, // Ensure we only get events from today forward
        keyword: 'party club nightlife dance dj festival celebration', // Enhanced keywords for party search
        partySubcategory: partyType !== 'all' ? partyType : undefined
      };

      console.log('[PARTY_PAGE] Searching for party events with params:', searchParams);

      // Search for events
      const result = await searchEvents(searchParams);

      console.log(`[PARTY_PAGE] Found ${result.events.length} party events`);

      // Update state
      setEvents(result.events);
      setTotalEvents(result.meta?.totalEvents || result.events.length);

      // Update map markers
      updateMapMarkers(result.events);

      // Center map on the first event if available
      if (result.events.length > 0 && result.events[0].coordinates && map) {
        const [lng, lat] = result.events[0].coordinates;
        map.setCenter({ lat, lng });
        map.setZoom(11);
      }
    } catch (error) {
      console.error('Error searching for party events:', error);
      setError('Error searching for party events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update map markers
  const updateMapMarkers = (events: Event[]) => {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    if (!map) return;

    // Create new markers
    const newMarkers = events.map(event => {
      if (!event.coordinates) return null;

      const [lng, lat] = event.coordinates;

      // Create marker with custom icon based on party type
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        ...getPartyMarkerConfig(event)
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 300px;">
            <h3 style="margin: 0 0 8px; font-size: 16px;">${event.title}</h3>
            <p style="margin: 0 0 4px; font-size: 14px;">${event.date} ${event.time ? `at ${event.time}` : ''}</p>
            <p style="margin: 0 0 4px; font-size: 14px;">${event.location}</p>
            ${event.partySubcategory ? `<p style="margin: 0 0 8px; font-size: 14px;">Type: ${event.partySubcategory}</p>` : ''}
            <a href="/events/${event.id}" style="color: #4285F4; text-decoration: none; font-size: 14px;">View Details</a>
          </div>
        `
      });

      // Add click listener
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    }).filter(Boolean) as google.maps.Marker[];

    setMarkers(newMarkers);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchPartyEvents({ location });
  };

  // Handle party type change
  const handlePartyTypeChange = (type: PartySubcategory) => {
    setPartyType(type);

    // If we already have events, filter them by party type
    if (events.length > 0) {
      if (type === 'all') {
        // If 'all' is selected, search again to get all party types
        searchPartyEvents();
      } else {
        // Otherwise, filter the existing events
        searchPartyEvents({ partySubcategory: type });
      }
    }
  };

  // Initial search on component mount
  useEffect(() => {
    searchPartyEvents();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Party Events</h1>

      {/* Search form */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter location (e.g., New York)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              type="number"
              placeholder="Radius (miles)"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full md:w-32"
              min={1}
              max={100}
            />
            <Button type="submit" className="w-full md:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={getUserLocation}
              className="w-full md:w-auto"
            >
              Use My Location
            </Button>
          </div>

          {/* Party type filter */}
          <PartyTypeFilter
            selectedType={partyType}
            onChange={handlePartyTypeChange}
            className="pt-2"
          />
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Map */}
      <div
        id="map"
        className="w-full h-[400px] rounded-lg mb-6 border border-border"
      ></div>

      {/* Stats */}
      <div className="bg-muted p-4 rounded-lg mb-6">
        <p className="text-sm text-muted-foreground">
          Found {totalEvents} party events
          {partyType !== 'all' ? ` of type "${partyType}"` : ''}
          {userLocation ? ' near your location' : ` in ${location}`}.
        </p>
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : events.length > 0 ? (
        <EventGrid events={events} viewMode="grid" />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No party events found. Try a different location or party type.</p>
        </div>
      )}

      {/* Google Maps script */}
      <script
        async
        defer
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&callback=initMap`}
      ></script>
    </div>
  );
};

export default PartyPage;
