// Direct test script for RapidAPI Events Search API with focus on party events
import fetch from 'node-fetch';

// RapidAPI key
const RAPIDAPI_KEY = '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9';

// Import the enhanceEventDescription function logic directly
function enhanceEventDescription(event, isPartyEvent, partySubcategory) {
  try {
    // Start with the original description if available
    let originalDesc = event.description || '';
    
    // Clean up the description - remove excessive whitespace, HTML tags, etc.
    originalDesc = originalDesc
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim();
    
    // If we have a good description already (more than 100 chars), just clean it up
    if (originalDesc.length > 100) {
      return originalDesc;
    }
    
    // Build an enhanced description
    const descriptionParts = [];
    
    // Add event title if description is empty
    if (!originalDesc) {
      descriptionParts.push(`Join us for ${event.title || 'this exciting event'}.`);
    } else {
      descriptionParts.push(originalDesc);
    }
    
    // Add venue information if available
    if (event.venue) {
      const venueName = event.venue.name;
      const venueLocation = event.venue.full_address || 
        [event.venue.city, event.venue.state, event.venue.country].filter(Boolean).join(', ');
      
      if (venueName) {
        descriptionParts.push(`Taking place at ${venueName}${venueLocation ? ` in ${venueLocation}` : ''}.`);
      } else if (venueLocation) {
        descriptionParts.push(`Located in ${venueLocation}.`);
      }
    }
    
    // Add party-specific context based on subcategory
    if (isPartyEvent) {
      switch(partySubcategory) {
        case 'brunch':
          descriptionParts.push(
            "This brunch party combines delicious food, refreshing drinks, and a lively social atmosphere. " +
            "Perfect for starting your day with good vibes and great company."
          );
          break;
        case 'day-party':
          descriptionParts.push(
            "This day party offers the perfect blend of daytime fun and nightlife energy. " +
            "Enjoy music, dancing, and socializing in a vibrant daytime atmosphere."
          );
          break;
        case 'club':
          descriptionParts.push(
            "Experience an unforgettable night at this club event featuring great music, " +
            "an energetic dance floor, and the perfect atmosphere to let loose and enjoy yourself."
          );
          break;
        case 'social':
          descriptionParts.push(
            "This social gathering brings people together in a relaxed and friendly environment. " +
            "Connect with others, enjoy conversations, and make new friends."
          );
          break;
        case 'networking':
          descriptionParts.push(
            "This networking event provides the perfect opportunity to connect with professionals, " +
            "expand your circle, and engage in meaningful conversations in a social setting."
          );
          break;
        case 'celebration':
          descriptionParts.push(
            "Join this celebration event filled with excitement, entertainment, and memorable moments. " +
            "Come together to commemorate this special occasion."
          );
          break;
        case 'immersive':
          descriptionParts.push(
            "This immersive experience transports you to another world through interactive elements, " +
            "sensory engagement, and creative expression. Prepare for a unique and captivating event."
          );
          break;
        case 'popup':
          descriptionParts.push(
            "This exclusive popup event offers a limited-time experience in a unique setting. " +
            "Don't miss this rare opportunity to be part of something special and unexpected."
          );
          break;
        case 'silent':
          descriptionParts.push(
            "This silent party features wireless headphones with multiple channels of music. " +
            "Dance to your preferred beats while socializing in a unique audio environment."
          );
          break;
        case 'rooftop':
          descriptionParts.push(
            "Enjoy stunning views and open-air vibes at this rooftop event. " +
            "The perfect setting for socializing, dancing, and creating memories against a scenic backdrop."
          );
          break;
        default: // general party
          descriptionParts.push(
            "This party event promises a great time with music, entertainment, and a lively atmosphere. " +
            "Come ready to enjoy yourself and create memorable experiences."
          );
      }
    }
    
    // Add time information if available
    if (event.date_human_readable || event.start_time) {
      const dateInfo = event.date_human_readable || '';
      const timeInfo = event.start_time || '';
      if (dateInfo && timeInfo) {
        descriptionParts.push(`Event takes place on ${dateInfo} at ${timeInfo}.`);
      } else if (dateInfo) {
        descriptionParts.push(`Event takes place on ${dateInfo}.`);
      } else if (timeInfo) {
        descriptionParts.push(`Event starts at ${timeInfo}.`);
      }
    }
    
    // Join all parts with proper spacing
    return descriptionParts.join(' ');
  } catch (error) {
    console.error('Error enhancing description:', error);
    // Return original description as fallback
    return event.description || '';
  }
}

