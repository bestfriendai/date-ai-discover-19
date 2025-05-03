/**
 * Enhanced RapidAPI integration for event search
 * Optimized for location-based searches and real event data
 *
 * SECURITY NOTES:
 * - API keys are retrieved securely through the apiKeyManager
 * - Rate limiting is implemented to prevent exceeding API quotas
 * - Error handling is robust with proper logging
 */

import { Event, SearchParams } from './types';
import { calculateDistance } from '../../utils/processing';
import { logError, ErrorSeverity, tryCatch } from '../../utils/errorHandling';
import { PartySubcategory, PartyClassification, detectPartySubcategory } from '../../utils/party/partyUtils';
import { getApiKey, trackApiUsage, getRateLimitStatus } from '../../utils/apiKeyManager';

// Default values for search parameters
const DEFAULT_VALUES = {
  RADIUS: 25,         // Default radius in miles
  MAX_RADIUS: 100,    // Maximum allowed radius
  MIN_RADIUS: 1,      // Minimum allowed radius
  LIMIT: 100,         // Default result limit
  MAX_LIMIT: 200      // Maximum allowed limit
};

// Special categories that require custom handling
const SPECIAL_CATEGORIES = {
  PARTY: 'party'
};

// Enhanced set of party keywords for detection with semantic understanding
const PARTY_KEYWORDS = [
  // Core party terms
  'party', 'club', 'nightlife', 'dance', 'dj',
  'festival', 'celebration', 'gala', 'mixer', 'nightclub',
  'disco', 'bash', 'soiree', 'fiesta', 'get-together',

  // Semantic patterns that indicate parties
  'night out', 'going out', 'bottle service', 'vip table',
  'dance floor', 'live dj', 'open bar', 'dress code',
  'guest list', 'rsvp', 'after hours', 'late night',

  // Venue-specific indicators
  'lounge', 'rooftop', 'warehouse', 'venue', 'ballroom',
  'terrace', 'patio', 'garden', 'poolside', 'beachfront'
];

// Contextual pattern matching for party detection
const PARTY_PATTERNS: [RegExp, number][] = [
  // Format: [regex pattern, confidence]
  [/\b(?:night|evening)(?:\s+of)?\s+(?:dancing|fun|celebration|party)\b/i, 0.85],
  [/\b(?:dj|dance)\s+(?:set|night|party|music)\b/i, 0.9],
  [/\b(?:vip|exclusive)\s+(?:access|entry|table|service)\b/i, 0.8],
  [/\b(?:open|hosted)\s+bar\b/i, 0.75],
  [/\b(?:dress|attire)\s+(?:code|to\s+impress)\b/i, 0.7],
  [/\b(?:doors|entry)\s+(?:at|from)\s+\d{1,2}(?::\d{2})?\s*(?:pm|am)\b/i, 0.8],
  [/\b(?:until|till)\s+(?:late|early|dawn|sunrise)\b/i, 0.85],
  [/\b(?:bring|valid)\s+(?:id|identification)\b/i, 0.7],
  [/\b(?:age|21)\s*\+\s*(?:event|only|admitted)\b/i, 0.75],
  [/\b(?:tickets|entry)\s+(?:limited|selling\s+fast)\b/i, 0.65]
];

