# DateAI - NEW Implementation

This folder contains a reimplementation of the DateAI application with a new backend approach. The main changes include:

## Key Features

- Direct RapidAPI integration for event data
- Mapbox integration for maps
- Maintained the same UI and flow as the original application

## Technology Stack

- React with TypeScript
- Mapbox GL for maps
- RapidAPI for event data
- Supabase for authentication and data storage
- Tailwind CSS for styling

## Implementation Details

### Backend Changes

The main change in this implementation is the removal of Supabase Edge Functions for fetching event data. Instead, the application now directly calls the RapidAPI endpoints from the frontend. This approach has several benefits:

1. Reduced latency by eliminating the extra hop through Supabase
2. Simplified development workflow
3. More direct control over API requests and responses

### API Integration

The RapidAPI integration is implemented in `src/services/eventService.ts`. This service handles:

- Fetching events based on location, date range, and other filters
- Transforming API responses to match our application's data model
- Detecting party events and categorizing them

### Map Integration

Mapbox is used for the map implementation, providing:

- Interactive maps with markers for events
- Geolocation services
- Custom styling options

### Component Structure

The application is organized into the following component structure:

#### Map Components
- `MapComponent`: Main map component that renders the Mapbox map
- `MapContent`: Layout component for the map page
- `MapSidebars`: Handles the left and right sidebars
- `MapControlsArea`: Contains map controls like search and filters
- `MapControlsContainer`: Container for map style and location controls
- `MapLoadingOverlay`: Overlay shown during map loading
- `MapDebugOverlay`: Debug information overlay (development only)
- `TerrainToggle`: Toggle for 3D terrain

#### Party Components
- `PartyContent`: Layout component for the party page
- `PartyMapMarkers`: Custom markers for party events
- `PartySubcategoryBadge`: Badge component for party subcategories

#### Hooks
- `useMapState`: Manages map state (center, zoom, etc.)
- `useMapFilters`: Manages filter state
- `useMapEvents`: Handles map events
- `useMapInitialization`: Initializes the Mapbox map
- `useMapPopup`: Manages map popups
- `useEventSearch`: Centralizes event fetching logic
- `useKeyboardNavigation`: Handles keyboard shortcuts

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_MAPBOX_TOKEN=your_mapbox_token
   VITE_RAPIDAPI_KEY=your_rapidapi_key
   ```
4. Run the development server with `npm run dev`

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_MAPBOX_TOKEN`: Your Mapbox access token
- `VITE_RAPIDAPI_KEY`: Your RapidAPI key for the real-time-events-search API

## API Keys

The application uses the following default API keys for development:

- Mapbox: `pk.eyJ1IjoiYmVzdGZyaWVuZGFpIiwiYSI6ImNsdGJtZnRnZzBhcGoya3BjcWVtbWJvdXcifQ.Zy8lxHYC_-4TQU_l-l_QQA`
- RapidAPI: `92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9`

**Note:** These keys are provided for development purposes only. For production, you should use your own API keys.

## Features

### Map Page
- Interactive map with event markers
- Event list sidebar
- Event details sidebar
- Search functionality
- Filter by date, category, and keywords
- Geolocation support

### Party Page
- Party-focused event display
- Categorized party events
- Custom party markers
- Party details sidebar
- Search and filter functionality
