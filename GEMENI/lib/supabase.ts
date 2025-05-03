
// DEPRECATED: This file is deprecated and will be removed in a future version
// Please use @/integrations/supabase/client.ts instead

// Add Vite environment type definition
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import { getApiKey } from '@/config/env';

// Get Supabase configuration from environment
const supabaseUrl = getApiKey('supabase-url');
const supabaseAnonKey = getApiKey('supabase-anon-key');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Log in development only
if (import.meta.env.DEV) {
  console.log('[DEPRECATED] lib/supabase.ts is deprecated, please use integrations/supabase/client.ts instead');
  console.log('Initializing Supabase client with URL:', supabaseUrl ? 'Set' : 'Not set');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
