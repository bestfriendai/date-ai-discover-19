import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

// Add your email service API key as a Supabase Secret
const EMAIL_SERVICE_API_KEY = Deno.env.get('EMAIL_SERVICE_API_KEY');
const FROM_EMAIL_ADDRESS = 'reminders@dateai.app'; // Configure this

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // This endpoint should be secured with a secret key
  const url = new URL(req.url);
  const secretKey = url.searchParams.get('key');
  const expectedKey = Deno.env.get('REMINDER_SECRET_KEY');
  
  if (!expectedKey || secretKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    // No need for user Auth context headers here
  );

  try {
    console.log('[SEND_REMINDERS] Starting reminder job');

    // --- Query for events/items needing reminders ---
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // Avoid sending reminders for events that just passed

    // Query favorites table
    const { data: favoriteReminders, error: favError } = await supabaseClient
      .from('favorites')
      .select('*, user:user_id(email), event:event_id(*)')
      .eq('reminders_enabled', true)
      .gte('event.date', oneHourAgo.toISOString().split('T')[0])
      .lte('event.date', twentyFourHoursFromNow.toISOString().split('T')[0])
      .is('reminder_sent_at', null);

    if (favError) {
      console.error('[SEND_REMINDERS] Error fetching favorites:', favError);
      throw favError;
    }

    // Query itinerary items table
    const { data: itineraryReminders, error: itinError } = await supabaseClient
      .from('itinerary_items')
      .select('*, itinerary:itinerary_id(user_id)')
      .eq('reminders_enabled', true)
      .gte('start_time', oneHourAgo.toISOString())
      .lte('start_time', twentyFourHoursFromNow.toISOString())
      .is('reminder_sent_at', null);

    if (itinError) {
      console.error('[SEND_REMINDERS] Error fetching itinerary items:', itinError);
      throw itinError;
    }

    // Get user emails for itinerary items
    const userIds = itineraryReminders?.map(item => item.itinerary?.user_id).filter(Boolean) || [];
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (usersError) {
      console.error('[SEND_REMINDERS] Error fetching user emails:', usersError);
      throw usersError;
    }

    // Create a map of user IDs to emails
    const userEmailMap = new Map();
    users?.forEach(user => {
      userEmailMap.set(user.id, user.email);
    });

    const remindersToSend = [];
    
    // Process favorite reminders
    if (favoriteReminders) {
      favoriteReminders.forEach(fav => {
        if (fav.user?.email && fav.event?.title) {
          remindersToSend.push({
            userId: fav.user_id,
            reminderId: fav.id,
            type: 'favorite',
            email: fav.user.email,
            title: fav.event.title,
            date: fav.event.date,
            time: fav.event.time,
            location: fav.event.venue || fav.event.location,
          });
        }
      });
    }

    // Process itinerary item reminders
    if (itineraryReminders) {
      itineraryReminders.forEach(item => {
        const userId = item.itinerary?.user_id;
        const userEmail = userId ? userEmailMap.get(userId) : null;
        
        if (userEmail && item.title) {
          const startTime = new Date(item.start_time);
          remindersToSend.push({
            userId: userId,
            reminderId: item.id,
            type: 'itinerary_item',
            email: userEmail,
            title: item.title,
            date: startTime.toISOString().split('T')[0],
            time: startTime.toTimeString().split(' ')[0],
            location: item.location_name,
          });
        }
      });
    }

    console.log(`[SEND_REMINDERS] Found ${remindersToSend.length} reminders to send`);

    // --- Send reminders ---
    const sentReminderIds = [];
    
    for (const reminder of remindersToSend) {
      try {
        // In a real implementation, you would use an email service like SendGrid, Postmark, etc.
        // For now, we'll just log the email that would be sent
        console.log(`[SEND_REMINDERS] Would send email to ${reminder.email} for "${reminder.title}" on ${reminder.date} at ${reminder.time}`);
        
        // Simulate sending email
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add to list of successfully sent reminders
        sentReminderIds.push({ id: reminder.reminderId, type: reminder.type });
      } catch (emailError) {
        console.error(`[SEND_REMINDERS] Failed to send email for "${reminder.title}":`, emailError);
        // Don't throw, continue sending others
      }
    }

    // --- Mark reminders as sent ---
    if (sentReminderIds.length > 0) {
      console.log(`[SEND_REMINDERS] Marking ${sentReminderIds.length} reminders as sent`);
      
      // Update favorites
      const favoriteIds = sentReminderIds.filter(r => r.type === 'favorite').map(r => r.id);
      if (favoriteIds.length > 0) {
        const { error: updateFavError } = await supabaseClient
          .from('favorites')
          .update({ reminder_sent_at: new Date().toISOString() })
          .in('id', favoriteIds);
          
        if (updateFavError) {
          console.error('[SEND_REMINDERS] Error updating favorites:', updateFavError);
        }
      }
      
      // Update itinerary items
      const itineraryItemIds = sentReminderIds.filter(r => r.type === 'itinerary_item').map(r => r.id);
      if (itineraryItemIds.length > 0) {
        const { error: updateItemError } = await supabaseClient
          .from('itinerary_items')
          .update({ reminder_sent_at: new Date().toISOString() })
          .in('id', itineraryItemIds);
          
        if (updateItemError) {
          console.error('[SEND_REMINDERS] Error updating itinerary items:', updateItemError);
        }
      }
    }

    console.log('[SEND_REMINDERS] Reminder job finished');
    return new Response(JSON.stringify({ 
      success: true, 
      sentCount: sentReminderIds.length,
      message: `Successfully processed ${sentReminderIds.length} reminders`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[SEND_REMINDERS] Critical Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
