// Environment variables with defaults for development
export const env = {
  // Primary Supabase Project
  NEXT_PUBLIC_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://pccefxhpaxmlbkzrvzdl.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjY2VmeGhwYXhtbGJrenJ2emRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ0MzA0NzcsImV4cCI6MjAzMDAwNjQ3N30.Nh0fFdvJvQiQODsGZF_FtHZwgXEJBP3mI6MvZyDVLZU',

  // API URLs
  NEXT_PUBLIC_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  NEXT_PUBLIC_VERCEL_URL: import.meta.env.VITE_VERCEL_URL || '',
  NEXT_PUBLIC_VERCEL_ENV: import.meta.env.VITE_VERCEL_ENV || 'development',

  // Feature flags
  NEXT_PUBLIC_USE_UNIFIED_FUNCTION: import.meta.env.VITE_USE_UNIFIED_FUNCTION || 'false',

  // API Keys
  NEXT_PUBLIC_MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiYmVzdGZyaWVuZGFpIiwiYSI6ImNsdGJtZnRnZzBhcGoya3BjcWVtbWJvdXcifQ.Zy8lxHYC_-4TQU_l-l_QQA',
  NEXT_PUBLIC_RAPIDAPI_KEY: import.meta.env.VITE_RAPIDAPI_KEY || '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9',
};

// Log environment configuration in development
if (import.meta.env.DEV) {
  console.log('Environment configuration loaded:', {
    PRIMARY_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    API_URL: env.NEXT_PUBLIC_API_URL,
    VERCEL_ENV: env.NEXT_PUBLIC_VERCEL_ENV,
    USE_UNIFIED_FUNCTION: env.NEXT_PUBLIC_USE_UNIFIED_FUNCTION,
    MAPBOX_TOKEN_SET: !!env.NEXT_PUBLIC_MAPBOX_TOKEN,
    RAPIDAPI_KEY_SET: !!env.NEXT_PUBLIC_RAPIDAPI_KEY,
    // Don't log actual sensitive keys
  });
}
