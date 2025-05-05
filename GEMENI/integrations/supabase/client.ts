import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Default values for development - using the same values as the main project
const DEFAULT_SUPABASE_URL = 'https://akwvmljopucsnorvdwuu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

// Try to get from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Please check your .env file.');
}

// Log initialization in development
if (import.meta.env.DEV) {
  console.log('Initializing Supabase client with URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('Using project reference:', supabaseUrl.includes('akwvmljopucsnorvdwuu') ? 'dateapril' : 'custom');
}

// Export the supabase client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);