import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getApiKey } from '@/config/env';

// Get Supabase configuration from environment
const SUPABASE_URL = getApiKey('supabase-url');
const SUPABASE_ANON_KEY = getApiKey('supabase-anon-key');

// Validate Supabase configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase configuration is missing. Please check your .env file.');
}

// Log initialization in development
if (import.meta.env.DEV) {
  console.log('Initializing Supabase client with URL:', SUPABASE_URL ? 'Set' : 'Not set');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);