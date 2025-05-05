
import { createClient } from '@supabase/supabase-js';

// Default values for development - using the same values as the main project
const DEFAULT_SUPABASE_URL = 'https://akwvmljopucsnorvdwuu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

// Try to get from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function for calling Supabase edge functions
export async function callEdgeFunction(
  functionName: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  }
) {
  const { body, headers = {}, params = {} } = options || {};
  
  try {
    // Convert params object to query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    // Call edge function with optional body and headers
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers,
      ...(queryParams.toString() ? { query: queryParams.toString() } : {})
    });
    
    if (error) {
      throw new Error(`Error calling function ${functionName}: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Error calling edge function ${functionName}:`, error);
    throw error;
  }
}
