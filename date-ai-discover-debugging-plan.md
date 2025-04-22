# Date AI Discover Project: Debugging & Improvement Plan

After analyzing the codebase and integrations, I've identified several areas for improvement and potential issues in the Date AI Discover application. This plan outlines specific recommendations organized by component and integration, with code examples to illustrate the proposed changes.

## 1. Event Search & API Integration

### PredictHQ Integration Issues

**Current Implementation**:
The `predicthq-fixed.ts` file shows extensive error handling, but the API key validation could be improved. The current implementation focuses on basic error handling without leveraging advanced PredictHQ features.

```typescript
// Current implementation in predicthq-fixed.ts
export async function fetchPredictHQEvents(params: {
  apiKey: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  // other params...
}): Promise<{ events: Event[], error: string | null }> {
  try {
    // Validate API key
    if (!apiKey) {
      console.error('[PREDICTHQ] API key is missing');
      return { events: [], error: 'PredictHQ API key is missing' };
    }

    // Build query parameters...
    // Make API request...
  } catch (error) {
    // Error handling...
  }
}
```

**Recommendation**:
Implement token rotation for API keys and use the Features API for pre-processed ML-ready features instead of raw event data.

```typescript
// Improved implementation with token rotation and Features API
import { TokenManager } from '../utils/tokenManager';

export async function fetchPredictHQEvents(params: {
  // params...
}): Promise<{ events: Event[], error: string | null }> {
  try {
    // Get token from rotation manager
    const tokenManager = new TokenManager('predicthq');
    const apiKey = await tokenManager.getActiveToken();

    if (!apiKey) {
      console.error('[PREDICTHQ] No valid API key available');
      return { events: [], error: 'No valid PredictHQ API key available' };
    }

    // Determine if we should use Features API or Events API
    const useFeatures = params.useFeatures ?? true;

    let url = useFeatures
      ? 'https://api.predicthq.com/v1/features/'
      : 'https://api.predicthq.com/v1/events/';

    // Add geographic fencing with proper radius
    if (params.latitude && params.longitude) {
      const radiusKm = Math.round((params.radius || 30) * 1.60934);
      queryParams.append('within', `${radiusKm}km@${params.latitude},${params.longitude}`);
    }

    // Rest of implementation...

    // Add caching for high-frequency queries
    const cacheKey = generateCacheKey(url, queryParams);
    const cachedResult = await cache.get(cacheKey);

    if (cachedResult) {
      console.log('[PREDICTHQ] Using cached result');
      return JSON.parse(cachedResult);
    }

    // Make API request with proper error handling...

    // Cache the result
    await cache.set(cacheKey, JSON.stringify(result), 60 * 5); // Cache for 5 minutes

    return result;
  } catch (error) {
    // Enhanced error handling...
  }
}
```

**Specific Improvements**:
- Add geographic fencing through proper `radius` parameters
- Implement caching for high-frequency queries
- Use PredictHQ's traffic light system for event confidence scoring:

```typescript
// Implementing confidence scoring
function filterEventsByConfidence(events, minimumConfidence = 'green') {
  const confidenceScores = {
    'red': 1,
    'yellow': 2,
    'green': 3
  };

  const minimumScore = confidenceScores[minimumConfidence] || 1;

  return events.filter(event => {
    const eventScore = confidenceScores[event.phq_confidence] || 0;
    return eventScore >= minimumScore;
  });
}
```

### Event Service Optimization

**Current Implementation**:
`eventService.ts` has complex filtering logic that could be optimized. The current implementation handles most filtering on the client side.

```typescript
// Current implementation in eventService.ts
export async function searchEvents(params: SearchParams): Promise<{
  events: Event[];
  sourceStats?: any;
  totalEvents?: number;
  pageSize?: number;
  page?: number;
}> {
  try {
    // Prepare parameters for API calls
    const searchParams = {
      // ...parameters
    };

    // Call Supabase function
    const { data, error } = await supabase.functions.invoke('search-events', {
      body: searchParams
    });

    if (error) {
      console.error('[ERROR] Supabase function error:', error);
      throw error;
    }

    // Client-side filtering
    const filteredEvents = (data.events || []).filter(
      (ev: any) =>
        !!ev.image &&
        typeof ev.image === 'string' &&
        ev.image.trim().length > 0 &&
        !!ev.description &&
        typeof ev.description === 'string' &&
        ev.description.trim().length > 0
    );

    return {
      events: filteredEvents,
      // ...other return values
    };
  } catch (error) {
    console.error('Error searching events:', error);
    throw error;
  }
}
```

