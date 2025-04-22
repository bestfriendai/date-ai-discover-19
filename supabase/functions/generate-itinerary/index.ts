import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

// Make Perplexity API Key available in Edge Function environment secrets
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
if (!PERPLEXITY_API_KEY) {
  console.error('PERPLEXITY_API_KEY secret is NOT SET');
  // In production, you might want to return an error here
}

const SYSTEM_PROMPT = `You are an expert date planner. A user will give you a prompt describing their ideal date (location, date, activities, vibe, budget, etc.).
Your task is to find real, specific events and activities that fit the user's request.
Look for a variety of options if possible.
List the suggested events/activities in a structured format. Include:
- Title
- Date (YYYY-MM-DD)
- Time (HH:MM, 24-hour format if possible, or HH:MM AM/PM)
- Location Name (Venue or place name)
- Location Address (Full address if available)
- Category (e.g., music, arts, food, sports, party, activity, place)
- Brief Description
- Estimated Price (e.g., Free, $20, $50-$100)
- Coordinates (in [longitude, latitude] format if available or estimate based on location)

Format the list using Markdown or a clear numbered list. Do NOT output raw JSON in this response. Provide a friendly summary before and after the list.`;

// Function to call Perplexity API
async function callPerplexityAPI(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar', // Using the standard Sonar model
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    throw error;
  }
}

