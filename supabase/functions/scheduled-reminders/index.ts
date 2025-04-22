import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This function is meant to be called by a scheduler
serve(async (req) => {
  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the event reminders function
    const { error: eventError } = await supabaseAdmin.rpc('send_event_reminders');
    if (eventError) {
      console.error('Error sending event reminders:', eventError);
    }

    // Call the itinerary reminders function
    const { error: itineraryError } = await supabaseAdmin.rpc('send_itinerary_reminders');
    if (itineraryError) {
      console.error('Error sending itinerary reminders:', itineraryError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reminders processed successfully',
        eventError: eventError ? eventError.message : null,
        itineraryError: itineraryError ? itineraryError.message : null
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scheduled-reminders function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
