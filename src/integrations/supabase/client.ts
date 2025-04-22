// This file contains the Supabase client configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase project URL and anon key
const SUPABASE_URL = "https://akwvmljopucsnorvdwuu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk";

// Client options with better defaults
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'dateai-app'
    },
  },
  db: {
    schema: 'public'
  },
  realtime: {
    timeout: 30000, // Increased timeout for better reliability
    params: {
      eventsPerSecond: 10
    }
  }
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Create and export the typed Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  supabaseOptions
);

// Helper function to check if Supabase is available
export const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('events').select('id').limit(1);
    return !error;
  } catch (e) {
    console.error('Supabase connection error:', e);
    return false;
  }
};