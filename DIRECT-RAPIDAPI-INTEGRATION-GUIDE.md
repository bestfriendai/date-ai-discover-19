# Direct RapidAPI Integration Guide

This guide explains how to integrate direct RapidAPI calls into the DateAI application, bypassing the Supabase functions for improved performance and reliability.

## Why Direct Integration?

Using direct RapidAPI calls from the client side offers several advantages:

1. **Reduced Latency**: Eliminates the extra hop through Supabase functions
2. **Improved Reliability**: Removes potential points of failure in the serverless function
3. **Better Debugging**: Errors occur directly in the client, making them easier to debug
4. **Simplified Architecture**: Reduces dependency on Supabase functions

## Implementation Steps

### 1. Add the Direct RapidAPI Integration Files

Copy the following files to your project:

- `direct-rapidapi-integration.js` - The main integration file with the API client

### 2. Update Your Event Service

Modify your event service to use the direct RapidAPI integration:

```javascript
// src/services/eventService.js
import { createDirectRapidAPIService } from '../utils/direct-rapidapi-integration';

// Create the direct RapidAPI service
const rapidApiService = createDirectRapidAPIService();

/**
 * Search for events
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} - Search results
 */
export async function searchEvents(params) {
  try {
    console.log('[EVENTS] Searching for events with params:', params);
    
    // Use the direct RapidAPI service
    return await rapidApiService.searchEvents(params);
  } catch (error) {
    console.error('[EVENTS] Error searching events:', error);
    return {
      events: [],
      sourceStats: {
        rapidapi: { count: 0, error: String(error) }
      },
      meta: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Get event details
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} - Event details
 */
export async function getEventDetails(eventId) {
  try {
    console.log('[EVENTS] Getting event details for:', eventId);
    
    // Use the direct RapidAPI service
    return await rapidApiService.getEventDetails(eventId);
  } catch (error) {
    console.error('[EVENTS] Error getting event details:', error);
    return {
      event: null,
      error: String(error)
    };
  }
}
```

### 3. Secure Your API Key

In a production environment, you should not expose your RapidAPI key directly in the client-side code. Consider these options:

1. **Environment Variables**: Use environment variables to store the API key
2. **Proxy Server**: Create a simple proxy server to make the API calls with the key
3. **API Gateway**: Use an API gateway to secure and manage your API calls

For development and testing, you can use the key directly as shown in the example files.

### 4. Improved Party Event Detection

The direct integration includes enhanced party event detection with:

- Expanded list of party-related keywords
- Support for party subcategories (festivals, brunches, day parties, nightclubs)
- Improved filtering logic to better identify party events

### 5. Testing the Integration

Use the provided `test-party-local.html` file to test the direct RapidAPI integration:

1. Open the file in a browser
2. Enter a location and radius
3. Click "Search" or "Search with Coordinates"
4. View the results on the map and in the event cards

## API Parameters

The direct RapidAPI integration supports the following parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `location` | string | Location name (e.g., "New York") |
| `latitude` | number | User's latitude |
| `longitude` | number | User's longitude |
| `radius` | number | Search radius in miles |
| `categories` | array | Event categories (include 'party' for party events) |
| `keyword` | string | Additional keywords to include in the search |
| `limit` | number | Maximum number of events to return |
| `page` | number | Page number for pagination |
| `startDate` | string | Start date in YYYY-MM-DD format |
| `endDate` | string | End date in YYYY-MM-DD format |
| `excludeIds` | array | Event IDs to exclude from results |

## Party Subcategories

The integration automatically detects and categorizes party events into the following subcategories:

- `nightclub` - Club events, nightlife, DJ events
- `festival` - Music festivals, cultural festivals
- `brunch` - Brunch parties
- `day party` - Daytime parties, pool parties
- `general` - Other party events

## Troubleshooting

If you encounter issues with the direct RapidAPI integration:

1. Check the browser console for error messages
2. Verify that your RapidAPI key is valid and has sufficient quota
3. Try different search parameters to see if the issue is specific to certain queries
4. Check the network tab in developer tools to see the actual API requests and responses

## Next Steps

After implementing the direct RapidAPI integration, consider these improvements:

1. Add caching to reduce API calls for repeated searches
2. Implement a fallback mechanism to use Supabase functions if direct calls fail
3. Add more detailed event information by combining data from multiple sources
4. Enhance the UI to display party subcategories and additional event details
