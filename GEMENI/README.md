# GEMENI - Enhanced Party Event Discovery

GEMENI is a standalone application for discovering and exploring party events with enhanced detection and categorization capabilities.

## Features

- Advanced party event detection with semantic understanding
- Multi-label classification of party events into subcategories
- Interactive map view for exploring events
- Integration with multiple event data sources
- Responsive UI for both desktop and mobile
- Real-time filtering and searching

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Installation

1. Clone the repository
2. Navigate to the GEMENI directory
3. Install dependencies:

```bash
npm install
```

### Development

To start the development server:

```bash
npm run dev
```

This will start the Vite development server at [http://localhost:3000](http://localhost:3000).

### Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

- `/components` - Reusable UI components
- `/pages` - Application pages/routes
- `/hooks` - Custom React hooks
- `/utils` - Utility functions
- `/services` - API and service integrations
- `/contexts` - React context providers
- `/styles` - Global styles and theme configuration
- `/types` - TypeScript type definitions
- `/integrations` - External API integrations

## Party Detection System

The application includes an enhanced party detection system with:

- Semantic understanding of event descriptions
- Context analysis for better categorization
- Adaptive scoring based on multiple factors
- Multi-label classification for complex events
- Hierarchical category structure

## Technologies Used

- React 18
- TypeScript
- Vite
- React Router
- Framer Motion
- Mapbox GL
- Tailwind CSS
- Radix UI
- Supabase

## License

MIT