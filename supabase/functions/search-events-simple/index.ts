// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Handle CORS preflight requests
function handleCors() {
  return new Response('ok', { headers: corsHeaders })
}

// Main function to handle requests
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCors()
  }

  // Add CORS headers to all responses
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  }

  try {
    // Parse request parameters
    const params = await req.json()

    // Log the request parameters
    console.log('Received request with params:', JSON.stringify(params, null, 2))

    // Create a simple response with mock data
    const response = {
      events: [
        {
          id: 'mock-event-1',
          source: 'mock',
          title: 'Mock Party Event',
          description: 'This is a mock party event for testing',
          date: '2023-12-31',
          time: '20:00',
          location: 'New York, NY',
          venue: 'Mock Venue',
          category: 'party',
          partySubcategory: 'club',
          image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
          coordinates: [-73.9857, 40.7484],
          url: 'https://example.com/event1',
          rank: 80,
          localRelevance: 90,
          attendance: {
            forecast: 500,
            actual: null
          },
          demandSurge: 1
        },
        {
          id: 'mock-event-2',
          source: 'mock',
          title: 'Mock Music Event',
          description: 'This is a mock music event for testing',
          date: '2023-12-25',
          time: '19:00',
          location: 'New York, NY',
          venue: 'Mock Concert Hall',
          category: 'music',
          image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
          coordinates: [-73.9857, 40.7484],
          url: 'https://example.com/event2',
          rank: 70,
          localRelevance: 80,
          attendance: {
            forecast: 300,
            actual: null
          },
          demandSurge: 0
        }
      ],
      sourceStats: {
        ticketmaster: {
          count: 1,
          error: null
        },
        predicthq: {
          count: 1,
          error: null
        },
        serpapi: {
          count: 0,
          error: null
        }
      },
      meta: {
        executionTime: 100,
        totalEvents: 2,
        pageSize: 2,
        page: 1
      }
    }

    // Return the response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers
    })
  } catch (error) {
    // Log the error
    console.error('Error processing request:', error)

    // Return an error response
    return new Response(JSON.stringify({
      error: 'An error occurred while processing your request',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/search-events-simple' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
