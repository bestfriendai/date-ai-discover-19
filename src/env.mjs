
// Simple environment variable access
export const env = {
  NEXT_PUBLIC_MAPBOX_TOKEN: typeof window !== 'undefined' 
    ? '' // Client-side, token should be set via environment variable
    : process.env.NEXT_PUBLIC_MAPBOX_TOKEN || import.meta.env?.VITE_MAPBOX_TOKEN || '',
};