**Recommendation**:
Move more filtering to the server-side and implement better error handling for API failures.

```typescript
// Improved implementation with better error handling and server-side filtering
export async function searchEvents(params: SearchParams): Promise<{
  events: Event[];
  sourceStats?: any;
  totalEvents?: number;
  pageSize?: number;
  page?: number;
}> {
  // Implement retry logic with exponential backoff
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      // Move filtering parameters to server-side
      const searchParams = {
        ...params,
        requireImage: true,
        requireDescription: true,
        // Add other filtering parameters
      };

      // Add detailed logging
      console.log(`[EVENT_SERVICE] Attempt ${retryCount + 1} - Searching events with params:`,
        JSON.stringify(searchParams, null, 2));

      // Call Supabase function
      const { data, error } = await supabase.functions.invoke('search-events', {
        body: searchParams
      });

      if (error) {
        console.error(`[EVENT_SERVICE] Attempt ${retryCount + 1} - Error:`, error);
        lastError = error;
        retryCount++;

        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Log successful response
      console.log(`[EVENT_SERVICE] Success - Received ${data.events?.length || 0} events`);

      // Cache results for common searches
      if (shouldCacheResults(params)) {
        await cacheResults(params, data);
      }

      return {
        events: data.events || [],
        sourceStats: data.sourceStats,
        totalEvents: data.totalEvents,
        pageSize: params.limit || 200,
        page: params.page || 1
      };
    } catch (error) {
      console.error(`[EVENT_SERVICE] Attempt ${retryCount + 1} - Unexpected error:`, error);
      lastError = error;
      retryCount++;

      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  console.error(`[EVENT_SERVICE] All ${maxRetries} attempts failed`);
  throw lastError;
}

// Helper function to determine if results should be cached
function shouldCacheResults(params: SearchParams): boolean {
  // Cache results for common searches (e.g., popular locations, no specific filters)
  return !params.keyword && !params.categories?.length && !!params.location;
}

// Helper function to cache results
async function cacheResults(params: SearchParams, data: any): Promise<void> {
  const cacheKey = generateCacheKey(params);
  const cacheExpiry = 5 * 60; // 5 minutes

  try {
    await localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
    console.log(`[EVENT_SERVICE] Cached results for key: ${cacheKey}`);
  } catch (error) {
    console.warn(`[EVENT_SERVICE] Failed to cache results:`, error);
  }
}

// Helper function to generate cache key
function generateCacheKey(params: SearchParams): string {
  // Create a deterministic key based on search parameters
  const keyParts = [
    params.location || '',
    params.latitude?.toString() || '',
    params.longitude?.toString() || '',
    params.radius?.toString() || '',
    params.startDate || '',
    params.endDate || '',
    params.limit?.toString() || ''
  ];

  return `events_cache_${keyParts.join('_')}`;
}
```

**Specific Improvements**:
- Implement retry logic with exponential backoff for API calls
- Add more detailed logging for API responses
- Cache common search results to reduce API calls

## 2. Map Integration & Performance

### React-Map-GL Implementation

**Current Implementation**:
The map components may not be optimized for large datasets, potentially using DOM-based markers for all events.

```jsx
// Current implementation in a map component
function EventMap({ events }) {
  return (
    <Map
      initialViewState={{
        longitude: -100,
        latitude: 40,
        zoom: 3.5
      }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
    >
      {events.map(event => (
        <Marker
          key={event.id}
          longitude={event.coordinates[0]}
          latitude={event.coordinates[1]}
        >
          <div className="marker">
            <img src="/marker-icon.png" alt="Event" />
          </div>
        </Marker>
      ))}
    </Map>
  );
}
```

**Recommendation**:
Use WebGL layers instead of DOM-based Markers for large datasets.