// Helper function to detect party events
function isPartyEvent(event) {
  const partyKeywords = [
    'party', 'club', 'nightlife', 'dance', 'dj',
    'festival', 'celebration', 'gala', 'mixer', 'nightclub',
    'disco', 'bash', 'soiree', 'fiesta', 'get-together'
  ];
  
  const title = (event.title || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const venue = (event.venue?.name || '').toLowerCase();
  
  return partyKeywords.some(kw => title.includes(kw)) || 
         partyKeywords.some(kw => description.includes(kw)) ||
         (event.category && event.category.toLowerCase().includes('party')) ||
         (venue.includes('club') || venue.includes('lounge'));
}

// Helper function to detect party subcategory
function detectPartySubcategory(event) {
  const title = (event.title || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  
  if (title.includes('brunch') || description.includes('brunch')) {
    return 'brunch';
  } else if ((title.includes('day') && title.includes('party')) ||
             (description.includes('day') && description.includes('party'))) {
    return 'day-party';
  } else if (title.includes('club') || description.includes('club') ||
             (event.venue?.name || '').toLowerCase().includes('club')) {
    return 'club';
  } else {
    return 'general';
  }
}

async function testPartyDescriptionsDirect() {
  try {
    console.log('===== TESTING PARTY EVENT DESCRIPTIONS DIRECTLY =====');

    // Build the query URL for party events
    const queryParams = new URLSearchParams();
    queryParams.append('query', 'party events in New York');
    queryParams.append('date', 'month'); // Get events for the next month
    queryParams.append('is_virtual', 'false');
    queryParams.append('limit', '10'); // Limit to 10 events for clearer output
    queryParams.append('start', '0');

    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;

    console.log(`Request URL: ${url}`);
    console.log('Using RapidAPI key:', `${RAPIDAPI_KEY.substring(0, 4)}...${RAPIDAPI_KEY.substring(RAPIDAPI_KEY.length - 4)}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
    }

    const data = await response.json();

    if (!data.events || !Array.isArray(data.events)) {
      console.error('Invalid response format from RapidAPI');
      console.log('Full response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log(`Success! Received ${data.events.length} events from RapidAPI`);
    
    // Filter for party events
    const partyEvents = data.events.filter(event => isPartyEvent(event));
    console.log(`Found ${partyEvents.length} party events out of ${data.events.length} total events`);
    
    // Display party events with original and enhanced descriptions
    if (partyEvents.length > 0) {
      console.log("\n===== PARTY EVENT DESCRIPTIONS COMPARISON =====");
      partyEvents.forEach((event, index) => {
        const isParty = true; // We already filtered for party events
        const subcategory = detectPartySubcategory(event);
        
        console.log(`\n----- Party Event ${index + 1} -----`);
        console.log(`Title: ${event.title}`);
        console.log(`Subcategory: ${subcategory}`);
        console.log(`Venue: ${event.venue?.name || 'N/A'}`);
        console.log(`Location: ${[event.venue?.city, event.venue?.state, event.venue?.country].filter(Boolean).join(', ') || 'N/A'}`);
        
        // Display original description
        console.log(`\nORIGINAL DESCRIPTION:\n${event.description || 'No description available'}`);
        
        // Display enhanced description
        const enhancedDesc = enhanceEventDescription(event, isParty, subcategory);
        console.log(`\nENHANCED DESCRIPTION:\n${enhancedDesc}`);
        
        // Add a separator for better readability
        console.log("\n" + "=".repeat(50));
      });
    } else {
      console.log("No party events found.");
    }

  } catch (error) {
    console.error("Error testing RapidAPI directly:", error);
  }
}

testPartyDescriptionsDirect();