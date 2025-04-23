# DateAI Discover

A platform for discovering events and planning dates using React, TypeScript, Mapbox GL JS, and Supabase.

## Recent Improvements

### Map Markers
- Fixed issues with map markers not displaying correctly
- Added better coordinate validation to prevent errors
- Implemented coordinate jittering to prevent marker overlap
- Improved marker batching for better performance
- Enhanced selection state handling for markers

### PredictHQ Integration
- Improved party event detection with weighted keyword scoring
- Added rank-based filtering for higher quality events
- Enhanced party subcategory detection
- Implemented more sophisticated party scoring algorithm
- Optimized API parameters for better party event discovery

### Code Structure
- Added utility functions for map operations
- Improved error handling in Supabase functions
- Enhanced logging for better debugging

## Project info

**URL**: https://lovable.dev/projects/2da84342-b28e-49c1-9934-951077a5294b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2da84342-b28e-49c1-9934-951077a5294b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Mapbox GL JS
- Supabase
- PredictHQ API
- Ticketmaster API

## Project Structure

The project is organized as follows:

- `src/` - Frontend React application
  - `components/` - UI components
    - `map/` - Map-related components
    - `party/` - Party-specific components
  - `utils/` - Utility functions
  - `services/` - API service functions
  - `types/` - TypeScript type definitions
  - `hooks/` - Custom React hooks

- `supabase/` - Supabase backend
  - `functions/` - Supabase Edge Functions
    - `search-events/` - Function for searching events from multiple sources
    - `predicthq-fixed.ts` - Improved PredictHQ integration

## Key Features

- **Event Discovery**: Find events on an interactive map
- **Party AI**: Specialized discovery for party events
- **Itinerary Building**: Create and manage date plans
- **Favorites**: Save events for later
- **Chat**: AI-powered event recommendations

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2da84342-b28e-49c1-9934-951077a5294b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