// Helper function to parse time strings
function parseTime(timeStr: string): string | null {
  // Handle formats like "7:00 PM", "19:00", "6pm"
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
  const match = timeStr.match(timeRegex);
  
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3] ? match[3].toLowerCase() : null;
    
    // Convert to 24-hour format if AM/PM is specified
    if (period === 'pm' && hours < 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { prompt, date, location } = await req.json();
    if (!prompt || !date) {
      return new Response(JSON.stringify({ error: 'Prompt and date are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Step 1: Get AI suggestions ---
    console.log('[AI_ITIN] Calling Perplexity API for prompt:', prompt);
    const userPrompt = `On ${date}${location ? ` in ${location}` : ''}, I want to plan a date. ${prompt}`;

    const aiResponseText = await callPerplexityAPI(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      PERPLEXITY_API_KEY
    );

    // --- Step 2: Parse AI response to extract event ideas ---
    const aiSuggestedItems = [];
    const lines = aiResponseText.split('\n');
    let currentItem = {};
    let itemCount = 0;
    let inItem = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for numbered list items or bullet points
      if (/^(\d+\.|-)/.test(trimmedLine)) {
        // If we were already processing an item, save it
        if (Object.keys(currentItem).length > 0) {
          if (currentItem.title && currentItem.startTime) {
            aiSuggestedItems.push({
              id: `ai-suggest-${itemCount++}`,
              title: currentItem.title,
              description: currentItem.description || '',
              startTime: currentItem.startTime,
              endTime: currentItem.endTime || currentItem.startTime,
              location: currentItem.location || '',
              coordinates: currentItem.coordinates || null,
              notes: currentItem.notes || '',
              type: 'CUSTOM',
              order: aiSuggestedItems.length
            });
          }
        }
        
        // Start a new item
        currentItem = {};
        inItem = true;
        
        // Extract title from the line
        const titleMatch = trimmedLine.match(/^(\d+\.|-)\s*(.+)/);
        if (titleMatch) {
          currentItem.title = titleMatch[2];
        }
        continue;
      }
      
      if (!inItem) continue;
      
      // Extract other properties
      if (trimmedLine.includes('Date:')) {
        const dateValue = trimmedLine.split('Date:')[1].trim();
        currentItem.date = dateValue;
      } else if (trimmedLine.includes('Time:')) {
        const timeValue = trimmedLine.split('Time:')[1].trim();
        const parsedTime = parseTime(timeValue);
        
        if (parsedTime && currentItem.date) {
          const [hours, minutes] = parsedTime.split(':').map(Number);
          const startDate = new Date(currentItem.date);
          startDate.setHours(hours, minutes, 0, 0);
          currentItem.startTime = startDate.toISOString();
          
          // Set end time to 1 hour after start time by default
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
          currentItem.endTime = endDate.toISOString();
        } else if (parsedTime) {
          // If we have time but no date, use the provided date parameter
          const [hours, minutes] = parsedTime.split(':').map(Number);
          const startDate = new Date(date);
          startDate.setHours(hours, minutes, 0, 0);
          currentItem.startTime = startDate.toISOString();
          
          // Set end time to 1 hour after start time by default
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
          currentItem.endTime = endDate.toISOString();
        }
      } else if (trimmedLine.includes('Location:') || trimmedLine.includes('Location Name:')) {
        const locationValue = trimmedLine.includes('Location:') 
          ? trimmedLine.split('Location:')[1].trim()
          : trimmedLine.split('Location Name:')[1].trim();
        currentItem.location = locationValue;
      } else if (trimmedLine.includes('Description:')) {
        const descriptionValue = trimmedLine.split('Description:')[1].trim();
        currentItem.description = descriptionValue;
      } else if (trimmedLine.includes('Coordinates:')) {
        const coordsMatch = trimmedLine.match(/\[\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]/);
        if (coordsMatch) {
          currentItem.coordinates = [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])];
        }
      } else if (trimmedLine.includes('Price:')) {
        const priceValue = trimmedLine.split('Price:')[1].trim();
        currentItem.notes = `Price: ${priceValue}`;
      } else if (trimmedLine === '') {
        // Empty line might indicate the end of an item
        if (Object.keys(currentItem).length > 0 && currentItem.title) {
          // If we don't have a start time yet but have a date, set a default time
          if (!currentItem.startTime && currentItem.date) {
            const startDate = new Date(currentItem.date);
            startDate.setHours(19, 0, 0, 0); // Default to 7:00 PM
            currentItem.startTime = startDate.toISOString();
            
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);
            currentItem.endTime = endDate.toISOString();
          } else if (!currentItem.startTime) {
            // If we don't have a date either, use the provided date parameter
            const startDate = new Date(date);
            startDate.setHours(19, 0, 0, 0); // Default to 7:00 PM
            currentItem.startTime = startDate.toISOString();
            
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);
            currentItem.endTime = endDate.toISOString();
          }
          
          // Add the item to our list
          aiSuggestedItems.push({
            id: `ai-suggest-${itemCount++}`,
            title: currentItem.title,
            description: currentItem.description || '',
            startTime: currentItem.startTime,
            endTime: currentItem.endTime || currentItem.startTime,
            location: currentItem.location || '',
            coordinates: currentItem.coordinates || null,
            notes: currentItem.notes || '',
            type: 'CUSTOM',
            order: aiSuggestedItems.length
          });
          
          // Reset for the next item
          currentItem = {};
          inItem = false;
        }
      }
    }
    
    // Add the last item if we have one
    if (Object.keys(currentItem).length > 0 && currentItem.title) {
      // If we don't have a start time yet but have a date, set a default time
      if (!currentItem.startTime && currentItem.date) {
        const startDate = new Date(currentItem.date);
        startDate.setHours(19, 0, 0, 0); // Default to 7:00 PM
        currentItem.startTime = startDate.toISOString();
        
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        currentItem.endTime = endDate.toISOString();
      } else if (!currentItem.startTime) {
        // If we don't have a date either, use the provided date parameter
        const startDate = new Date(date);
        startDate.setHours(19, 0, 0, 0); // Default to 7:00 PM
        currentItem.startTime = startDate.toISOString();
        
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        currentItem.endTime = endDate.toISOString();
      }
      
      aiSuggestedItems.push({
        id: `ai-suggest-${itemCount++}`,
        title: currentItem.title,
        description: currentItem.description || '',
        startTime: currentItem.startTime,
        endTime: currentItem.endTime || currentItem.startTime,
        location: currentItem.location || '',
        coordinates: currentItem.coordinates || null,
        notes: currentItem.notes || '',
        type: 'CUSTOM',
        order: aiSuggestedItems.length
      });
    }

    // --- Step 3: Create a new itinerary with the suggested items ---
    const { data: itinerary, error } = await supabaseClient
      .from('itineraries')
      .insert({
        name: `${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''} (${date})`,
        description: `Generated by AI based on "${prompt}"`,
        date: date,
        is_public: false,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('[AI_ITIN] Error creating itinerary:', error);
      throw error;
    }

    // Insert the itinerary items
    if (aiSuggestedItems.length > 0) {
      const itemsToInsert = aiSuggestedItems.map((item, index) => ({
        itinerary_id: itinerary.id,
        title: item.title,
        description: item.description,
        start_time: item.startTime,
        end_time: item.endTime,
        location_name: item.location,
        location_coordinates: item.coordinates ? `POINT(${item.coordinates[0]} ${item.coordinates[1]})` : null,
        notes: item.notes,
        type: item.type,
        "order": index
      }));

      const { error: itemsError } = await supabaseClient
        .from('itinerary_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('[AI_ITIN] Error creating itinerary items:', itemsError);
        throw itemsError;
      }
    }

    return new Response(JSON.stringify({ 
      id: itinerary.id,
      message: 'Itinerary generated successfully',
      itemCount: aiSuggestedItems.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[AI_ITIN] Critical Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