// Entity recognition patterns for venues, times, and organizations
const ENTITY_PATTERNS: Record<string, RegExp[]> = {
  venue: [
    /\bat\s+(?:the\s+)?([A-Z][a-zA-Z\d\s&'-]+(?:Club|Lounge|Bar|Venue|Hall|Room|Nightclub|Disco))\b/,
    /\b(Club|Lounge|Bar|Venue|Hall|Room|Nightclub|Disco)\s+([A-Z][a-zA-Z\d\s&'-]+)\b/,
    /\b(The\s+[A-Z][a-zA-Z\d\s&'-]+)\s+(?:presents|hosts|welcomes)\b/
  ],
  time: [
    /\b(\d{1,2}(?::\d{2})?\s*(?:pm|am))\s+(?:to|until|till|-)\s+(\d{1,2}(?::\d{2})?\s*(?:pm|am))\b/i,
    /\b(?:doors|entry|start|begin|opening)\s+(?:at|from)\s+(\d{1,2}(?::\d{2})?\s*(?:pm|am))\b/i,
    /\b(?:every|this)\s+(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday)\s+(?:night|evening)\b/i
  ],
  organization: [
    /\b(?:presented|hosted|organized|brought)\s+(?:by|to\s+you\s+by)\s+([A-Z][a-zA-Z\d\s&'-]+)\b/i,
    /\b([A-Z][a-zA-Z\d\s&'-]+)\s+(?:presents|hosts|welcomes|invites)\b/,
    /\b(?:in\s+partnership\s+with|featuring)\s+([A-Z][a-zA-Z\d\s&'-]+)\b/i
  ]
};

// Define enhanced event interface with party properties
interface EnhancedEvent extends Event {
  partySecondaryCategories?: PartySubcategory[];
  partyConfidence?: number;
  partyEvidence?: Record<string, any>;
}
// Default fallback images by category
const FALLBACK_IMAGES = {
  DEFAULT: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
  PARTY: {
    DEFAULT: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    'brunch': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
    'day-party': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
    'club': 'https://images.unsplash.com/photo-1571266752264-7a0fcc92f6fe?w=800&auto=format&fit=crop',
    'social': 'https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28?w=800&auto=format&fit=crop',
    'networking': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop',
    'celebration': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop',
    'immersive': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&auto=format&fit=crop',
    'popup': 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800&auto=format&fit=crop',
    'silent': 'https://images.unsplash.com/photo-1520872024865-3ff2805d8bb3?w=800&auto=format&fit=crop',
    'rooftop': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
    'general': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop'
  },
  MUSIC: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=800&auto=format&fit=crop',
  SPORTS: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
  ARTS: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=800&auto=format&fit=crop',
  FOOD: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop'
};

/**
 * Process and enhance event images
 * @param event The RapidAPI event object
 * @param isPartyEvent Whether this is a party event
 * @param partySubcategory The party subcategory if applicable
 * @returns An object with primary image and optional additional images
 */
function processEventImage(
  event: any,
  isPartyEvent: boolean,
  partySubcategory?: PartySubcategory | string
): { primaryImage: string, additionalImages?: string[] } {
  try {
    // Initialize result
    const result: { primaryImage: string, additionalImages?: string[] } = {
      primaryImage: ''
    };

    // Collect all potential image sources
    const potentialImages: string[] = [];

    // Check primary thumbnail
    if (event.thumbnail && typeof event.thumbnail === 'string' && event.thumbnail.trim() !== '') {
      potentialImages.push(event.thumbnail.trim());
    }

    // Check for image_url which might be higher quality
    if (event.image_url && typeof event.image_url === 'string' && event.image_url.trim() !== '') {
      potentialImages.push(event.image_url.trim());
    }

    // Check for images array
    if (Array.isArray(event.images) && event.images.length > 0) {
      event.images.forEach((img: any) => {
        if (typeof img === 'string' && img.trim() !== '') {
          potentialImages.push(img.trim());
        } else if (img && typeof img === 'object') {
          // Handle different image object formats
          if (img.url && typeof img.url === 'string' && img.url.trim() !== '') {
            potentialImages.push(img.url.trim());
          }
          if (img.image && typeof img.image === 'string' && img.image.trim() !== '') {
            potentialImages.push(img.image.trim());
          }
        }
      });
    }

    // Check for venue images
    if (event.venue && event.venue.image && typeof event.venue.image === 'string' && event.venue.image.trim() !== '') {
      potentialImages.push(event.venue.image.trim());
    }

    // Filter and validate images
    const validImages = potentialImages
      .filter((url, index) => potentialImages.indexOf(url) === index) // Remove duplicates
      .filter(url => validateImageUrl(url)); // Validate URLs

    // Sort images by quality (prefer larger images)
    const sortedImages = sortImagesByQuality(validImages);

    // Set primary image
    if (sortedImages.length > 0) {
      result.primaryImage = sortedImages[0];

      // Add additional images if available
      if (sortedImages.length > 1) {
        result.additionalImages = sortedImages.slice(1);
      }
    } else {
      // No valid images found, use fallback based on category
      result.primaryImage = getFallbackImage(isPartyEvent, partySubcategory, event.category);
    }

    return result;
  } catch (error) {
    logError(error, ErrorSeverity.LOW, 'IMAGE_PROCESSING');
    // Return fallback on error
    return {
      primaryImage: getFallbackImage(isPartyEvent, partySubcategory, event.category)
    };
  }
}

/**
 * Validate an image URL
 * @param url The URL to validate
 * @returns Whether the URL is valid
 */
function validateImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    // Basic URL validation
    const urlObj = new URL(url);

    // Check for common image extensions
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(url);

    // Check for common image hosting domains
    const isImageHost = /(unsplash|imgur|cloudinary|flickr|staticflickr|images|photos|media|cdn|assets)/i.test(urlObj.hostname);

    // Accept URLs that have image extensions or come from image hosting domains
    return hasImageExtension || isImageHost;
  } catch (e) {
    // URL parsing failed
    return false;
  }
}

/**
 * Sort images by estimated quality
 * @param images Array of image URLs
 * @returns Sorted array with highest quality first
 */
function sortImagesByQuality(images: string[]): string[] {
  return [...images].sort((a, b) => {
    // Prefer URLs with resolution indicators
    const aHasResolution = /[_-](\d+x\d+|hd|large|original|full|high)/i.test(a);
    const bHasResolution = /[_-](\d+x\d+|hd|large|original|full|high)/i.test(b);

    if (aHasResolution && !bHasResolution) return -1;
    if (!aHasResolution && bHasResolution) return 1;

    // Prefer URLs without compression parameters
    const aHasCompression = /quality=\d+|q=\d+|compressed/i.test(a);
    const bHasCompression = /quality=\d+|q=\d+|compressed/i.test(b);

    if (!aHasCompression && bHasCompression) return -1;
    if (aHasCompression && !bHasCompression) return 1;

    // Prefer longer URLs (often contain more parameters for better images)
    return b.length - a.length;
  });
}

/**
 * Get a fallback image based on event category
 * @param isPartyEvent Whether this is a party event
 * @param partySubcategory The party subcategory if applicable
 * @param category The general event category
 * @returns A fallback image URL
 */
function getFallbackImage(
  isPartyEvent: boolean,
  partySubcategory?: PartySubcategory | string,
  category?: string
): string {
  if (isPartyEvent) {
    // Use specific party subcategory image if available
    if (partySubcategory && FALLBACK_IMAGES.PARTY[partySubcategory as keyof typeof FALLBACK_IMAGES.PARTY]) {
      return FALLBACK_IMAGES.PARTY[partySubcategory as keyof typeof FALLBACK_IMAGES.PARTY];
    }
    return FALLBACK_IMAGES.PARTY.DEFAULT;
  }

  // Check for other categories
  if (category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('music') || categoryLower.includes('concert')) {
      return FALLBACK_IMAGES.MUSIC;
    }
    if (categoryLower.includes('sport') || categoryLower.includes('game') || categoryLower.includes('match')) {
      return FALLBACK_IMAGES.SPORTS;
    }
    if (categoryLower.includes('art') || categoryLower.includes('exhibit') || categoryLower.includes('theatre') || categoryLower.includes('theater')) {
      return FALLBACK_IMAGES.ARTS;
    }
    if (categoryLower.includes('food') || categoryLower.includes('dining') || categoryLower.includes('culinary')) {
      return FALLBACK_IMAGES.FOOD;
    }
  }

  // Default fallback
  return FALLBACK_IMAGES.DEFAULT;
}
/**
 * Enhance event description with rich, informative content
 * @param event The RapidAPI event object
 * @param isPartyEvent Whether this is a party event
 * @param partySubcategory The party subcategory if applicable
 * @returns Enhanced description string
 */
function enhanceEventDescription(
  event: any,
  isPartyEvent: boolean,
  partySubcategory?: PartySubcategory | string
): string {
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
    const descriptionParts: string[] = [];

    // Add event title if description is empty
    if (!originalDesc) {
      descriptionParts.push(`Join us for ${event.name || 'this exciting event'}.`);
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
    if (event.date_human_readable || event.time) {
      const dateInfo = event.date_human_readable || '';
      const timeInfo = event.time || '';
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
    logError(error, ErrorSeverity.LOW, 'DESCRIPTION_ENHANCEMENT');
    // Return original description as fallback
    return event.description || '';
  }
}

/**
 * Transform a RapidAPI event into our standard Event format
 * @param event The RapidAPI event object
 * @returns A transformed Event object or null if invalid
 */
function transformRapidAPIEvent(event: any): Event | null {
  try {
    // Skip events with missing critical data
    if (!event || !event.name) {
      return null;
    }

    // Extract venue information with proper validation
    const venue = event.venue?.name || '';
    let location = '';

    if (event.venue) {
      // Process location with multiple fallback options
      if (event.venue.full_address) {
        location = event.venue.full_address;
      } else {
        // Construct from parts with validation
        const venueParts = [
          event.venue.city,
          event.venue.state,
          event.venue.country
        ].filter(Boolean);

        location = venueParts.join(', ');
      }
    }

    // Get coordinates with proper validation
    let coordinates: [number, number] | undefined = undefined;
    let eventLongitude = event.venue?.longitude;
    let eventLatitude = event.venue?.latitude;

    // Validate and normalize coordinates
    const hasValidCoordinates =
      eventLatitude !== undefined && eventLongitude !== undefined &&
      eventLatitude !== null && eventLongitude !== null &&
      !isNaN(Number(eventLatitude)) && !isNaN(Number(eventLongitude));

    if (hasValidCoordinates) {
      // Convert to numbers to ensure consistent type
      eventLatitude = Number(eventLatitude);
      eventLongitude = Number(eventLongitude);
      // Ensure coordinates are in the correct format [longitude, latitude]
      coordinates = [eventLongitude, eventLatitude];
    }

    // Extract title and description with fallbacks
    const title = event.name || 'Event';
    const description = event.description || '';

    // Enhanced party event detection with semantic understanding and context analysis
    const nameLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    const venueLower = venue.toLowerCase();
    const combinedText = `${nameLower} ${descLower} ${venueLower}`;
    const eventTime = event.time || '';

    // Track evidence for better explainability
    const evidence = {
      keywords: [] as string[],
      patterns: [] as string[],
      entities: [] as string[]
    };

    // 1. Keyword-based detection (basic approach)
    const keywordMatches = PARTY_KEYWORDS.filter(kw => combinedText.includes(kw));
    evidence.keywords.push(...keywordMatches);

    // 2. Contextual pattern matching (more sophisticated)
    const patternMatches = PARTY_PATTERNS.filter(([pattern]) => pattern.test(combinedText));
    evidence.patterns.push(...patternMatches.map(([pattern]) => pattern.toString()));

    // 3. Entity recognition for venues, times, and organizations
    Object.entries(ENTITY_PATTERNS).forEach(([entityType, patterns]) => {
      patterns.forEach(pattern => {
        const match = combinedText.match(pattern);
        if (match && match[1]) {
          evidence.entities.push(`${entityType}:${match[1]}`);
        }
      });
    });

    // Determine if this is a party event based on multiple evidence types
    const isPartyEvent =
      // Basic keyword matching
      keywordMatches.length > 0 ||
      // Category-based detection
      (event.category && event.category.toLowerCase().includes('party')) ||
      // Venue-based detection
      (venueLower.includes('club') || venueLower.includes('lounge')) ||
      // Pattern-based detection (high confidence patterns)
      patternMatches.some(([_, confidence]) => confidence >= 0.8) ||
      // Multiple medium-confidence patterns
      patternMatches.length >= 2 ||
      // Entity recognition (multiple entities)
      evidence.entities.length >= 2;

    // Enhanced party subcategory detection using the improved function
    let partyClassification: PartyClassification | undefined = undefined;
    let partySubcategory: PartySubcategory | undefined = undefined;

    if (isPartyEvent) {
      // Get detailed classification with primary and secondary categories
      partyClassification = detectPartySubcategory(title, description, eventTime, venue);
      partySubcategory = partyClassification.primaryCategory;
    }

    // Process images
    const imageData = processEventImage(event, isPartyEvent, partySubcategory);

    // Return standardized event with enhanced party information
    const enhancedEvent: EnhancedEvent = {
      id: `rapidapi_${event.event_id || Math.random().toString(36).substring(2, 10)}`,
      source: 'rapidapi',
      title: title,
      description: enhanceEventDescription(event, isPartyEvent, partySubcategory),
      date: event.date_human_readable || '',
      time: event.time || '',
      location: location,
      venue: venue,
      category: isPartyEvent ? 'party' : 'other',
      // Map primaryImage to image for Event interface compatibility
      image: imageData.primaryImage,
      // Include additional images if available
      additionalImages: imageData.additionalImages,
      coordinates: coordinates,
      longitude: hasValidCoordinates ? eventLongitude : undefined,
      latitude: hasValidCoordinates ? eventLatitude : undefined,
      url: event.link || '',
      rawDate: event.date || event.date_utc || event.date_human_readable || '',
      isPartyEvent: isPartyEvent,
      partySubcategory: partySubcategory
    };

    // Add enhanced party information if available
    if (partyClassification) {
      enhancedEvent.partySecondaryCategories = partyClassification.secondaryCategories;
      enhancedEvent.partyConfidence = partyClassification.confidence;
      enhancedEvent.partyEvidence = {
        keywords: evidence.keywords,
        patterns: evidence.patterns,
        entities: evidence.entities,
        ...partyClassification.evidence
      };
    }

    return enhancedEvent;
  } catch (error) {
    logError(error, ErrorSeverity.LOW, 'EVENT_TRANSFORM');
    return null;
  }
}
/**
 * Search for events using RapidAPI with improved handling
 * @param params Search parameters
 * @param apiKeyParam Optional API key (will be retrieved from apiKeyManager if not provided)
 * @returns Search results
 */
export async function searchRapidAPIEvents(
  params: SearchParams,
  apiKeyParam?: string
): Promise<{ events: Event[], error: string | null, searchQueryUsed?: string }> {
  try {
    // Get API key from parameter or apiKeyManager
    let apiKey = apiKeyParam;

    if (!apiKey) {
      try {
        // Check rate limit status first
        const rateLimitStatus = getRateLimitStatus('rapidapi');
        if (rateLimitStatus.limited) {
          const resetTimeMinutes = Math.ceil(rateLimitStatus.resetInMs ? rateLimitStatus.resetInMs / 60000 : 1);
          throw new Error(`RapidAPI rate limit exceeded. Try again in approximately ${resetTimeMinutes} minute(s).`);
        }

        // Get API key from manager
        apiKey = await getApiKey('rapidapi');
        if (!apiKey) {
          throw new Error('Failed to retrieve RapidAPI key');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          events: [],
          error: errorMessage,
          searchQueryUsed: 'Error retrieving API key'
        };
      }
    }

    // Track API usage
    trackApiUsage('rapidapi');

    // Log search parameters (without sensitive info)
    console.log('[RAPIDAPI] Starting search with parameters:',
      JSON.stringify({
        ...params,
        // Don't log possibly sensitive location info
        location: params.location ? '[LOCATION PROVIDED]' : undefined
      }));

    // -- Build Query String --
    let queryString = '';
    let cleanKeyword = params.keyword?.trim() || '';

    // Handle party search differently for better results
    const isPartySearch = params.categories?.includes(SPECIAL_CATEGORIES.PARTY);

    if (isPartySearch) {
      // -- Enhanced Party Search Optimization --
      // Base party terms for all party searches
      let partyTerms = ['party', 'nightlife', 'nightclub', 'social event'];

      // If we have a specific party subcategory, optimize terms for it
      if (cleanKeyword) {
        const keywordLower = cleanKeyword.toLowerCase();

        // Club/nightlife specific terms
        if (keywordLower.includes('club') || keywordLower.includes('night')) {
          partyTerms = [
            'nightclub', 'club night', 'dance club', 'dance party',
            'dj', 'nightlife', 'dance floor', 'bottle service',
            ...partyTerms
          ];
        }
        // Day party specific terms
        else if (keywordLower.includes('day') || keywordLower.includes('afternoon')) {
          partyTerms = [
            'day party', 'daytime event', 'afternoon party', 'pool party',
            'outdoor party', 'rooftop party', 'day club', 'dayclub',
            ...partyTerms
          ];
        }
        // Brunch specific terms
        else if (keywordLower.includes('brunch') || keywordLower.includes('morning')) {
          partyTerms = [
            'brunch party', 'brunch event', 'sunday brunch', 'bottomless brunch',
            'brunch social', 'morning party', 'mimosas', 'bloody mary',
            ...partyTerms
          ];
        }
        // Themed party specific terms
        else if (keywordLower.includes('theme') || keywordLower.includes('costume')) {
          partyTerms = [
            'themed party', 'costume party', 'masquerade', 'dress up',
            'themed event', 'themed night', 'special theme', 'dress code',
            ...partyTerms
          ];
        }
        // Exclusive/VIP specific terms
        else if (keywordLower.includes('vip') || keywordLower.includes('exclusive')) {
          partyTerms = [
            'exclusive party', 'vip party', 'private party', 'members only',
            'exclusive access', 'vip tables', 'bottle service', 'upscale party',
            ...partyTerms
          ];
        }
        // Immersive/interactive specific terms
        else if (keywordLower.includes('immersive') || keywordLower.includes('experience')) {
          partyTerms = [
            'immersive experience', 'interactive event', 'immersive party',
            'art installation', 'multi-sensory', 'experiential', 'creative social',
            ...partyTerms
          ];
        }
      }

      // Construct search query with party terms
      if (params.latitude !== undefined && params.longitude !== undefined) {
        // Validate coordinates before using them
        const lat = Number(params.latitude);
        const lng = Number(params.longitude);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('[RAPIDAPI] Invalid coordinates provided, using general search');
          queryString = `${partyTerms.join(' ')} events`;
        } else {
          // Use coordinates with party terms
          queryString = `${partyTerms.join(' ')} events near ${lat.toFixed(4)},${lng.toFixed(4)}`;
        }
      } else if (params.location) {
        queryString = `${partyTerms.join(' ')} events in ${params.location}`;
      } else {
        queryString = `${partyTerms.join(' ')} events`; // Fallback
      }

      // Add additional keyword if it's not already covered by party terms
      if (cleanKeyword && !partyTerms.some(term => cleanKeyword.toLowerCase().includes(term))) {
        // Add the keyword with proper context
        if (partyTerms.length > 0) {
          // Add as a specific type of party
          queryString += ` ${cleanKeyword} party`;
        } else {
          // Just add the keyword
          queryString += ` ${cleanKeyword}`;
        }
      }

      // Add time context if available in the search parameters
      if (params.startDate || params.endDate) {
        // Add temporal context to improve results
        const now = new Date();
        const currentHour = now.getHours();

        // Add time-of-day context based on current time
        if (currentHour >= 18 || currentHour < 4) {
          // Evening/night context
          queryString += ' night evening';
        } else if (currentHour >= 11 && currentHour < 16) {
          // Daytime context
          queryString += ' daytime afternoon';
        } else if (currentHour >= 8 && currentHour < 11) {
          // Morning/brunch context
          queryString += ' morning brunch';
        }
      }
    } else {
      // -- Standard Search Construction --
      if (params.latitude !== undefined && params.longitude !== undefined) {
        // Validate coordinates
        const lat = Number(params.latitude);
        const lng = Number(params.longitude);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('[RAPIDAPI] Invalid coordinates provided, using general search');
          queryString = 'popular events';
        } else {
          // Build query with coordinates
          queryString = `events near ${lat.toFixed(4)},${lng.toFixed(4)}`;

          // Add category-specific keywords if available
          if (params.categories && params.categories.length > 0) {
            const validCategories = params.categories.filter(c => c !== SPECIAL_CATEGORIES.PARTY);
            if (validCategories.length > 0) {
              queryString += ` ${validCategories.join(' ')}`;
            }
          }
        }
      } else if (params.location) {
        queryString = `events in ${params.location}`;

        // Add category-specific terms
        if (params.categories && params.categories.length > 0) {
          const validCategories = params.categories.filter(c => c !== SPECIAL_CATEGORIES.PARTY);
          if (validCategories.length > 0) {
            queryString = `${validCategories.join(' ')} ${queryString}`;
          }
        }
      } else {
        // Fallback search with no location
        if (params.categories && params.categories.length > 0) {
          const validCategories = params.categories.filter(c => c !== SPECIAL_CATEGORIES.PARTY);
          if (validCategories.length > 0) {
            queryString = `${validCategories.join(' ')} events`;
          } else {
            queryString = `popular events`;
          }
        } else {
          queryString = `popular events`;
        }
      }

      // Add keyword if provided
      if (cleanKeyword) {
        queryString += ` ${cleanKeyword}`;
      }
    }

    console.log(`[RAPIDAPI] Constructed query: "${queryString}"`);

    // -- Build API Request --
    const queryParams = new URLSearchParams();

    // Set query parameter
    queryParams.append('query', queryString);

    // Date Parameter - Use 'month' for a good amount of upcoming events
    queryParams.append('date', 'month');

    // Virtual events setting - only physical events
    queryParams.append('is_virtual', 'false');

    // Request maximum limit for post-filtering
    const apiLimit = Math.min(DEFAULT_VALUES.MAX_LIMIT, params.limit ? params.limit * 2 : DEFAULT_VALUES.LIMIT);
    queryParams.append('limit', apiLimit.toString());
    queryParams.append('start', '0');

    // -- Make API Request --
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    console.log(`[RAPIDAPI] Sending request to: ${url.substring(0, 100)}...`);

    // Setting timeout for the fetch request with a longer timeout for reliability
    const controller = new AbortController();
    const timeoutMs = 20000; // 20s timeout for better reliability
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Implement retry logic
    const MAX_RETRIES = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= MAX_RETRIES) {
      try {
        if (retryCount > 0) {
          console.log(`[RAPIDAPI] Retry attempt ${retryCount}/${MAX_RETRIES}`);
          // Add exponential backoff for retries
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        // Clear the timeout since we got a response
        clearTimeout(timeout);

        console.log(`[RAPIDAPI] Response status: ${response.status}`);

        if (!response.ok) {
          // Handle different HTTP error codes appropriately
          let errorMessage = `RapidAPI request failed: ${response.status}`;
          let shouldRetry = false;

          if (response.status === 401 || response.status === 403) {
            errorMessage = 'API key is invalid or unauthorized';
            // Don't retry auth errors
            shouldRetry = false;
            // Track as an error for rate limiting
            trackApiUsage('rapidapi', true);
          } else if (response.status === 429) {
            errorMessage = 'API rate limit exceeded';
            // Don't retry rate limit errors
            shouldRetry = false;
            // Track as an error for rate limiting
            trackApiUsage('rapidapi', true);
          } else if (response.status >= 500) {
            errorMessage = 'RapidAPI server error';
            // Retry server errors
            shouldRetry = true;
          } else if (response.status === 408 || response.status === 504) {
            errorMessage = 'RapidAPI request timed out';
            // Retry timeout errors
            shouldRetry = true;
          }

          // Try to get more details from the error response
          let errorText = '';
          try {
            errorText = await response.text();
            console.error(`[RAPIDAPI] Request failed: ${response.status}`, errorText.substring(0, 200));
          } catch (e) {
            console.error(`[RAPIDAPI] Could not read error response: ${e}`);
          }

          if (shouldRetry && retryCount < MAX_RETRIES) {
            lastError = new Error(errorMessage);
            retryCount++;
            continue;
          }

          return {
            events: [],
            error: errorMessage,
            searchQueryUsed: queryString
          };
        }

        // If we get here, the request was successful
        break;
      } catch (error) {
        clearTimeout(timeout);

        // Check if it's an abort error (timeout)
        const isTimeoutError = error instanceof DOMException && error.name === 'AbortError';

        if (isTimeoutError) {
          console.error(`[RAPIDAPI] Request timed out after ${timeoutMs}ms`);
          lastError = new Error('Request timed out');
        } else {
          console.error(`[RAPIDAPI] Request failed: ${error instanceof Error ? error.message : String(error)}`);
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        // Retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          continue;
        }

        // Track as an error for rate limiting
        trackApiUsage('rapidapi', true);

        return {
          events: [],
          error: `RapidAPI request failed: ${lastError.message}`,
          searchQueryUsed: queryString
        };
      }
    }

    // If we've exhausted retries and still have an error
    if (lastError) {
      return {
        events: [],
        error: `RapidAPI request failed after ${MAX_RETRIES} retries: ${lastError.message}`,
        searchQueryUsed: queryString
      };
    }

    // Store the response from the successful request
    let response: Response;

    try {
      // Get the response from the last successful request
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      const rawEvents = data.data || [];
      console.log(`[RAPIDAPI] Received ${rawEvents.length} raw events.`);

      // -- Transform Events --
      let transformedEvents = rawEvents
        .map(transformRapidAPIEvent)
        .filter((event): event is Event => event !== null);

      console.log(`[RAPIDAPI] Transformed ${transformedEvents.length} events successfully.`);

      // -- Filter Events by Radius --
      if (params.radius !== undefined && params.latitude !== undefined && params.longitude !== undefined) {
        const initialCount = transformedEvents.length;
        const userLat = Number(params.latitude);
        const userLng = Number(params.longitude);
        const radiusMiles = Math.max(
          DEFAULT_VALUES.MIN_RADIUS,
          Math.min(
            DEFAULT_VALUES.MAX_RADIUS,
            Number(params.radius) || DEFAULT_VALUES.RADIUS
          )
        );

        // Validate coordinates
        if (isNaN(userLat) || isNaN(userLng) ||
            userLat < -90 || userLat > 90 ||
            userLng < -180 || userLng > 180) {
          console.warn(`[RAPIDAPI] Invalid user coordinates: ${params.latitude}, ${params.longitude}`);
        } else {
          // Filter events by distance
          transformedEvents = transformedEvents.filter((event: Event) => {
            // Skip events without coordinates
            if (!event.latitude || !event.longitude) {
              return false;
            }

            try {
              const distance = calculateDistance(
                userLat,
                userLng,
                Number(event.latitude),
                Number(event.longitude)
              );

              return distance <= radiusMiles;
            } catch (e) {
              return false; // Skip events with invalid coordinates
            }
          });

          console.log(`[RAPIDAPI] Filtered by radius: ${initialCount} -> ${transformedEvents.length}`);
        }
      }

      // -- Filter Past Events --
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      const initialCountBeforeDateFilter = transformedEvents.length;
      transformedEvents = transformedEvents.filter((event: Event) => {
        if (!event.rawDate) return true; // Keep events with no date

        try {
          const eventDate = new Date(event.rawDate);
          return !isNaN(eventDate.getTime()) && eventDate >= now;
        } catch (e) {
          return true; // Keep events with unparseable dates
        }
      });

      console.log(`[RAPIDAPI] Filtered past events: ${initialCountBeforeDateFilter} -> ${transformedEvents.length}`);

      // -- Apply Limit --
      if (params.limit && transformedEvents.length > params.limit) {
        transformedEvents = transformedEvents.slice(0, params.limit);
        console.log(`[RAPIDAPI] Limited to ${transformedEvents.length} events`);
      }

      return {
        events: transformedEvents,
        error: null,
        searchQueryUsed: queryString
      };
    } catch (error) {
      clearTimeout(timeout);

      const errorMessage = error instanceof Error
        ? error.message
        : error instanceof DOMException && error.name === 'AbortError'
          ? 'Request timed out'
          : String(error);

      console.error(`[RAPIDAPI] Request failed: ${errorMessage}`);

      return {
        events: [],
        error: `RapidAPI request failed: ${errorMessage}`,
        searchQueryUsed: queryString
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[RAPIDAPI] Error in searchRapidAPIEvents: ${errorMessage}`);

    // Track API error for rate limiting
    trackApiUsage('rapidapi', true);

    return {
      events: [],
      error: errorMessage,
      searchQueryUsed: 'Error occurred before query construction'
    };
  }
}