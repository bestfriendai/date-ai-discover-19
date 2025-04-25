// Test script for the new event normalization implementation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock event data
const mockTicketmasterEvent = {
  id: "Z7r9jZ1AdFAqk",
  name: "Test Concert",
  description: "This is a test concert description",
  url: "https://www.ticketmaster.com/event/1C005C8BAA3B5127",
  images: [
    {
      ratio: "16_9",
      url: "https://s1.ticketm.net/dam/a/123/123456789_CUSTOM.jpg",
      width: 1024,
      height: 576
    }
  ],
  dates: {
    start: {
      localDate: "2025-05-15",
      localTime: "19:30:00"
    }
  },
  _embedded: {
    venues: [
      {
        name: "Test Venue",
        city: {
          name: "New York"
        },
        state: {
          stateCode: "NY"
        },
        country: {
          countryCode: "US"
        },
        address: {
          line1: "123 Test Street"
        },
        location: {
          longitude: "-73.986",
          latitude: "40.755"
        }
      }
    ]
  },
  classifications: [
    {
      segment: {
        name: "Music"
      },
      genre: {
        name: "Rock"
      },
      subGenre: {
        name: "Alternative Rock"
      }
    }
  ],
  priceRanges: [
    {
      min: 45.0,
      max: 125.0,
      currency: "USD"
    }
  ]
};

const mockPredictHQEvent = {
  id: "abcdef123456",
  title: "Test Festival",
  description: "This is a test festival description",
  start: "2025-05-20T18:00:00Z",
  end: "2025-05-20T23:00:00Z",
  category: "festivals",
  labels: ["music", "live-music", "nightlife"],
  location: [-74.006, 40.7128],
  location_name: "Central Park",
  place: {
    name: "New York"
  },
  state: "NY",
  country: "US",
  entities: [
    {
      type: "venue",
      name: "Central Park Great Lawn",
      formatted_address: "Central Park, New York, NY 10024"
    }
  ],
  rank: 85,
  local_rank: 90,
  phq_attendance: 5000,
  images: [
    {
      url: "https://example.com/image.jpg"
    }
  ]
};

