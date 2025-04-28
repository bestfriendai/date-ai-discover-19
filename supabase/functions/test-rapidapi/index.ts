import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Function to get the API key from environment variables
function getApiKey(name: string): string | null {
  const key = Deno.env.get(name);
  return key || null;
}

serve(async (req) => {
  try {
    // Get the RapidAPI key
    const rapidApiKey = getApiKey('RAPIDAPI_KEY');
    const xRapidApiKey = getApiKey('X_RAPIDAPI_KEY');
    
    // Test if the key works with a simple request
    let testResult = null;
    
    if (rapidApiKey) {
      try {
        const response = await fetch('https://real-time-events-search.p.rapidapi.com/search-events?query=popular%20events&date=week&is_virtual=false&start=0', {
          method: 'GET',
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          testResult = {
            status: response.status,
            success: true,
            dataLength: data.data?.length || 0,
            eventsLength: data.events?.length || 0
          };
        } else {
          testResult = {
            status: response.status,
            success: false,
            error: await response.text()
          };
        }
      } catch (error) {
        testResult = {
          success: false,
          error: error.message
        };
      }
    }
    
    return new Response(
      JSON.stringify({
        rapidApiKeyAvailable: !!rapidApiKey,
        xRapidApiKeyAvailable: !!xRapidApiKey,
        rapidApiKeyMasked: rapidApiKey ? `${rapidApiKey.substring(0, 4)}...${rapidApiKey.substring(rapidApiKey.length - 4)}` : null,
        xRapidApiKeyMasked: xRapidApiKey ? `${xRapidApiKey.substring(0, 4)}...${xRapidApiKey.substring(xRapidApiKey.length - 4)}` : null,
        testResult
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
