import { Event } from '@/types';

// Define the Perplexity API message types
interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Define the chat history type
export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Function to call the Perplexity API
export async function callPerplexityAPI(
  messages: PerplexityMessage[],
  apiKey: string = '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'
): Promise<string> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3-sonar-small-32k-online',
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

    const data: PerplexityResponse = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    throw error;
  }
}

// Function to extract events from Perplexity response
export function extractEventsFromResponse(response: string): Event[] {
  try {
    // Look for event data in JSON format
    const jsonMatch = response.match(/```json([\s\S]*?)```/);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        
        // Handle array of events
        if (Array.isArray(jsonData)) {
          return jsonData.map(normalizeExtractedEvent);
        }
        
        // Handle single event object
        if (jsonData.title) {
          return [normalizeExtractedEvent(jsonData)];
        }
        
        // Handle object with events property
        if (jsonData.events && Array.isArray(jsonData.events)) {
          return jsonData.events.map(normalizeExtractedEvent);
        }
      } catch (e) {
        console.error('Error parsing JSON from response:', e);
      }
    }
    
    // If no JSON found, try to extract event information from text
    return extractEventsFromText(response);
  } catch (error) {
    console.error('Error extracting events from response:', error);
    return [];
  }
}

// Helper function to normalize extracted event data
function normalizeExtractedEvent(eventData: any): Event {
  // Generate a unique ID for the event
  const id = `perplexity-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Extract date and time
  let date = eventData.date || new Date().toISOString().split('T')[0];
  let time = eventData.time || '19:00';
  
  // If date is in a different format, try to parse it
  if (date && typeof date === 'string' && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    try {
      const dateObj = new Date(date);
      date = dateObj.toISOString().split('T')[0];
    } catch (e) {
      date = new Date().toISOString().split('T')[0];
    }
  }
  
  // Extract coordinates
  let coordinates: [number, number] | undefined = undefined;
  if (eventData.coordinates && Array.isArray(eventData.coordinates) && eventData.coordinates.length === 2) {
    coordinates = [eventData.coordinates[0], eventData.coordinates[1]];
  } else if (eventData.longitude !== undefined && eventData.latitude !== undefined) {
    coordinates = [eventData.longitude, eventData.latitude];
  }
  
  return {
    id,
    source: 'perplexity',
    title: eventData.title || 'Unknown Event',
    description: eventData.description || 'No description available',
    date,
    time,
    location: eventData.location || 'Location not specified',
    venue: eventData.venue || eventData.location || 'Venue not specified',
    category: eventData.category || 'event',
    image: eventData.image || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
    coordinates,
    url: eventData.url || '',
    price: eventData.price || ''
  };
}

// Function to extract events from text response
function extractEventsFromText(text: string): Event[] {
  const events: Event[] = [];
  
  // Look for event patterns in the text
  const eventSections = text.split(/Event \d+:|Event:|Here are some events:|Here's an event:/i);
  
  for (let i = 1; i < eventSections.length; i++) {
    const section = eventSections[i].trim();
    if (!section) continue;
    
    // Extract event details
    const titleMatch = section.match(/Title:?\s*([^\n]+)/i) || section.match(/Name:?\s*([^\n]+)/i);
    const dateMatch = section.match(/Date:?\s*([^\n]+)/i);
    const timeMatch = section.match(/Time:?\s*([^\n]+)/i);
    const locationMatch = section.match(/Location:?\s*([^\n]+)/i) || section.match(/Venue:?\s*([^\n]+)/i);
    const descriptionMatch = section.match(/Description:?\s*([^\n]+)/i);
    
    if (titleMatch) {
      const title = titleMatch[1].trim();
      
      // Create event object
      const event: Event = {
        id: `perplexity-text-${Date.now()}-${i}`,
        source: 'perplexity',
        title,
        description: descriptionMatch ? descriptionMatch[1].trim() : section,
        date: dateMatch ? formatDate(dateMatch[1].trim()) : new Date().toISOString().split('T')[0],
        time: timeMatch ? formatTime(timeMatch[1].trim()) : '19:00',
        location: locationMatch ? locationMatch[1].trim() : 'Location not specified',
        venue: locationMatch ? locationMatch[1].trim() : 'Venue not specified',
        category: 'event',
        image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop'
      };
      
      events.push(event);
    }
  }
  
  return events;
}

// Helper function to format date
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

// Helper function to format time
function formatTime(timeStr: string): string {
  // Try to extract time in 24-hour format
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  
  // Try to parse AM/PM format
  const ampmMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0;
    const isPM = ampmMatch[3].toLowerCase() === 'pm';
    
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return '19:00'; // Default time
}
