#!/bin/bash

# Set your API keys here
export TICKETMASTER_KEY="YOUR_TICKETMASTER_KEY"
export SERPAPI_KEY="YOUR_SERPAPI_KEY"
export PREDICTHQ_API_KEY="YOUR_PREDICTHQ_API_KEY"
export MAPBOX_TOKEN="YOUR_MAPBOX_TOKEN"

# Run the Supabase function locally
supabase functions serve search-events --no-verify-jwt