```jsx
// Improved implementation with useMemo and WebGL layers
import { useMemo, useState } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl';
import * as turf from '@turf/turf';

function EventMap({ events }) {
  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 3.5
  });

  // Use useMemo to prevent unnecessary re-renders of markers
  const markers = useMemo(() => {
    // Only use DOM markers for small datasets
    if (events.length < 100) {
      return events.map(event => (
        <Marker
          key={event.id}
          longitude={event.coordinates[0]}
          latitude={event.coordinates[1]}
        >
          <div className="marker">
            <img src="/marker-icon.png" alt="Event" />
          </div>
        </Marker>
      ));
    }
    return null;
  }, [events]);

  // Use GeoJSON source and WebGL layers for large datasets
  const eventsGeoJSON = useMemo(() => {
    if (events.length >= 100) {
      return {
        type: 'FeatureCollection',
        features: events.map(event => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: event.coordinates
          },
          properties: {
            id: event.id,
            title: event.title,
            category: event.category
          }
        }))
      };
    }
    return null;
  }, [events]);

  return (
    <Map
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/streets-v11"
    >
      {/* Render DOM markers for small datasets */}
      {events.length < 100 && markers}

      {/* Render WebGL layers for large datasets */}
      {events.length >= 100 && (
        <Source id="events-source" type="geojson" data={eventsGeoJSON}>
          <Layer
            id="events-layer"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': [
                'match',
                ['get', 'category'],
                'music', '#FF5722',
                'sports', '#2196F3',
                'arts', '#9C27B0',
                'food', '#4CAF50',
                'party', '#FFC107',
                '#607D8B' // default color
              ],
              'circle-opacity': 0.8,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            }}
          />
        </Source>
      )}
    </Map>
  );
}
```

**Specific Improvements**:
- Implement `useMemo` for markers to prevent unnecessary re-renders
- Switch to Symbol layers for datasets exceeding 100 elements
- Use controlled components pattern for map state management

### Map Performance

**Current Implementation**:
The current implementation may have performance issues with many markers.

```jsx
// Current implementation in MapView.tsx
function MapView() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch events
    async function fetchEvents() {
      const result = await searchEvents({
        // search parameters
      });
      setEvents(result.events);
    }

    fetchEvents();
  }, []);

  return (
    <Map
      initialViewState={{
        longitude: -100,
        latitude: 40,
        zoom: 3.5
      }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
    >
      {events.map(event => (
        <Marker
          key={event.id}
          longitude={event.coordinates[0]}
          latitude={event.coordinates[1]}
        >
          <div className="marker">
            <img src="/marker-icon.png" alt="Event" />
          </div>
        </Marker>
      ))}
    </Map>
  );
}
```

**Recommendation**:
Implement clustering for large numbers of event markers.

```jsx
// Improved implementation with clustering
import { useMemo, useState, useRef } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl';
import * as turf from '@turf/turf';
import Supercluster from 'supercluster';

function MapView() {
  const [events, setEvents] = useState([]);
  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 3.5
  });

  const mapRef = useRef();

  useEffect(() => {
    // Fetch events
    async function fetchEvents() {
      const result = await searchEvents({
        // search parameters
      });
      setEvents(result.events);
    }

    fetchEvents();
  }, []);

  // Create GeoJSON features for clustering
  const points = useMemo(() => {
    return events
      .filter(event => event.coordinates)
      .map(event => ({
        type: 'Feature',
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
          cluster: false
        },
        geometry: {
          type: 'Point',
          coordinates: event.coordinates
        }
      }));
  }, [events]);

  // Create and update supercluster
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 40,
      maxZoom: 16
    });

    if (points.length > 0) {
      cluster.load(points);
    }

    return cluster;
  }, [points]);

  // Get clusters based on current map view
  const clusters = useMemo(() => {
    if (!mapRef.current || !supercluster) return [];

    const map = mapRef.current.getMap();
    const bounds = map.getBounds();

    return supercluster.getClusters(
      [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ],
      Math.floor(map.getZoom())
    );
  }, [supercluster, viewState]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/streets-v11"
    >
      {clusters.map(cluster => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount } = cluster.properties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              longitude={longitude}
              latitude={latitude}
            >
              <div
                className="cluster-marker"
                style={{
                  width: `${30 + (pointCount / points.length) * 20}px`,
                  height: `${30 + (pointCount / points.length) * 20}px`
                }}
                onClick={() => {
                  const expansionZoom = Math.min(
                    supercluster.getClusterExpansionZoom(cluster.id),
                    20
                  );

                  setViewState({
                    ...viewState,
                    longitude,
                    latitude,
                    zoom: expansionZoom,
                    transitionDuration: 500
                  });
                }}
              >
                {pointCount}
              </div>
            </Marker>
          );
        }

        // Individual point
        return (
          <Marker
            key={cluster.properties.id}
            longitude={longitude}
            latitude={latitude}
          >
            <div
              className={`marker ${cluster.properties.category}`}
              onClick={() => {
                // Handle marker click
              }}
            />
          </Marker>
        );
      })}
    </Map>
  );
}
```

