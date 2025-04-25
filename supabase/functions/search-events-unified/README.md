# Unified Search Events Function

This Supabase Edge Function provides a unified API for searching events from multiple sources, including Ticketmaster and PredictHQ.

## Features

- Fetches events from both Ticketmaster and PredictHQ APIs
- Normalizes event data to a consistent format
- Supports location-based search (coordinates or place name)
- Filters events by date range, categories, and keywords
- Ensures events have coordinates for map display
- Sorts events by date (soonest first)

## API Parameters

The function accepts the following parameters in the request body:

```json
{
  "latitude": 34.0522,
  "longitude": -118.2437,
  "radius": 25,
  "startDate": "2023-12-01",
  "endDate": "2023-12-31",
  "categories": ["music", "arts", "sports", "family", "food"],
  "keyword": "concert",
  "location": "Los Angeles",
  "limit": 50,
  "page": 1,
  "excludeIds": ["ticketmaster-123", "predicthq-456"]
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `latitude` | number | User's latitude coordinate |
| `longitude` | number | User's longitude coordinate |
| `radius` | number | Search radius in miles (5-100) |
| `startDate` | string | Start date in YYYY-MM-DD format |
| `endDate` | string | End date in YYYY-MM-DD format |
| `categories` | string[] | Event categories to include |
| `keyword` | string | Search keyword |
| `location` | string | Location name (used if coordinates not provided) |
| `limit` | number | Maximum number of events to return |
| `page` | number | Page number for pagination |
| `excludeIds` | string[] | Event IDs to exclude from results |

## Response Format

The function returns a JSON response with the following structure:

```json
{
  "events": [
    {
      "id": "ticketmaster-123",
      "source": "ticketmaster",
      "title": "Event Title",
      "description": "Event description",
      "date": "2023-12-31",
      "time": "20:00",
      "location": "Venue Name, City, State",
      "venue": "Venue Name",
      "category": "music",
      "image": "https://example.com/image.jpg",
      "coordinates": [-118.2437, 34.0522],
      "url": "https://example.com/event",
      "price": "25.00 - 75.00 USD"
    }
  ],
  "sourceStats": {
    "ticketmaster": { "count": 10, "error": null },
    "predicthq": { "count": 5, "error": null }
  },
  "meta": {
    "executionTime": 1234,
    "totalEvents": 15,
    "eventsWithCoordinates": 15,
    "timestamp": "2023-12-01T12:00:00.000Z"
  }
}
```

## Environment Variables

The function requires the following environment variables:

- `TICKETMASTER_KEY`: Ticketmaster API key
- `PREDICTHQ_API_KEY`: PredictHQ API key

## Deployment

To deploy the function to Supabase:

```bash
supabase functions deploy search-events-unified
```

Or use the provided PowerShell script:

```powershell
./deploy-unified-function.ps1
```

## Testing

To test the function locally:

```bash
node test-local-function.js
```

To test the deployed function:

```bash
node test-unified-function.js
```
