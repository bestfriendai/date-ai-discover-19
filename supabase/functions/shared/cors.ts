/**
 * CORS Headers Utility
 * 
 * Provides standardized CORS headers for Supabase Edge Functions
 */

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://date-ai-discover.vercel.app',
  'https://date-ai.app'
];

// Export CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for now, can be restricted in production
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, X-Client-Info'
};

/**
 * Get CORS headers with origin validation
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  // If no origin is provided, use default headers
  if (!requestOrigin) {
    return corsHeaders;
  }
  
  // Check if the origin is allowed
  const isAllowedOrigin = allowedOrigins.includes(requestOrigin);
  
  // Return headers with specific origin if allowed
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': isAllowedOrigin ? requestOrigin : '*'
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(requestOrigin?: string): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(requestOrigin)
  });
}