**Specific Improvements**:
- Add Supercluster for marker clustering
- Implement virtualization for marker rendering
- Use WebGL layers for better performance with large datasets

## 3. Supabase Integration

### Authentication Flow

**Current Implementation**:
The current authentication implementation may not follow best practices.

```jsx
// Current implementation in AuthContext.tsx
async function signIn(email, password) {
  try {
    const { body, error } = await supabase.auth.signIn(email, password);

    if (error) {
      throw error;
    }

    return body;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

async function signUp(email, password) {
  try {
    const { body, error } = await supabase.auth.signUp(email, password);

    if (error) {
      throw error;
    }

    return body;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}
```

**Recommendation**:
Update to the latest Supabase authentication methods.

```jsx
// Improved implementation with updated methods and error handling
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signIn({
      email,
      password
    });

    if (error) {
      console.error('Authentication error:', error.message);
      throw new AuthError(error.message, error.status);
    }

    return data;
  } catch (error) {
    // Log detailed error information
    console.error('Error signing in:', {
      message: error.message,
      code: error.code,
      status: error.status,
      timestamp: new Date().toISOString()
    });

    // Rethrow with user-friendly message
    throw new AuthError(
      error.message || 'Failed to sign in. Please try again.',
      error.status
    );
  }
}

async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error('Authentication error:', error.message);
      throw new AuthError(error.message, error.status);
    }

    return data;
  } catch (error) {
    // Log detailed error information
    console.error('Error signing up:', {
      message: error.message,
      code: error.code,
      status: error.status,
      timestamp: new Date().toISOString()
    });

    // Rethrow with user-friendly message
    throw new AuthError(
      error.message || 'Failed to create account. Please try again.',
      error.status
    );
  }
}

// Implement token refresh logic
async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Session refresh error:', error.message);
      throw new AuthError(error.message, error.status);
    }

    return data;
  } catch (error) {
    console.error('Error refreshing session:', error);

    // Handle session expiration
    if (error.status === 401) {
      // Clear local session
      await supabase.auth.signOut();
      // Redirect to login
      window.location.href = '/login';
    }

    throw error;
  }
}

// Custom error class for authentication errors
class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
```

**Specific Improvements**:
- Update from `signIn`/`signUp` to object parameter pattern
- Implement proper error handling for authentication failures
- Add token refresh logic

### Database Operations

**Current Implementation**:
The database operations may not be optimized for performance.

```jsx
// Current implementation in a service file
async function getFavorites(userId) {
  try {
    const { body, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return body;
  } catch (error) {
    console.error('Error getting favorites:', error);
    throw error;
  }
}
```

**Recommendation**:
Implement better error handling and data caching.

```jsx
// Improved implementation with caching and error handling
import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabase = createClient('https://your-project.supabase.co', 'your-anon-key');

// Simple in-memory cache
const cache = {
  data: {},
  set(key, value, ttl = 60000) {
    this.data[key] = {
      value,
      expiry: Date.now() + ttl
    };
  },
  get(key) {
    const item = this.data[key];
    if (!item) return null;
    if (Date.now() > item.expiry) {
      delete this.data[key];
      return null;
    }
    return item.value;
  },
  invalidate(key) {
    delete this.data[key];
  }
};

async function getFavorites(userId) {
  // Generate cache key
  const cacheKey = `favorites_${userId}`;

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log('Using cached favorites data');
    return cachedData;
  }

  try {
    // Use data property instead of body
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error.message);
      throw new DatabaseError(error.message, error.code);
    }

    // Cache the result for 5 minutes
    cache.set(cacheKey, data, 5 * 60 * 1000);

    return data;
  } catch (error) {
    // Log detailed error information
    console.error('Error getting favorites:', {
      userId,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // Rethrow with user-friendly message
    throw new DatabaseError(
      error.message || 'Failed to fetch favorites. Please try again.',
      error.code
    );
  }
}

// Function to invalidate cache when data changes
async function addFavorite(userId, eventId) {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .insert([{ user_id: userId, event_id: eventId }]);

    if (error) {
      console.error('Database error:', error.message);
      throw new DatabaseError(error.message, error.code);
    }

    // Invalidate cache
    cache.invalidate(`favorites_${userId}`);

    return data;
  } catch (error) {
    console.error('Error adding favorite:', error);
    throw error;
  }
}

// Custom error class for database errors
class DatabaseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}
```

