# Direct RapidAPI Integration for DateAI

This package provides a direct integration with the RapidAPI Events Search API for the DateAI application, bypassing the Supabase functions for improved performance, reliability, and party event detection.

## Features

- **Direct API Calls**: Make API calls directly to RapidAPI from the client side
- **Enhanced Party Detection**: Improved detection of party events with expanded keywords
- **Party Subcategories**: Support for party subcategories (nightclubs, festivals, brunch, day parties)
- **Custom Map Markers**: Different marker styles for different party types
- **Caching**: Local storage caching to reduce API calls
- **Secure API Key Management**: Utilities for securely managing API keys
- **Fallback Mechanism**: Fallback to Supabase functions if direct API calls fail
- **Retry Logic**: Automatic retries with exponential backoff for failed API calls

## Installation

1. Copy the following files to your project:

```
src/
├── services/
│   └── eventService.enhanced.ts
├── components/
│   ├── party/
│   │   └── PartyTypeFilter.tsx
│   └── map/
│       └── utils/
│           └── partyMarkers.ts
├── utils/
│   ├── apiKeyManager.ts
│   └── eventCache.ts
└── pages/
    └── PartyPageEnhanced.tsx (example implementation)
```

2. Update your environment variables:

```
NEXT_PUBLIC_RAPIDAPI_KEY=your_rapidapi_key
```

## Usage

### Basic Usage

Replace your existing event service imports with the enhanced version:

```typescript
// Before
import { searchEvents, getEventById } from '@/services/eventService';

// After
import { searchEvents, getEventById } from '@/services/eventService.enhanced';
```

### Initialize the API Key Manager and Event Cache

Add this to your app's entry point (e.g., `_app.tsx`):

```typescript
import { initApiKeyManager } from '@/utils/apiKeyManager';
import { initEventCache } from '@/utils/eventCache';

// Initialize API key manager and event cache
if (typeof window !== 'undefined') {
  initApiKeyManager();
  initEventCache();
}
```

### Search for Party Events

```typescript
import { searchEvents } from '@/services/eventService.enhanced';

// Search for all party events
const result = await searchEvents({
  location: 'New York',
  radius: 30,
  categories: ['party'],
  limit: 100
});

// Search for specific party subcategory
const nightclubEvents = await searchEvents({
  location: 'New York',
  radius: 30,
  categories: ['party'],
  partySubcategory: 'nightclub',
  limit: 100
});
```

### Add Party Type Filtering

```tsx
import PartyTypeFilter, { PartySubcategory } from '@/components/party/PartyTypeFilter';

const MyComponent = () => {
  const [partyType, setPartyType] = useState<PartySubcategory>('all');

  const handlePartyTypeChange = (type: PartySubcategory) => {
    setPartyType(type);
    // Search for events with the selected party type
    searchEvents({
      categories: ['party'],
      partySubcategory: type !== 'all' ? type : undefined
    });
  };

  return (
    <PartyTypeFilter
      selectedType={partyType}
      onChange={handlePartyTypeChange}
    />
  );
};
```

### Use Custom Map Markers

```typescript
import { getPartyMarkerConfig } from '@/components/map/utils/partyMarkers';

// Create a marker for a party event
const marker = new google.maps.Marker({
  position: { lat, lng },
  map,
  ...getPartyMarkerConfig(event)
});
```

## API Reference

### Event Service

#### `searchEvents(params)`

Search for events with the given parameters.

Parameters:
- `params` (object): Search parameters
  - `location` (string, optional): Location name (e.g., "New York")
  - `latitude` (number, optional): User's latitude
  - `longitude` (number, optional): User's longitude
  - `radius` (number, optional): Search radius in miles (default: 30)
  - `categories` (string[], optional): Event categories (include 'party' for party events)
  - `keyword` (string, optional): Additional keywords to include in the search
  - `limit` (number, optional): Maximum number of events to return (default: 100)
  - `page` (number, optional): Page number for pagination (default: 1)
  - `startDate` (string, optional): Start date in YYYY-MM-DD format
  - `endDate` (string, optional): End date in YYYY-MM-DD format
  - `excludeIds` (string[], optional): Event IDs to exclude from results
  - `partySubcategory` (string, optional): Party subcategory to filter by

Returns:
- Promise resolving to an object with:
  - `events` (Event[]): Array of events
  - `sourceStats` (object): Statistics about the data sources
  - `meta` (object): Metadata about the search results

#### `getEventById(id)`

Get event details by ID.

Parameters:
- `id` (string): Event ID

Returns:
- Promise resolving to an Event object or null if not found

### Party Type Filter

#### `PartyTypeFilter`

A React component for filtering party events by subcategory.

Props:
- `selectedType` (PartySubcategory): Currently selected party type
- `onChange` (function): Callback function called when the selected type changes
- `className` (string, optional): Additional CSS classes

### API Key Manager

#### `getApiKey(keyName)`

Get an API key asynchronously.

Parameters:
- `keyName` (string): Name of the API key to get

Returns:
- Promise resolving to the API key or null if not found

#### `getApiKeySync(keyName)`

Get an API key synchronously (from cache only).

Parameters:
- `keyName` (string): Name of the API key to get

Returns:
- The API key or null if not found in cache

#### `setApiKey(keyName, value)`

Set an API key.

Parameters:
- `keyName` (string): Name of the API key to set
- `value` (string): Value of the API key

#### `clearApiKey(keyName)`

Clear an API key from cache and storage.

Parameters:
- `keyName` (string): Name of the API key to clear

#### `initApiKeyManager()`

Initialize the API key manager.

### Event Cache

#### `getCachedSearchResults(params)`

Get search results from cache.

Parameters:
- `params` (object): Search parameters

Returns:
- Cached search results or null if not found

#### `cacheSearchResults(params, results)`

Cache search results.

Parameters:
- `params` (object): Search parameters
- `results` (object): Search results

#### `getCachedEvent(eventId)`

Get event details from cache.

Parameters:
- `eventId` (string): Event ID

Returns:
- Cached event or null if not found

#### `cacheEvent(event)`

Cache event details.

Parameters:
- `event` (Event): Event to cache

#### `clearExpiredCache()`

Clear expired cache entries.

#### `initEventCache()`

Initialize the event cache.

## Security Considerations

In a production environment, you should not expose your RapidAPI key directly in the client-side code. Consider these options:

1. **Environment Variables**: Use environment variables to store the API key
2. **Proxy Server**: Create a simple proxy server to make the API calls with the key
3. **API Gateway**: Use an API gateway to secure and manage your API calls

The included `apiKeyManager.ts` utility provides a more secure way to manage API keys, but it's still not completely secure for production use.

## Troubleshooting

If you encounter issues with the direct RapidAPI integration:

1. Check the browser console for error messages
2. Verify that your RapidAPI key is valid and has sufficient quota
3. Try different search parameters to see if the issue is specific to certain queries
4. Check the network tab in developer tools to see the actual API requests and responses
5. Try clearing the cache by calling `localStorage.clear()` in the browser console

## License

This project is licensed under the MIT License - see the LICENSE file for details.
