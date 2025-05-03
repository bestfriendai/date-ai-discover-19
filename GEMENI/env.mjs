// This file is deprecated and will be removed in a future version
// Please use the config/env.ts module instead
// Import from '@/config/env' and use getConfig() or getApiKey()

import { loadEnvConfig } from './config/env';

// Load and validate environment variables
const config = loadEnvConfig();

// Environment variables with defaults for development
export const env = {
  // Primary Supabase Project (DateAI)
  NEXT_PUBLIC_SUPABASE_URL: config.VITE_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: config.VITE_SUPABASE_ANON_KEY,

  // Alternative Supabase Project (used in some components)
  ALT_SUPABASE_URL: config.VITE_ALT_SUPABASE_URL,
  ALT_SUPABASE_ANON_KEY: config.VITE_ALT_SUPABASE_ANON_KEY,

  // API URLs
  NEXT_PUBLIC_API_URL: config.VITE_API_URL,
  NEXT_PUBLIC_VERCEL_URL: config.VITE_VERCEL_URL,
  NEXT_PUBLIC_VERCEL_ENV: config.VITE_VERCEL_ENV,

  // Feature flags
  NEXT_PUBLIC_USE_UNIFIED_FUNCTION: config.VITE_USE_UNIFIED_FUNCTION,

  // API Keys
  NEXT_PUBLIC_MAPBOX_TOKEN: config.VITE_MAPBOX_TOKEN,
  NEXT_PUBLIC_RAPIDAPI_KEY: config.VITE_RAPIDAPI_KEY,
};

// Log environment configuration in development
if (import.meta.env.DEV) {
  console.log('[DEPRECATED] env.mjs is deprecated, please use config/env.ts instead');
  console.log('Environment configuration loaded:', {
    PRIMARY_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
    ALT_SUPABASE_URL: env.ALT_SUPABASE_URL ? 'Set' : 'Not set',
    API_URL: env.NEXT_PUBLIC_API_URL,
    VERCEL_ENV: env.NEXT_PUBLIC_VERCEL_ENV,
    USE_UNIFIED_FUNCTION: env.NEXT_PUBLIC_USE_UNIFIED_FUNCTION,
    MAPBOX_TOKEN_SET: !!env.NEXT_PUBLIC_MAPBOX_TOKEN,
    RAPIDAPI_KEY_SET: !!env.NEXT_PUBLIC_RAPIDAPI_KEY,
    // Don't log actual sensitive keys
  });
}