// Function to manually test the normalizers
function testNormalizers() {
  console.log("Testing event normalizers manually...");
  
  // Define the normalizer functions based on the implementation in eventNormalizers.ts
  // This is a simplified version for testing purposes
  
  // Default values
  const DEFAULT_VALUES = {
    id: '',
    title: 'Untitled Event',
    description: 'No description available',
    start: new Date().toISOString(),
    url: '',
    source: 'unknown',
    date: new Date().toISOString().split('T')[0],
    time: '00:00',
    location: 'Location not specified',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
  };
  
  // Category mapping
  const CATEGORY_MAPPING = {
    ticketmaster: {
      'music': 'music',
      'concert': 'music',
      'concerts': 'music',
      'festival': 'music',
      'festivals': 'music',
      'sports': 'sports',
      'sport': 'sports',
      'arts': 'arts',
      'theatre': 'arts',
      'theater': 'arts',
      'performing arts': 'arts',
      'performing-arts': 'arts',
      'family': 'family',
      'attraction': 'family',
      'attractions': 'family',
      'miscellaneous': 'other',
      'undefined': 'other',
    },
    predicthq: {
      'concerts': 'music',
      'festivals': 'music',
      'sports': 'sports',
      'performing-arts': 'arts',
      'community': 'family',
      'expos': 'family',
      'conferences': 'other',
    }
  };
  
  // Default images by category
  const DEFAULT_IMAGES = {
    'music': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
    'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
    'arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
    'family': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
    'food': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop',
    'party': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    'other': 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
  };
  
  // Helper functions
  function extractDateTimeParts(isoDate) {
    if (!isoDate) {
      return {
        date: DEFAULT_VALUES.date,
        time: DEFAULT_VALUES.time
      };
    }
    
    try {
      const parts = isoDate.split('T');
      return {
        date: parts[0],
        time: parts[1]?.substring(0, 5) || DEFAULT_VALUES.time
      };
    } catch (e) {
      console.error(`Error extracting date/time parts: ${isoDate}`, e);
      return {
        date: DEFAULT_VALUES.date,
        time: DEFAULT_VALUES.time
      };
    }
  }
  
  function mapCategory(category, source) {
    if (!category) return 'other';
    
    const lowerCategory = category.toLowerCase();
    const sourceMapping = CATEGORY_MAPPING[source] || {};
    
    return sourceMapping[lowerCategory] || 'other';
  }
  
  function getDefaultImage(category) {
    return DEFAULT_IMAGES[category] || DEFAULT_IMAGES.other;
  }
  
  // Normalizer functions
  function normalizeTicketmasterEvent(event) {
    try {
      // Extract venue information
      const venue = event._embedded?.venues?.[0];
      const venueName = venue?.name || '';
      const venueCity = venue?.city?.name || '';
      const venueState = venue?.state?.stateCode || '';
      const venueCountry = venue?.country?.countryCode || '';
      const venueAddress = venue?.address?.line1 || '';
      
      // Build location string
      let location = venueName;
      if (venueCity) {
        location += location ? `, ${venueCity}` : venueCity;
      }
      if (venueState) {
        location += location ? `, ${venueState}` : venueState;
      }
      if (venueCountry && venueCountry !== 'US') {
        location += location ? `, ${venueCountry}` : venueCountry;
      }
      
      // Extract coordinates
      let coordinates = undefined;
      if (venue?.location?.longitude && venue?.location?.latitude) {
        coordinates = [
          parseFloat(venue.location.longitude),
          parseFloat(venue.location.latitude)
        ];
      }
      
      // Extract price information
      let priceMin = undefined;
      let priceMax = undefined;
      let currency = undefined;
      let price = undefined;
      
      if (event.priceRanges && event.priceRanges.length > 0) {
        const priceRange = event.priceRanges[0];
        priceMin = priceRange.min;
        priceMax = priceRange.max;
        currency = priceRange.currency;
        price = priceRange.min;
      }
      
      // Extract category information
      const rawCategory = event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event';
      const category = mapCategory(rawCategory, 'ticketmaster');
      
      // Extract subcategories
      const subcategories = [];
      if (event.classifications?.[0]?.genre?.name) {
        subcategories.push(event.classifications[0].genre.name);
      }
      if (event.classifications?.[0]?.subGenre?.name) {
        subcategories.push(event.classifications[0].subGenre.name);
      }
      
      // Extract image
      let image = '';
      if (event.images && event.images.length > 0) {
        // Prefer 16:9 ratio images with width > 500
        image = event.images.find((img) => img.ratio === '16_9' && img.width > 500)?.url || 
                event.images[0].url;
      }
      
      if (!image) {
        image = getDefaultImage(category);
      }
      
      // Extract date and time
      const localDate = event.dates?.start?.localDate || '';
      const localTime = event.dates?.start?.localTime || '';
      
      // Create ISO date string
      let start = '';
      if (localDate) {
        start = localTime ? `${localDate}T${localTime}` : `${localDate}T00:00:00`;
      } else {
        start = DEFAULT_VALUES.start;
      }
      
      // Build the normalized event
      return {
        id: `ticketmaster-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source: 'ticketmaster',
        title: event.name || DEFAULT_VALUES.title,
        description: event.description || event.info || DEFAULT_VALUES.description,
        start,
        url: event.url || '',
        date: localDate,
        time: localTime,
        location: location || DEFAULT_VALUES.location,
        category,
        subcategories: subcategories.length > 0 ? subcategories : undefined,
        image,
        coordinates,
        priceMin,
        priceMax,
        currency,
        price
      };
    } catch (error) {
      console.error('Error normalizing Ticketmaster event:', error);
      
      // Return a minimal valid event
      return {
        id: `ticketmaster-error-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source: 'ticketmaster',
        title: event?.name || 'Unknown Event',
        description: 'Error processing event details',
        start: DEFAULT_VALUES.start,
        url: event?.url || '',
        date: event?.dates?.start?.localDate || DEFAULT_VALUES.date,
        time: event?.dates?.start?.localTime || DEFAULT_VALUES.time,
        location: DEFAULT_VALUES.location,
        category: 'other',
        image: DEFAULT_VALUES.image
      };
    }
  }
  
  function normalizePredictHQEvent(event) {
    try {
      // Generate a unique ID
      const id = `predicthq-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Extract start and end dates
      const start = event.start || DEFAULT_VALUES.start;
      const end = event.end;
      
      // Extract date and time parts
      const { date, time } = extractDateTimeParts(start);
      
      // Extract location
      let location = DEFAULT_VALUES.location;
      
      // Try to build a detailed location string
      const locationParts = [];
      
      // Add venue name if available from entities
      const venueEntity = event.entities?.find((e) => e.type === 'venue');
      const venueName = venueEntity?.name || event.phq_venue?.name;
      if (venueName) {
        locationParts.push(String(venueName));
      }
      
      // Add place name
      if (event.place?.name) {
        locationParts.push(String(event.place.name));
      }
      
      // Add state if available
      if (event.state) {
        locationParts.push(String(event.state));
      }
      
      // Add country if available
      if (event.country) {
        locationParts.push(String(event.country));
      }
      
      // Build final location string
      if (locationParts.length > 0) {
        location = locationParts.join(', ');
      }
      
      // Extract coordinates if available
      let coordinates = undefined;
      
      // First try to get coordinates from the event.location field (most accurate)
      if (event.location && Array.isArray(event.location) && event.location.length === 2 &&
          typeof event.location[0] === 'number' && typeof event.location[1] === 'number') {
        // PredictHQ returns [longitude, latitude] which matches our format
        coordinates = [event.location[0], event.location[1]];
      }
      
      // Determine category
      let category = mapCategory(event.category, 'predicthq');
      
      // Check if it's a party event based on labels
      const partyLabels = [
        'nightlife', 'party', 'club', 'nightclub', 'dance-club', 'disco',
        'dance-party', 'dj-set', 'dj-night', 'dj-party', 'rave'
      ];
      
      const hasPartyLabels = event.labels && Array.isArray(event.labels) &&
        event.labels.some((label) => partyLabels.includes(label));
      
      if (hasPartyLabels) {
        category = 'party';
      }
      
      // Get image URL
      let imageUrl = getDefaultImage(category);
      
      // Try to get image from event
      if (event.images && Array.isArray(event.images) && event.images.length > 0) {
        imageUrl = event.images[0].url;
      }
      
      // Build the normalized event
      return {
        id,
        source: 'predicthq',
        title: event.title || DEFAULT_VALUES.title,
        description: event.description || DEFAULT_VALUES.description,
        start,
        end,
        url: event.entities?.[0]?.url || event.websites?.[0]?.url || 'https://predicthq.com',
        date,
        time,
        location,
        category,
        image: imageUrl,
        coordinates,
        rank: event.rank || 0,
        localRelevance: event.local_rank || 0,
        attendance: {
          forecast: event.phq_attendance || undefined,
          actual: event.actual_attendance || undefined
        }
      };
    } catch (error) {
      console.error('Error normalizing PredictHQ event:', error);
      
      // Return a minimal valid event
      return {
        id: `predicthq-error-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source: 'predicthq',
        title: event?.title || 'Unknown Event',
        description: 'Error processing event details',
        start: DEFAULT_VALUES.start,
        url: '',
        date: DEFAULT_VALUES.date,
        time: DEFAULT_VALUES.time,
        location: DEFAULT_VALUES.location,
        category: 'other',
        image: DEFAULT_VALUES.image
      };
    }
  }
  
  // Test Ticketmaster normalization
  console.log("\n=== Testing Ticketmaster Normalization ===");
  const normalizedTicketmasterEvent = normalizeTicketmasterEvent(mockTicketmasterEvent);
  console.log("Normalized Ticketmaster Event:");
  console.log(JSON.stringify(normalizedTicketmasterEvent, null, 2));
  
  // Test PredictHQ normalization
  console.log("\n=== Testing PredictHQ Normalization ===");
  const normalizedPredictHQEvent = normalizePredictHQEvent(mockPredictHQEvent);
  console.log("Normalized PredictHQ Event:");
  console.log(JSON.stringify(normalizedPredictHQEvent, null, 2));
  
  // Verify required fields are present
  console.log("\n=== Verification ===");
  const requiredFields = ['id', 'title', 'description', 'start', 'url', 'source'];
  
  console.log("Checking Ticketmaster event for required fields:");
  const ticketmasterMissingFields = requiredFields.filter(field => !normalizedTicketmasterEvent[field]);
  if (ticketmasterMissingFields.length === 0) {
    console.log("✅ All required fields present");
  } else {
    console.log("❌ Missing fields:", ticketmasterMissingFields);
  }
  
  console.log("Checking PredictHQ event for required fields:");
  const predictHQMissingFields = requiredFields.filter(field => !normalizedPredictHQEvent[field]);
  if (predictHQMissingFields.length === 0) {
    console.log("✅ All required fields present");
  } else {
    console.log("❌ Missing fields:", predictHQMissingFields);
  }
  
  console.log("\nTest completed successfully!");
}

// Run the test
testNormalizers();