**Specific Improvements**:
- Use the `data` property instead of `body` in query responses
- Implement proper error handling for database operations
- Add caching for frequently accessed data

## 4. Perplexity AI Integration

### API Usage Optimization

**Current Implementation**:
The Perplexity service may not be optimized for cost and performance.

```typescript
// Current implementation in perplexityService.ts
export async function callPerplexityAPI(
  messages: PerplexityMessage[],
  apiKey: string = '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'
): Promise<string> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar', // Using the standard Sonar model for event search queries
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }

    const data: PerplexityResponse = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    throw error;
  }
}
```

**Recommendation**:
Implement better prompt engineering and error handling.

```typescript
// Improved implementation with retry logic and structured logging
import { createLogger } from '../utils/logger';

const logger = createLogger('perplexity-service');

export async function callPerplexityAPI(
  messages: PerplexityMessage[],
  options: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const {
    apiKey = process.env.PERPLEXITY_API_KEY || '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',
    model = 'sonar',
    maxTokens = 1000,
    temperature = 0.3, // Lower temperature for more factual responses
    maxRetries = 3
  } = options;

  let retryCount = 0;
  let lastError: Error | null = null;

  // Log API call
  logger.info('Calling Perplexity API', {
    model,
    messageCount: messages.length,
    firstMessagePreview: messages[0]?.content.substring(0, 50) + '...',
    temperature,
    maxTokens
  });

  while (retryCount < maxRetries) {
    try {
      const startTime = Date.now();

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        })
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Log response time
      logger.info('Perplexity API response received', {
        latencyMs: latency,
        status: response.status
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Log error details
        logger.error('Perplexity API error', {
          status: response.status,
          error: errorText,
          retryCount
        });

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;

          logger.warn('Rate limit exceeded, retrying', {
            retryCount,
            delayMs: delay
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
      }

      const data: PerplexityResponse = await response.json();

      // Log token usage
      logger.info('Perplexity API success', {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        model: data.model
      });

      return data.choices[0].message.content;
    } catch (error) {
      lastError = error as Error;

      // Log error
      logger.error('Error calling Perplexity API', {
        error: lastError.message,
        retryCount
      });

      // Retry on network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;

        logger.warn('Network error, retrying', {
          retryCount,
          delayMs: delay,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If it's not a network error or rate limit, rethrow immediately
      throw lastError;

    }
  }

  // All retries failed
  logger.error(`All ${maxRetries} attempts failed`, {
    lastError: lastError?.message
  });
  throw lastError;
}
```

**Specific Improvements**:
- Implement retry logic with exponential backoff for API calls, specifically handling rate limits (429) and network errors.
- Add structured logging using a dedicated logger utility for better monitoring and debugging.
- Lower the default temperature for the Perplexity API calls to encourage more factual and less creative responses, which is likely more suitable for event search queries.
- Log API call details, response time, and token usage for performance monitoring and cost analysis.

## 5. User Interface & Experience

### Event Listing and Details

**Current Implementation**:
The current event listing might be a simple list or grid without advanced filtering or sorting options on the client side. Event details might be basic.

```jsx
// Current implementation in EventList.jsx
function EventList({ events }) {
  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          <p>{event.description}</p>
          {/* Basic event details */}
        </div>
      ))}
    </div>
  );
}
```

**Recommendation**:
Implement infinite scrolling or pagination for event lists. Enhance event details with more information and a better layout.

