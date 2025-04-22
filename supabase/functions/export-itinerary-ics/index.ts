import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  try {
    const url = new URL(req.url);
    const itineraryId = url.searchParams.get('id');

    if (!itineraryId) {
      return new Response(JSON.stringify({ error: 'Itinerary ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch the itinerary (RLS policies should ensure only the owner or public can access)
    const { data: itinerary, error: itineraryError } = await supabaseClient
      .from('itineraries')
      .select('*, itinerary_items(*)')
      .eq('id', itineraryId)
      .single();

    if (itineraryError) {
      console.error('[EXPORT_ICS] Error fetching itinerary:', itineraryError);
      return new Response(JSON.stringify({ error: 'Itinerary not found or access denied' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!itinerary) {
      return new Response(JSON.stringify({ error: 'Itinerary not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Generate iCalendar content ---
    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DateAI//NONSGML Export//EN\n`;

    for (const item of itinerary.itinerary_items) {
      // Ensure timestamps are in the correct format (YYYYMMDDTHHMMSSZ for UTC)
      // Assuming start_time/end_time are ISO strings from the database
      const startUTC = new Date(item.start_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const endUTC = new Date(item.end_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

      icsContent += `BEGIN:VEVENT\n`;
      icsContent += `UID:${item.id}@dateai.com\n`; // Unique identifier
      icsContent += `SUMMARY:${item.title}\n`;
      icsContent += `DTSTART:${startUTC}\n`;
      icsContent += `DTEND:${endUTC}\n`;
      
      if (item.location_name) {
        icsContent += `LOCATION:${item.location_name}\n`;
      }
      
      if (item.description || item.notes) {
        const description = [item.description, item.notes].filter(Boolean).join('\\n\\n');
        icsContent += `DESCRIPTION:${description.replace(/\n/g, '\\n')}\n`;
      }
      
      // Add URL if available (for EVENT type)
      if (item.type === 'EVENT' && item.event_id) {
        icsContent += `URL:https://dateai.app/event/${item.event_id}\n`;
      }
      
      icsContent += `END:VEVENT\n`;
    }

    icsContent += `END:VCALENDAR\n`;

    // Return the ICS file
    return new Response(icsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${itinerary.name.replace(/\s+/g, '_')}.ics"`,
      },
      status: 200,
    });

  } catch (error) {
    console.error('[EXPORT_ICS] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
