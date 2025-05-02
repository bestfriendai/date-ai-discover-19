import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get from environment variables with fallbacks
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pccefxhpaxmlbkzrvzdl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjY2VmeGhwYXhtbGJrenJ2emRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ0MzA0NzcsImV4cCI6MjAzMDAwNjQ3N30.Nh0fFdvJvQiQODsGZF_FtHZwgXEJBP3mI6MvZyDVLZU';

// Log initialization in development
if (import.meta.env.DEV) {
  console.log('Initializing Supabase client with URL:', SUPABASE_URL);
}

// Create and export the supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