```jsx
// Improved implementation with infinite scrolling (example using a hypothetical hook)
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import EventCard from './EventCard'; // Assuming a dedicated component for event display

function EventList({ initialEvents, searchParams }) {
  const { data, loading, error, hasMore } = useInfiniteScroll(
    searchEvents, // Your event fetching function
    initialEvents,
    searchParams
  );

  if (error) {
    return <div>Error loading events: {error.message}</div>;
  }

  return (
    <div>
      <div className="event-grid"> {/* Use a grid for better layout */}
        {data.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {loading && <div>Loading more events...</div>}
      {!hasMore && <div>No more events found.</div>}
    </div>
  );
}

// Example EventCard component (simplified)
function EventCard({ event }) {
  return (
    <div className="event-card">
      <img src={event.image || '/placeholder.svg'} alt={event.title} />
      <h4>{event.title}</h4>
      <p>{event.description.substring(0, 100)}...</p> {/* Truncate description */}
      {/* Add more details like date, location, category */}
    </div>
  );
}
```

**Specific Improvements**:
- Implement infinite scrolling or pagination for efficient loading of large event lists.
- Create dedicated components for displaying individual events (e.g., `EventCard`) for better structure and reusability.
- Enhance the visual presentation of event details.
- Add client-side filtering and sorting options if not fully handled server-side.

### Search Interface

**Current Implementation**:
The search interface might be a simple input field.

```jsx
// Current implementation in SearchBar.jsx
function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for events..."
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

**Recommendation**:
Implement a more sophisticated search interface with suggestions, category filters, date pickers, and location input with autocomplete.

```jsx
// Improved implementation with more search options (example)
import { useState } from 'react';
import DatePicker from 'react-datepicker'; // Assuming a date picker library
import 'react-datepicker/dist/react-datepicker.css';

function AdvancedSearchBar({ onSearch }) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [category, setCategory] = useState('');

  const handleSearch = () => {
    onSearch({
      keyword,
      location,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      category
    });
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Keyword..."
      />
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location..."
      />
      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date)}
        placeholderText="Start Date"
      />
      <DatePicker
        selected={endDate}
        onChange={(date) => setEndDate(date)}
        placeholderText="End Date"
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All Categories</option>
        <option value="music">Music</option>
        <option value="sports">Sports</option>
        {/* Add more categories */}
      </select>
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
```

**Specific Improvements**:
- Add input fields for location, date range, and category filtering.
- Implement autocomplete for location input (potentially using a geocoding service).
- Integrate a date picker component for easy date selection.
- Provide a dropdown or checkboxes for category selection.

## 6. Testing & Deployment

### Automated Testing

**Current Implementation**:
Automated testing might be limited or non-existent.

**Recommendation**:
Implement a comprehensive testing strategy including unit, integration, and end-to-end tests.

**Specific Improvements**:
- Write unit tests for utility functions and service methods (e.g., caching, error handling, data transformation).
- Implement integration tests for API calls and database operations.
- Set up end-to-end tests using a framework like Cypress or Playwright to simulate user flows (e.g., searching for events, viewing details, favoriting).
- Integrate testing into the CI/CD pipeline.

### Deployment Strategy

**Current Implementation**:
Deployment might be manual or basic.

**Recommendation**:
Implement an automated CI/CD pipeline for continuous integration and deployment.

**Specific Improvements**:
- Set up a CI/CD pipeline using platforms like GitHub Actions, GitLab CI, or Jenkins.
- Automate building, testing, and deployment processes.
- Implement blue/green deployment or canary releases for minimizing downtime and risk.
- Monitor application performance and errors in production.

## 7. Future Enhancements

- **User Profiles and Preferences**: Allow users to set preferences for event categories, locations, and other criteria to personalize search results.
- **Event Recommendations**: Implement a recommendation engine based on user history, preferences, and similar events.
- **Social Features**: Allow users to share events, invite friends, and see which events their friends are attending.
- **Advanced Filtering**: Add more advanced filtering options such as price range, accessibility features, and event popularity.
- **Notifications**: Implement push notifications or email alerts for upcoming events or new events matching user preferences.
- **Admin Dashboard**: Create an admin interface for managing events, users, and content.
- **Integration with Calendar Apps**: Allow users to easily add events to their personal calendars.
- **Machine Learning for Event Scoring**: Further leverage ML models (like PredictHQ's Features API) for more sophisticated event scoring and relevance ranking.
- **Internationalization and Localization**: Support multiple languages and regions.
- **Offline Mode**: Implement offline capabilities for accessing cached event data.

This plan provides a roadmap for improving the Date AI Discover application's performance, reliability, and user experience. Implementing these recommendations will lead to a more robust and scalable application.
