/**
 * Enhanced Party Detection and Categorization System
 *
 * This module provides sophisticated algorithms for detecting and categorizing party events
 * with improved semantic understanding, context analysis, and adaptive scoring.
 */

// Constants for adaptive scoring
const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 45,
  LOW: 30,
  // Adaptive thresholds based on event characteristics
  CLUB_EVENT: 25,      // Lower threshold for club events due to reliable venue indicators
  DAY_PARTY: 35,       // Higher threshold for day parties to reduce false positives
  IMMERSIVE: 40,       // Higher threshold for immersive events
  GENERAL: 30,         // Default threshold
  
  // New adaptive thresholds for different contexts
  VENUE_STRONG: 22,    // Lower threshold when venue is a strong indicator
  TIME_STRONG: 28,     // Lower threshold when time is a strong indicator
  MULTI_EVIDENCE: 20,  // Lower threshold when multiple evidence types exist
  HIGH_CONFIDENCE: 25  // Lower threshold for high confidence matches
};

// Enhanced weighting system with evidence tracking
const KEYWORD_WEIGHTS = {
  // Primary weights
  TITLE: 2.5,          // Keywords in title are worth more
  DESC: 1.0,           // Keywords in description are worth normal weight
  TIME: 1.8,           // Time-based matches are worth more
  VENUE: 2.0,          // Venue-based matches are significant indicators
  NEGATIVE: -3.0,      // Negative keywords strongly reduce score
  
  // Context weights
  SEMANTIC: 2.2,       // Semantic pattern matches carry high weight
  ENTITY: 1.5,         // Recognized entities (venues, organizations)
  TEMPORAL: 1.7,       // Temporal context indicators
  MULTI_ASPECT: 1.6,   // Multiple aspects of event representation
  
  // Confidence modifiers
  HIGH_CONFIDENCE: 1.3, // Boost for high-confidence matches
  LOW_CONFIDENCE: 0.7,  // Reduction for low-confidence matches
  
  // New context weights
  PATTERN_MATCH: 1.9,   // Weight for contextual pattern matches
  ENTITY_VENUE: 1.8,    // Weight for venue entity recognition
  ENTITY_TIME: 1.6,     // Weight for time entity recognition
  ENTITY_ORG: 1.4,      // Weight for organization entity recognition
  CONTEXT_BOOST: 1.5    // Boost when multiple context types match
};

// Normalization factor for consistent interpretation
const SCORE_NORMALIZATION = 1.2;

// Party subcategory types with hierarchical structure
export type PartySubcategory =
  | 'day-party'
  | 'social'
  | 'brunch'
  | 'club'
  | 'networking'
  | 'celebration'
  | 'immersive'
  | 'popup'
  | 'silent'
  | 'rooftop'
  | 'themed'
  | 'exclusive'
  | 'underground'
  | 'festival'
  | 'holiday'
  | 'general';

// New: Multi-label classification support
export interface PartyClassification {
  primaryCategory: PartySubcategory;
  secondaryCategories: PartySubcategory[];
  confidence: number;
  evidence: {
    titleMatches: string[];
    descriptionMatches: string[];
    venueMatches: string[];
    timeMatches: string[];
    patternMatches: string[];
    entityMatches: string[];
  };
}
// New: Hierarchical category structure
const CATEGORY_HIERARCHY = {
  // Top-level categories
  'social': ['networking', 'celebration', 'brunch'],
  'entertainment': ['club', 'festival', 'immersive', 'silent'],
  'exclusive': ['underground', 'popup', 'themed'],
  'venue-based': ['rooftop', 'club'],
  'time-based': ['day-party', 'brunch', 'holiday'],
  
  // Cross-cutting categories
  'general': [] // Can be any type
};

// New: Category compatibility matrix for multi-label classification
// Higher values indicate stronger compatibility
const CATEGORY_COMPATIBILITY: Record<PartySubcategory, Record<PartySubcategory, number>> = {
  'general': {
    'general': 1.0, 'day-party': 0.7, 'social': 0.8, 'brunch': 0.7, 'club': 0.7,
    'networking': 0.6, 'celebration': 0.8, 'immersive': 0.6, 'popup': 0.7,
    'silent': 0.5, 'rooftop': 0.7, 'themed': 0.8, 'exclusive': 0.6,
    'underground': 0.5, 'festival': 0.7, 'holiday': 0.8
  },
  'day-party': {
    'general': 0.7, 'day-party': 1.0, 'social': 0.8, 'brunch': 0.9, 'club': 0.3,
    'networking': 0.5, 'celebration': 0.7, 'immersive': 0.5, 'popup': 0.6,
    'silent': 0.4, 'rooftop': 0.9, 'themed': 0.7, 'exclusive': 0.5,
    'underground': 0.2, 'festival': 0.7, 'holiday': 0.6
  },
  'social': {
    'general': 0.8, 'day-party': 0.8, 'social': 1.0, 'brunch': 0.8, 'club': 0.5,
    'networking': 0.9, 'celebration': 0.9, 'immersive': 0.6, 'popup': 0.6,
    'silent': 0.5, 'rooftop': 0.7, 'themed': 0.7, 'exclusive': 0.6,
    'underground': 0.3, 'festival': 0.6, 'holiday': 0.8
  },
  'brunch': {
    'general': 0.7, 'day-party': 0.9, 'social': 0.8, 'brunch': 1.0, 'club': 0.1,
    'networking': 0.7, 'celebration': 0.7, 'immersive': 0.4, 'popup': 0.5,
    'silent': 0.2, 'rooftop': 0.8, 'themed': 0.6, 'exclusive': 0.5,
    'underground': 0.1, 'festival': 0.3, 'holiday': 0.6
  },
  'club': {
    'general': 0.7, 'day-party': 0.3, 'social': 0.5, 'brunch': 0.1, 'club': 1.0,
    'networking': 0.3, 'celebration': 0.6, 'immersive': 0.7, 'popup': 0.6,
    'silent': 0.6, 'rooftop': 0.6, 'themed': 0.7, 'exclusive': 0.8,
    'underground': 0.8, 'festival': 0.7, 'holiday': 0.5
  },
  'networking': {
    'general': 0.6, 'day-party': 0.5, 'social': 0.9, 'brunch': 0.7, 'club': 0.3,
    'networking': 1.0, 'celebration': 0.5, 'immersive': 0.4, 'popup': 0.5,
    'silent': 0.3, 'rooftop': 0.6, 'themed': 0.5, 'exclusive': 0.7,
    'underground': 0.2, 'festival': 0.3, 'holiday': 0.4
  },
  'celebration': {
    'general': 0.8, 'day-party': 0.7, 'social': 0.9, 'brunch': 0.7, 'club': 0.6,
    'networking': 0.5, 'celebration': 1.0, 'immersive': 0.6, 'popup': 0.6,
    'silent': 0.4, 'rooftop': 0.7, 'themed': 0.8, 'exclusive': 0.7,
    'underground': 0.3, 'festival': 0.7, 'holiday': 0.9
  },
  'immersive': {
    'general': 0.6, 'day-party': 0.5, 'social': 0.6, 'brunch': 0.4, 'club': 0.7,
    'networking': 0.4, 'celebration': 0.6, 'immersive': 1.0, 'popup': 0.8,
    'silent': 0.7, 'rooftop': 0.6, 'themed': 0.9, 'exclusive': 0.8,
    'underground': 0.7, 'festival': 0.8, 'holiday': 0.6
  },
  'popup': {
    'general': 0.7, 'day-party': 0.6, 'social': 0.6, 'brunch': 0.5, 'club': 0.6,
    'networking': 0.5, 'celebration': 0.6, 'immersive': 0.8, 'popup': 1.0,
    'silent': 0.6, 'rooftop': 0.7, 'themed': 0.8, 'exclusive': 0.9,
    'underground': 0.8, 'festival': 0.6, 'holiday': 0.5
  },
  'silent': {
    'general': 0.5, 'day-party': 0.4, 'social': 0.5, 'brunch': 0.2, 'club': 0.6,
    'networking': 0.3, 'celebration': 0.4, 'immersive': 0.7, 'popup': 0.6,
    'silent': 1.0, 'rooftop': 0.5, 'themed': 0.7, 'exclusive': 0.6,
    'underground': 0.6, 'festival': 0.6, 'holiday': 0.3
  },
  'rooftop': {
    'general': 0.7, 'day-party': 0.9, 'social': 0.7, 'brunch': 0.8, 'club': 0.6,
    'networking': 0.6, 'celebration': 0.7, 'immersive': 0.6, 'popup': 0.7,
    'silent': 0.5, 'rooftop': 1.0, 'themed': 0.7, 'exclusive': 0.7,
    'underground': 0.3, 'festival': 0.5, 'holiday': 0.6
  },
  'themed': {
    'general': 0.8, 'day-party': 0.7, 'social': 0.7, 'brunch': 0.6, 'club': 0.7,
    'networking': 0.5, 'celebration': 0.8, 'immersive': 0.9, 'popup': 0.8,
    'silent': 0.7, 'rooftop': 0.7, 'themed': 1.0, 'exclusive': 0.8,
    'underground': 0.6, 'festival': 0.8, 'holiday': 0.9
  },
  'exclusive': {
    'general': 0.6, 'day-party': 0.5, 'social': 0.6, 'brunch': 0.5, 'club': 0.8,
    'networking': 0.7, 'celebration': 0.7, 'immersive': 0.8, 'popup': 0.9,
    'silent': 0.6, 'rooftop': 0.7, 'themed': 0.8, 'exclusive': 1.0,
    'underground': 0.9, 'festival': 0.6, 'holiday': 0.7
  },
  'underground': {
    'general': 0.5, 'day-party': 0.2, 'social': 0.3, 'brunch': 0.1, 'club': 0.8,
    'networking': 0.2, 'celebration': 0.3, 'immersive': 0.7, 'popup': 0.8,
    'silent': 0.6, 'rooftop': 0.3, 'themed': 0.6, 'exclusive': 0.9,
    'underground': 1.0, 'festival': 0.6, 'holiday': 0.3
  },
  'festival': {
    'general': 0.7, 'day-party': 0.7, 'social': 0.6, 'brunch': 0.3, 'club': 0.7,
    'networking': 0.3, 'celebration': 0.7, 'immersive': 0.8, 'popup': 0.6,
    'silent': 0.6, 'rooftop': 0.5, 'themed': 0.8, 'exclusive': 0.6,
    'underground': 0.6, 'festival': 1.0, 'holiday': 0.7
  },
  'holiday': {
    'general': 0.8, 'day-party': 0.6, 'social': 0.8, 'brunch': 0.6, 'club': 0.5,
    'networking': 0.4, 'celebration': 0.9, 'immersive': 0.6, 'popup': 0.5,
    'silent': 0.3, 'rooftop': 0.6, 'themed': 0.9, 'exclusive': 0.7,
    'underground': 0.3, 'festival': 0.7, 'holiday': 1.0
  }
};
// Define party-related keywords
const partyKeywords = {
  // General party terms that strongly indicate a party event - massively expanded for comprehensive detection
  strong: [
    // Modern party concepts - highest priority
    'silent disco', 'immersive experience', 'secret party', 'underground party',
    'warehouse party', 'art party', 'creative social', 'experiential event',
    'interactive party', 'themed social', 'exclusive access', 'members only',
    'private event', 'speakeasy', 'hidden venue', 'secret location',
    'popup bar', 'popup club', 'popup venue', 'silent party', 'headphone party',
    'silent rave', 'immersive art', 'immersive music', 'immersive party',
    'rooftop social', 'rooftop party', 'skyline party', 'yacht party',
    'boat party', 'cruise party', 'pool social', 'beach social', 'outdoor social',

    // Core party terms - highest priority
    'party', 'nightclub', 'club night', 'dance party', 'rave', 'dj set', 'nightlife',
    'bottle service', 'vip table', 'dance floor', 'after party', 'afterparty',
    'dance', 'dancing', 'dj', 'club', 'clubbing', 'night out', 'night life',
    'party bus', 'party cruise', 'party boat', 'party venue', 'party spot',
    'dance club', 'dance venue', 'dance spot', 'dance floor', 'dance hall',
    'dance music', 'dance night', 'dance event', 'dance party', 'dance social',
    'dance celebration', 'dance mixer', 'dance gathering', 'dance festival',

    // Social gathering terms - high priority
    'celebration', 'social', 'mixer', 'gathering', 'gala', 'reception',
    'meet-up', 'meetup', 'happy hour', 'happy-hour', 'mingle', 'networking',
    'social event', 'cocktail', 'singles', 'speed dating', 'social gathering',
    'social night', 'social club', 'social venue', 'social spot', 'social scene',
    'social mixer', 'social celebration', 'social party', 'social dance',
    'social gathering', 'social meetup', 'social networking', 'social drinks',

    // Special events - high priority
    'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
    'launch party', 'release party', 'opening party', 'grand opening',
    'vip event', 'exclusive event', 'special event', 'featured event',
    'premiere', 'debut', 'unveiling', 'reveal party', 'celebration party',
    'holiday party', 'seasonal party', 'themed party', 'costume party',

    // Music & entertainment - medium priority
    'festival', 'fest', 'concert', 'live music', 'live dj', 'entertainment',
    'electronic music', 'hip hop', 'edm', 'house music', 'techno', 'disco',
    'bar crawl', 'pub crawl', 'show', 'performance', 'dj', 'bar', 'lounge',
    'music festival', 'music event', 'music party', 'music celebration',
    'music social', 'music mixer', 'music gathering', 'music night',
    'live band', 'live performance', 'live show', 'live entertainment',
    'live act', 'live music venue', 'live music spot', 'live music scene',

    // Venue & atmosphere terms - medium priority
    'vip', 'exclusive', 'night out', 'dancing', 'club', 'venue',
    'lounge', 'bar', 'pub', 'tavern', 'nightspot', 'hotspot',
    'dance floor', 'dance hall', 'dance club', 'dance venue',
    'nightlife', 'night scene', 'night spot', 'night venue',
    'evening event', 'evening party', 'evening celebration',
    'evening social', 'evening mixer', 'evening gathering',

    // Themed parties - high priority
    'themed party', 'costume party', 'masquerade', 'holiday party',
    'new years party', 'halloween party', 'summer party', 'winter party',
    'spring party', 'fall party', 'seasonal party', 'annual party',
    'decade party', '80s party', '90s party', 'retro party',
    'throwback party', 'themed night', 'themed event', 'themed social',
    'themed celebration', 'themed mixer', 'themed gathering',

    // Venue types - medium priority
    'nightclub venue', 'lounge venue', 'bar venue', 'club night', 'dance night',
    'party night', 'night life', 'social mixer', 'networking event', 'singles event',
    'rooftop bar', 'rooftop lounge', 'rooftop club', 'rooftop venue',
    'outdoor bar', 'outdoor lounge', 'outdoor club', 'outdoor venue',
    'beach bar', 'beach lounge', 'beach club', 'beach venue',
    'pool bar', 'pool lounge', 'pool club', 'pool venue',

    // Time & activity terms - lower priority
    'mingling', 'daytime event', 'pool event', 'rooftop event', 'outdoor event',
    'friday night', 'saturday night', 'weekend party', 'weekend event',
    'bottle service', 'vip tables', 'open bar', 'drink specials', 'ladies night',
    'industry night', 'college night', 'theme night', 'dance music', 'live entertainment',
    'weekend', 'friday', 'saturday', 'sunday', 'thursday',
    'night', 'evening', 'afternoon', 'day', 'morning',
    'brunch', 'lunch', 'dinner', 'drinks', 'cocktails',
    'beer', 'wine', 'spirits', 'alcohol', 'beverages'
  ],

  // Day party specific terms - expanded for better detection
  dayParty: [
    // Core day party terms
    'day party', 'day-party', 'pool party', 'daytime', 'day time',
    'outdoor party', 'garden party', 'patio party', 'beach party',
    'pool', 'day club', 'dayclub', 'afternoon party', 'rooftop party',
    'day rave', 'day festival', 'day concert', 'day social', 'day celebration',
    'daytime rave', 'daytime festival', 'daytime concert', 'daytime social',
    'afternoon rave', 'afternoon festival', 'afternoon concert', 'afternoon social',

    // Event types
    'daytime event', 'afternoon event', 'day event', 'pool event', 'beach event',
    'outdoor event', 'rooftop event', 'terrace party', 'terrace event',
    'day fest', 'day festival', 'outdoor festival', 'pool festival',
    'day concert', 'outdoor concert', 'day show', 'outdoor show',
    'day performance', 'outdoor performance', 'day entertainment',
    'outdoor entertainment', 'day music', 'outdoor music',

    // Social gatherings
    'day celebration', 'afternoon celebration', 'daytime celebration',
    'day social', 'afternoon social', 'daytime social',
    'day mixer', 'afternoon mixer', 'daytime mixer',
    'day gathering', 'afternoon gathering', 'daytime gathering',
    'day meetup', 'afternoon meetup', 'daytime meetup',
    'day networking', 'afternoon networking', 'daytime networking',
    'day mingling', 'afternoon mingling', 'daytime mingling',

    // Specific venues
    'pool bar', 'beach bar', 'outdoor bar', 'garden bar', 'patio bar',
    'pool lounge', 'beach lounge', 'outdoor lounge', 'garden lounge', 'patio lounge',
    'pool club', 'beach club', 'outdoor club', 'garden club', 'patio club',
    'pool venue', 'beach venue', 'outdoor venue', 'garden venue', 'patio venue',
    'pool spot', 'beach spot', 'outdoor spot', 'garden spot', 'patio spot',
    'pool party venue', 'beach party venue', 'outdoor party venue',
    'garden party venue', 'patio party venue', 'rooftop party venue',

    // Activities
    'sun bathing', 'swimming', 'outdoor games', 'outdoor activities',
    'outdoor music', 'outdoor dj', 'outdoor dancing', 'outdoor entertainment',
    'day drinking', 'afternoon drinking', 'daytime drinking',
    'day dancing', 'afternoon dancing', 'daytime dancing',
    'pool games', 'beach games', 'lawn games', 'outdoor sports',
    'pool activities', 'beach activities', 'lawn activities',
    'pool fun', 'beach fun', 'outdoor fun', 'daytime fun',

    // Time indicators
    'afternoon', 'daytime', 'day time', 'midday', 'mid-day',
    'morning', 'noon', 'early', 'sunrise', 'sunset',
    'brunch', 'lunch', 'day', 'sunshine', 'sunny',
    'daylight', 'sunlight', 'sun', 'bright', 'light',
    'am', 'pm', 'morning', 'noon', 'afternoon',
    'pre-evening', 'pre-sunset', 'pre-dusk', 'pre-night',

    // Seasonal
    'summer day', 'spring day', 'fall day', 'winter day',
    'summer afternoon', 'spring afternoon', 'fall afternoon', 'winter afternoon',
    'summer daytime', 'spring daytime', 'fall daytime', 'winter daytime',
    'summer pool', 'spring pool', 'summer beach', 'spring beach'
  ],
  
  // Negative keywords that suggest this is NOT a party event
  negative: [
    'conference', 'seminar', 'lecture', 'workshop', 'class', 'course',
    'training', 'webinar', 'meeting', 'symposium', 'convention',
    'presentation', 'talk', 'panel', 'discussion', 'forum',
    'debate', 'town hall', 'assembly', 'congress', 'summit',
    'educational', 'academic', 'learning', 'study', 'research',
    'business meeting', 'corporate event', 'board meeting', 'committee meeting',
    'prayer', 'worship', 'service', 'mass', 'sermon', 'religious',
    'meditation', 'spiritual', 'ceremony', 'ritual', 'sacred',
    'charity', 'fundraiser', 'donation', 'volunteer', 'nonprofit',
    'protest', 'rally', 'demonstration', 'march', 'activism',
    'health', 'wellness', 'fitness', 'exercise', 'workout',
    'therapy', 'counseling', 'support group', 'recovery', 'treatment'
  ],

  // Themed party specific terms
  themed: [
    'themed party', 'costume party', 'masquerade', 'dress up', 'fancy dress',
    'theme night', 'themed event', 'themed celebration', 'themed social',
    'decade party', '80s party', '90s party', '70s party', '60s party',
    'retro party', 'vintage party', 'throwback party', 'throwback night',
    'halloween party', 'christmas party', 'holiday party', 'new years party',
    'carnival party', 'mardi gras', 'cinco de mayo', 'st patricks day',
    'valentines party', 'halloween bash', 'costume bash', 'costume contest',
    'theme costume', 'themed costume', 'cosplay party', 'character party',
    'movie theme', 'tv theme', 'music theme', 'celebrity theme',
    'black tie', 'white party', 'black and white', 'color theme',
    'neon party', 'glow party', 'uv party', 'glow in the dark',
    'tropical party', 'beach theme', 'luau', 'hawaiian', 'tiki',
    'western theme', 'country theme', 'cowboy', 'wild west',
    'space theme', 'sci-fi theme', 'futuristic', 'alien', 'galaxy'
  ],

  // Exclusive party specific terms
  exclusive: [
    'exclusive party', 'vip party', 'private party', 'members only',
    'invite only', 'guest list', 'rsvp required', 'limited capacity',
    'limited tickets', 'exclusive access', 'exclusive event', 'exclusive venue',
    'premium experience', 'luxury party', 'high-end party', 'upscale party',
    'elite party', 'elite social', 'elite event', 'elite celebration',
    'exclusive social', 'exclusive celebration', 'exclusive gathering',
    'vip access', 'vip entrance', 'vip area', 'vip section', 'vip lounge',
    'vip tables', 'bottle service', 'table service', 'reserved seating',
    'private room', 'private area', 'private section', 'private lounge',
    'celebrity', 'influencer', 'famous', 'notable', 'renowned',
    'red carpet', 'velvet rope', 'door selection', 'strict door'
  ],

  // Underground party specific terms
  underground: [
    'underground party', 'warehouse party', 'industrial party', 'secret party',
    'secret location', 'undisclosed location', 'address on rsvp', 'location tba',
    'underground venue', 'underground club', 'underground scene', 'underground event',
    'underground social', 'underground celebration', 'underground gathering',
    'underground music', 'underground dj', 'underground artist', 'underground label',
    'underground collective', 'underground movement', 'underground culture',
    'after hours', 'late night', 'early morning', 'sunrise party', 'sunset party',
    'illegal party', 'unauthorized party', 'unlicensed venue', 'unlicensed event',
    'word of mouth', 'invite only', 'private invite', 'secret invite',
    'underground network', 'underground community', 'underground society',
    'alternative scene', 'alternative venue', 'alternative space', 'alternative party'
  ],

  // Festival party specific terms
  festival: [
    'music festival', 'festival party', 'festival event', 'festival celebration',
    'festival gathering', 'festival experience', 'festival atmosphere',
    'multi-day festival', 'weekend festival', 'day festival', 'night festival',
    'outdoor festival', 'indoor festival', 'urban festival', 'rural festival',
    'electronic festival', 'edm festival', 'dance festival', 'house festival',
    'techno festival', 'hip hop festival', 'rap festival', 'rock festival',
    'indie festival', 'alternative festival', 'pop festival', 'jazz festival',
    'festival stage', 'festival lineup', 'festival acts', 'festival artists',
    'festival djs', 'festival performers', 'festival headliners', 'festival sets',
    'festival grounds', 'festival site', 'festival area', 'festival venue',
    'festival camping', 'festival accommodation', 'festival tickets', 'festival pass',
    'festival wristband', 'festival badge', 'festival vip', 'festival experience'
  ],

  // Holiday party specific terms
  holiday: [
    'holiday party', 'christmas party', 'new years party', 'new years eve',
    'halloween party', 'thanksgiving party', 'easter party', 'valentines party',
    'st patricks day party', 'cinco de mayo party', 'fourth of july party',
    'independence day party', 'labor day party', 'memorial day party',
    'holiday celebration', 'holiday event', 'holiday gathering', 'holiday social',
    'holiday mixer', 'holiday bash', 'holiday extravaganza', 'holiday spectacular',
    'seasonal party', 'seasonal celebration', 'seasonal event', 'seasonal gathering',
    'winter party', 'spring party', 'summer party', 'fall party', 'autumn party',
    'holiday theme', 'holiday music', 'holiday drinks', 'holiday food',
    'holiday decorations', 'holiday atmosphere', 'holiday spirit', 'holiday cheer',
    'holiday tradition', 'holiday custom', 'holiday ritual', 'holiday practice'
  ]
};
/**
 * Helper function to detect party-related keywords in title or description
 * Enhanced to be more sensitive to party-related terms
 */
/**
 * Enhanced party event detection with semantic understanding and context analysis
 * Implements improved detection algorithms with pattern matching and entity recognition
 */
export function detectPartyEvent(title: string = '', description: string = '', venue: string = '', time: string = ''): boolean {
  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const venueLower = (venue || '').toLowerCase();
  const timeLower = (time || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower} ${venueLower} ${timeLower}`;

  // Track evidence for better explainability and confidence scoring
  const evidence = {
    titleMatches: [] as string[],
    descriptionMatches: [] as string[],
    venueMatches: [] as string[],
    timeMatches: [] as string[],
    patternMatches: [] as string[],
    entityMatches: [] as string[]
  };

  // Check for negative keywords first - if strong negative indicators are present,
  // we can quickly determine this is not a party event
  const negativeMatches = partyKeywords.negative.filter(keyword => combinedText.includes(keyword));
  if (negativeMatches.length >= 3) {
    console.log(`[PARTY_DETECTION] Event: "${title}" - Multiple negative indicators (${negativeMatches.length}), not a party event`);
    return false;
  }

  // Quick check for exact matches of high-confidence party terms
  // This is a fast path for obvious party events
  const highConfidenceTerms = [
    'party', 'nightclub', 'club night', 'dance party', 'rave', 'dj set', 'nightlife',
    'festival', 'celebration', 'social', 'mixer', 'day party', 'pool party',
    'silent disco', 'warehouse party', 'underground party', 'exclusive party'
  ];

  // Check for exact matches in title (highest confidence)
  const titleExactMatches = highConfidenceTerms.filter(term => titleLower.includes(term));
  if (titleExactMatches.length > 0) {
    evidence.titleMatches.push(...titleExactMatches);
    console.log(`[PARTY_DETECTION] Event: "${title}" - Quick match on high-confidence term in title: ${titleExactMatches.join(', ')}`);
    return true;
  }

  // Check for exact matches in description
  const descExactMatches = highConfidenceTerms.filter(term => descLower.includes(term));
  if (descExactMatches.length > 0) {
    evidence.descriptionMatches.push(...descExactMatches);
    console.log(`[PARTY_DETECTION] Event: "${title}" - Quick match on high-confidence term in description: ${descExactMatches.join(', ')}`);
    return true;
  }

  // NEW: Entity recognition for venues
  const venueEntities = [
    'club', 'lounge', 'bar', 'nightclub', 'disco', 'venue', 'hall',
    'rooftop', 'terrace', 'warehouse', 'underground', 'speakeasy'
  ];
  
  // Check if venue name contains strong venue indicators
  const venueEntityMatches = venueEntities.filter(entity => venueLower.includes(entity));
  if (venueEntityMatches.length > 0) {
    evidence.venueMatches.push(...venueEntityMatches);
    evidence.entityMatches.push(`venue:${venueEntityMatches.join(',')}`);
    
    // If venue is a strong indicator (like "club" or "nightclub"), lower the threshold
    if (venueEntityMatches.some(match => ['club', 'nightclub', 'disco'].includes(match))) {
      console.log(`[PARTY_DETECTION] Event: "${title}" - Strong venue entity match: ${venueEntityMatches.join(', ')}`);
      // Apply venue-specific threshold
      const venueScore = 40 * KEYWORD_WEIGHTS.ENTITY_VENUE;
      if (venueScore >= SCORE_THRESHOLDS.VENUE_STRONG) {
        return true;
      }
    }
  }

  // NEW: Temporal context analysis
  if (time) {
    // Extract hour if time is in standard format (HH:MM)
    let hour = -1;
    if (time.includes(':')) {
      const timeParts = time.split(':');
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0]);
      }
    }
    
    // Night hours are strong indicators for party events
    if (hour >= 20 || hour < 4) {
      evidence.timeMatches.push(`night-hours:${hour}`);
      
      // If we also have venue matches, this is a strong combined indicator
      if (venueEntityMatches.length > 0) {
        console.log(`[PARTY_DETECTION] Event: "${title}" - Night hours (${hour}) + venue match`);
        return true;
      }
    }
    
    // Day party hours
    if (hour >= 11 && hour < 18) {
      evidence.timeMatches.push(`day-party-hours:${hour}`);
      
      // Check for day party keywords
      const dayPartyMatches = partyKeywords.dayParty.filter(keyword => combinedText.includes(keyword));
      if (dayPartyMatches.length > 0) {
        console.log(`[PARTY_DETECTION] Event: "${title}" - Day party hours (${hour}) + day party keywords`);
        return true;
      }
    }
  }

  // NEW: Contextual pattern matching
  // These are more complex patterns that indicate party events
  const contextualPatterns = [
    // Format: [pattern, confidence, category]
    { pattern: /dj\s+(?:set|night|performance|lineup)/i, confidence: 0.9, category: 'club' },
    { pattern: /(?:open|hosted)\s+bar/i, confidence: 0.8, category: 'social' },
    { pattern: /(?:bottle|vip)\s+(?:service|table)/i, confidence: 0.9, category: 'exclusive' },
    { pattern: /dance\s+(?:floor|music|night)/i, confidence: 0.85, category: 'club' },
    { pattern: /live\s+dj/i, confidence: 0.9, category: 'club' },
    { pattern: /(?:rooftop|terrace)\s+(?:party|event|celebration)/i, confidence: 0.8, category: 'rooftop' },
    { pattern: /(?:day|pool|beach)\s+(?:party|event)/i, confidence: 0.85, category: 'day-party' },
    { pattern: /(?:exclusive|private)\s+(?:access|event|party)/i, confidence: 0.8, category: 'exclusive' },
    { pattern: /(?:immersive|interactive)\s+(?:experience|event)/i, confidence: 0.85, category: 'immersive' },
    { pattern: /(?:after|late\s+night)\s+(?:party|hours)/i, confidence: 0.9, category: 'club' }
  ];
  
  // Check for contextual patterns
  const patternMatches = contextualPatterns.filter(p => p.pattern.test(combinedText));
  if (patternMatches.length > 0) {
    evidence.patternMatches.push(...patternMatches.map(p => p.pattern.toString()));
    
    // If we have high confidence pattern matches, return true
    const highConfidencePatterns = patternMatches.filter(p => p.confidence >= 0.85);
    if (highConfidencePatterns.length > 0) {
      console.log(`[PARTY_DETECTION] Event: "${title}" - High confidence pattern matches: ${highConfidencePatterns.map(p => p.pattern).join(', ')}`);
      return true;
    }
    
    // If we have multiple pattern matches, that's also a strong indicator
    if (patternMatches.length >= 2) {
      console.log(`[PARTY_DETECTION] Event: "${title}" - Multiple pattern matches: ${patternMatches.length}`);
      return true;
    }
  }

  // Check for category-specific indicators
  const categoryIndicators = {
    strong: partyKeywords.strong.filter(keyword => combinedText.includes(keyword)),
    dayParty: partyKeywords.dayParty.filter(keyword => combinedText.includes(keyword)),
    themed: partyKeywords.themed.filter(keyword => combinedText.includes(keyword)),
    exclusive: partyKeywords.exclusive.filter(keyword => combinedText.includes(keyword)),
    underground: partyKeywords.underground.filter(keyword => combinedText.includes(keyword)),
    festival: partyKeywords.festival.filter(keyword => combinedText.includes(keyword)),
    holiday: partyKeywords.holiday.filter(keyword => combinedText.includes(keyword))
  };
  
  // If we have direct indicators from any category, that's a strong signal
  const hasDirectIndicators = Object.values(categoryIndicators).some(matches => matches.length > 0);
  if (hasDirectIndicators) {
    // Add to evidence
    Object.entries(categoryIndicators).forEach(([category, matches]) => {
      if (matches.length > 0) {
        evidence.descriptionMatches.push(...matches);
      }
    });
    
    console.log(`[PARTY_DETECTION] Event: "${title}" - Direct category indicator matches`);
    return true;
  }

  // For more ambiguous cases, calculate a detailed score with evidence tracking
  let score = 0;
  let evidenceCount = 0;

  // Enhanced scoring with evidence tracking
  Object.entries(categoryIndicators).forEach(([category, matches]) => {
    // Get the appropriate weight based on category
    let weight = 15;
    if (category === 'strong') weight = 20;
    if (category === 'exclusive' || category === 'underground') weight = 18;
    
    // Score title matches (weighted higher)
    const titleMatches = matches.filter(keyword => titleLower.includes(keyword));
    if (titleMatches.length > 0) {
      const titleScore = weight * KEYWORD_WEIGHTS.TITLE;
      score += titleScore;
      evidence.titleMatches.push(...titleMatches);
      evidenceCount += titleMatches.length;
      
      console.log(`[PARTY_DETECTION] Event: "${title}" - Title matches for ${category}: ${titleMatches.length}, Score: +${titleScore}`);
    }
    
    // Score description matches
    const descMatches = matches.filter(keyword => descLower.includes(keyword) && !titleMatches.includes(keyword));
    if (descMatches.length > 0) {
      const descScore = weight * KEYWORD_WEIGHTS.DESC;
      score += descScore;
      evidence.descriptionMatches.push(...descMatches);
      evidenceCount += descMatches.length;
      
      console.log(`[PARTY_DETECTION] Event: "${title}" - Description matches for ${category}: ${descMatches.length}, Score: +${descScore}`);
    }
  });

  // Score venue matches with enhanced entity recognition
  if (venue) {
    // Venue-specific party indicators with confidence levels
    const venuePartyTerms = [
      { term: 'nightclub', confidence: 'high' },
      { term: 'club', confidence: 'high' },
      { term: 'disco', confidence: 'high' },
      { term: 'lounge', confidence: 'medium' },
      { term: 'bar', confidence: 'medium' },
      { term: 'dance', confidence: 'medium' },
      { term: 'venue', confidence: 'low' },
      { term: 'hall', confidence: 'low' }
    ];
    
    venuePartyTerms.forEach(({ term, confidence }) => {
      if (venueLower.includes(term)) {
        // Apply confidence-based weighting
        let confidenceMultiplier = 1.0;
        if (confidence === 'high') confidenceMultiplier = KEYWORD_WEIGHTS.HIGH_CONFIDENCE;
        if (confidence === 'low') confidenceMultiplier = KEYWORD_WEIGHTS.LOW_CONFIDENCE;
        
        const venueScore = 25 * KEYWORD_WEIGHTS.VENUE * confidenceMultiplier;
        score += venueScore;
        evidence.venueMatches.push(term);
        evidenceCount++;
        
        console.log(`[PARTY_DETECTION] Event: "${title}" - Venue match: ${term} (${confidence}), Score: +${venueScore}`);
      }
    });
  }

  // Enhanced temporal context analysis
  if (time) {
    // Extract hour if time is in standard format (HH:MM)
    let hour = -1;
    if (time.includes(':')) {
      const timeParts = time.split(':');
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0]);
      }
    }
    
    // Score based on time of day
    if (hour >= 0) {
      let timeScore = 0;
      let timeContext = '';
      
      // Night hours (8 PM - 4 AM) are strong indicators for party events
      if (hour >= 20 || hour < 4) {
        timeScore = 20 * KEYWORD_WEIGHTS.TIME;
        timeContext = 'night';
      }
      // Afternoon/evening (4 PM - 8 PM) are moderate indicators
      else if (hour >= 16 && hour < 20) {
        timeScore = 15 * KEYWORD_WEIGHTS.TIME;
        timeContext = 'evening';
      }
      // Day party hours (11 AM - 4 PM)
      else if (hour >= 11 && hour < 16) {
        timeScore = 15 * KEYWORD_WEIGHTS.TIME;
        timeContext = 'day-party';
      }
      // Brunch hours (9 AM - 1 PM)
      else if (hour >= 9 && hour < 13) {
        timeScore = 10 * KEYWORD_WEIGHTS.TIME;
        timeContext = 'brunch';
      }
      
      if (timeScore > 0) {
        score += timeScore;
        evidence.timeMatches.push(`${timeContext}:${hour}`);
        evidenceCount++;
        
        console.log(`[PARTY_DETECTION] Event: "${title}" - Time context: ${timeContext} (${hour}), Score: +${timeScore}`);
      }
    }
  }

  // Additional scoring for time-related terms
  const timeTerms = [
    { term: 'night', weight: 8 },
    { term: 'evening', weight: 6 },
    { term: 'weekend', weight: 5 },
    { term: 'friday', weight: 7 },
    { term: 'saturday', weight: 7 },
    { term: 'late', weight: 6 }
  ];
  
  timeTerms.forEach(({ term, weight }) => {
    if (titleLower.includes(term)) {
      const timeTermScore = weight * KEYWORD_WEIGHTS.TITLE;
      score += timeTermScore;
      evidence.titleMatches.push(term);
      evidenceCount++;
      
      console.log(`[PARTY_DETECTION] Event: "${title}" - Time term in title: ${term}, Score: +${timeTermScore}`);
    }
    if (descLower.includes(term)) {
      const timeTermScore = weight * KEYWORD_WEIGHTS.DESC;
      score += timeTermScore;
      evidence.descriptionMatches.push(term);
      evidenceCount++;
      
      console.log(`[PARTY_DETECTION] Event: "${title}" - Time term in description: ${term}, Score: +${timeTermScore}`);
    }
  });

  // Negative scoring with evidence tracking
  const negativeTermsInTitle = partyKeywords.negative.filter(keyword => titleLower.includes(keyword));
  if (negativeTermsInTitle.length > 0) {
    const negativeScore = negativeTermsInTitle.length * 10 * KEYWORD_WEIGHTS.NEGATIVE;
    score += negativeScore; // Negative weight reduces score
    
    console.log(`[PARTY_DETECTION] Event: "${title}" - Negative terms in title: ${negativeTermsInTitle.length}, Score: ${negativeScore}`);
  }
  
  const negativeTermsInDesc = partyKeywords.negative.filter(keyword =>
    descLower.includes(keyword) && !negativeTermsInTitle.includes(keyword)
  );
  if (negativeTermsInDesc.length > 0) {
    const negativeScore = negativeTermsInDesc.length * 5 * KEYWORD_WEIGHTS.NEGATIVE;
    score += negativeScore; // Negative weight reduces score
    
    console.log(`[PARTY_DETECTION] Event: "${title}" - Negative terms in description: ${negativeTermsInDesc.length}, Score: ${negativeScore}`);
  }

  // Apply multi-evidence boost if we have evidence from multiple sources
  const evidenceTypes = [
    evidence.titleMatches.length > 0,
    evidence.descriptionMatches.length > 0,
    evidence.venueMatches.length > 0,
    evidence.timeMatches.length > 0,
    evidence.patternMatches.length > 0
  ].filter(Boolean).length;
  
  if (evidenceTypes >= 2) {
    const multiEvidenceBoost = evidenceTypes * 5 * KEYWORD_WEIGHTS.CONTEXT_BOOST;
    score += multiEvidenceBoost;
    
    console.log(`[PARTY_DETECTION] Event: "${title}" - Multi-evidence boost (${evidenceTypes} types), Score: +${multiEvidenceBoost}`);
  }

  // Apply normalization for consistent interpretation
  score = score * SCORE_NORMALIZATION;
  
  // Determine appropriate threshold based on evidence
  let threshold = SCORE_THRESHOLDS.LOW;
  
  // Adjust threshold based on evidence types
  if (evidence.venueMatches.length > 0) {
    threshold = SCORE_THRESHOLDS.VENUE_STRONG;
  } else if (evidence.timeMatches.length > 0) {
    threshold = SCORE_THRESHOLDS.TIME_STRONG;
  } else if (evidenceTypes >= 3) {
    threshold = SCORE_THRESHOLDS.MULTI_EVIDENCE;
  } else if (evidence.patternMatches.length > 0) {
    threshold = SCORE_THRESHOLDS.HIGH_CONFIDENCE;
  }

  // Log the final score and threshold for debugging
  console.log(`[PARTY_DETECTION] Event: "${title}", Final Score: ${score.toFixed(2)}, Threshold: ${threshold}, Evidence Count: ${evidenceCount}`);

  // Return true if score meets adaptive threshold
  return score >= threshold;
}
/**
 * Calculate a party relevance score (0-100) with enhanced confidence scoring
 * and evidence tracking for better explainability
 */
export function calculatePartyScore(
  title: string = '',
  description: string = '',
  time: string = '',
  subcategory: PartySubcategory = 'general',
  venue: string = ''
): number {
  let score = 0;
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const venueLower = (venue || '').toLowerCase();
  
  // Track evidence for better explainability
  const evidence: Record<string, string[]> = {
    title: [],
    description: [],
    venue: [],
    time: [],
    pattern: []
  };

  // Enhanced base score from keyword detection with evidence tracking
  const baseScore = partyKeywords.strong.reduce((acc, keyword) => {
    if (titleLower.includes(keyword)) {
      acc += 20 * KEYWORD_WEIGHTS.TITLE;
      evidence.title.push(keyword);
    }
    if (descLower.includes(keyword)) {
      acc += 20 * KEYWORD_WEIGHTS.DESC;
      evidence.description.push(keyword);
    }
    return acc;
  }, 0);

  score += baseScore;

  // Enhanced subcategory-specific scoring with confidence levels
  const subcategoryBonus = {
    'immersive': { score: 30, confidence: 'high' },
    'silent': { score: 25, confidence: 'high' },
    'popup': { score: 25, confidence: 'high' },
    'rooftop': { score: 20, confidence: 'medium' },
    'club': { score: 20, confidence: 'medium' },
    'day-party': { score: 15, confidence: 'medium' },
    'brunch': { score: 15, confidence: 'medium' },
    'networking': { score: 10, confidence: 'low' },
    'celebration': { score: 10, confidence: 'low' },
    'themed': { score: 15, confidence: 'medium' },
    'exclusive': { score: 20, confidence: 'high' },
    'underground': { score: 25, confidence: 'high' },
    'festival': { score: 20, confidence: 'medium' },
    'holiday': { score: 15, confidence: 'medium' },
    'general': { score: 0, confidence: 'low' }
  };

  // Apply subcategory bonus with confidence adjustment
  const subcategoryInfo = subcategoryBonus[subcategory] || subcategoryBonus.general;
  let confidenceMultiplier = 1.0;
  
  if (subcategoryInfo.confidence === 'high') {
    confidenceMultiplier = KEYWORD_WEIGHTS.HIGH_CONFIDENCE;
  } else if (subcategoryInfo.confidence === 'low') {
    confidenceMultiplier = KEYWORD_WEIGHTS.LOW_CONFIDENCE;
  }
  
  const adjustedSubcategoryBonus = subcategoryInfo.score * confidenceMultiplier;
  score += adjustedSubcategoryBonus;

  // Enhanced time-based scoring with context analysis
  if (time && time.length >= 5) {
    const hour = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(3, 5));
    const timeInMinutes = hour * 60 + minutes;

    // Prime party times get bonus points with context
    if (timeInMinutes >= 1200 || timeInMinutes < 300) { // 8 PM - 5 AM
      const nightBonus = 20 * KEYWORD_WEIGHTS.TIME;
      score += nightBonus;
      evidence.time.push(`night-hours:${hour}`);
      
      // Additional bonus for club events at night
      if (subcategory === 'club' || subcategory === 'underground') {
        const contextBonus = 10 * KEYWORD_WEIGHTS.CONTEXT_BOOST;
        score += contextBonus;
        evidence.time.push('club-at-night');
      }
    } else if (timeInMinutes >= 660 && timeInMinutes < 1140) { // 11 AM - 7 PM
      const dayBonus = 15 * KEYWORD_WEIGHTS.TIME;
      score += dayBonus;
      evidence.time.push(`day-hours:${hour}`);
      
      // Additional bonus for day parties during day hours
      if (subcategory === 'day-party' || subcategory === 'brunch') {
        const contextBonus = 10 * KEYWORD_WEIGHTS.CONTEXT_BOOST;
        score += contextBonus;
        evidence.time.push('day-party-at-daytime');
      }
    }
  }
  
  // Venue context analysis
  if (venue) {
    const venueKeywords = {
      club: ['club', 'nightclub', 'disco'],
      lounge: ['lounge', 'bar', 'pub'],
      rooftop: ['rooftop', 'terrace', 'sky'],
      restaurant: ['restaurant', 'bistro', 'cafe']
    };
    
    // Check for venue type matches
    Object.entries(venueKeywords).forEach(([type, keywords]) => {
      const matches = keywords.filter(keyword => venueLower.includes(keyword));
      if (matches.length > 0) {
        // Add venue context score
        const venueBonus = 15 * KEYWORD_WEIGHTS.VENUE;
        score += venueBonus;
        evidence.venue.push(`${type}:${matches.join(',')}`);
        
        // Add context boost if venue matches subcategory
        if ((type === 'club' && ['club', 'underground'].includes(subcategory)) ||
            (type === 'lounge' && ['social', 'networking'].includes(subcategory)) ||
            (type === 'rooftop' && subcategory === 'rooftop') ||
            (type === 'restaurant' && subcategory === 'brunch')) {
          const contextBonus = 10 * KEYWORD_WEIGHTS.CONTEXT_BOOST;
          score += contextBonus;
          evidence.venue.push(`${type}-matches-${subcategory}`);
        }
      }
    });
  }
  
  // Multi-aspect representation boost
  const evidenceTypes = Object.values(evidence).filter(arr => arr.length > 0).length;
  if (evidenceTypes >= 2) {
    const multiAspectBoost = evidenceTypes * 5 * KEYWORD_WEIGHTS.MULTI_ASPECT;
    score += multiAspectBoost;
  }

  // Apply normalization for consistent interpretation
  score = score * SCORE_NORMALIZATION;
  
  // Cap score at 100
  score = Math.min(Math.round(score), 100);

  // Log the detailed score calculation with evidence
  console.log(`[PARTY_SCORE] Event: "${title}", Final Score: ${score}, Subcategory: ${subcategory}, Evidence Types: ${evidenceTypes}`);

  return score;
}

/**
 * Helper function to determine party subcategory
 */
/**
 * Enhanced party subcategory detection with hierarchical structure and multi-label support
 * Returns primary category and optional secondary categories based on compatibility
 */
export function detectPartySubcategory(
  title: string = '',
  description: string = '',
  time: string = '',
  venue: string = ''
): PartyClassification {
  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const venueLower = (venue || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower} ${venueLower}`;
  
  // Initialize evidence tracking for better explainability
  const evidence = {
    titleMatches: [] as string[],
    descriptionMatches: [] as string[],
    venueMatches: [] as string[],
    timeMatches: [] as string[],
    patternMatches: [] as string[],
    entityMatches: [] as string[]
  };

  // Define subcategory keywords
  const subcategoryKeywords = {
    // Day party specific terms
    dayParty: [
      'day party', 'day-party', 'pool party', 'daytime', 'day time',
      'outdoor party', 'garden party', 'patio party', 'beach party',
      'pool', 'day club', 'dayclub', 'afternoon party', 'rooftop party',
      'daytime event', 'afternoon event', 'day event', 'pool event', 'beach event',
      'outdoor event', 'rooftop event', 'terrace party', 'terrace event'
    ],

    // Brunch specific terms
    brunch: [
      'brunch', 'breakfast', 'morning', 'mimosa', 'bloody mary',
      'brunch party', 'breakfast party', 'morning party',
      'brunch social', 'breakfast social', 'morning social',
      'brunch event', 'breakfast event', 'morning event',
      'brunch club', 'breakfast club', 'morning club',
      'brunch lounge', 'breakfast lounge', 'morning lounge',
      'brunch bar', 'breakfast bar', 'morning bar',
      'brunch venue', 'breakfast venue', 'morning venue',
      'brunch celebration', 'breakfast celebration', 'morning celebration',
      'brunch mixer', 'breakfast mixer', 'morning mixer',
      'brunch gathering', 'breakfast gathering', 'morning gathering',
      'bottomless', 'unlimited', 'all you can drink', 'buffet'
    ],

    // Club specific terms
    club: [
      'club', 'nightclub', 'night club', 'dance club', 'disco',
      'rave', 'dj', 'dance night', 'dance party', 'edm',
      'house music', 'techno', 'electronic', 'hip hop', 'rap',
      'bottle service', 'vip table', 'dance floor', 'after party',
      'afterparty', 'late night', 'nightlife', 'night life',
      'club night', 'dance night', 'party night', 'night out',
      'dancing', 'dance', 'dj set', 'live dj', 'resident dj',
      'guest dj', 'featured dj', 'headliner', 'performer',
      'performance', 'show', 'concert', 'live music',
      'vip', 'exclusive', 'premium', 'luxury', 'upscale',
      'high-end', 'trendy', 'popular', 'hot spot', 'hotspot'
    ],

    // Immersive experience terms
    immersive: [
      'immersive', 'interactive', 'experience', 'experiential',
      'multi-sensory', 'sensory', 'art installation', 'installation',
      'immersive art', 'immersive music', 'immersive party',
      'immersive event', 'immersive social', 'immersive celebration',
      'immersive mixer', 'immersive gathering', 'immersive club',
      'immersive lounge', 'immersive bar', 'immersive venue',
      'art party', 'creative social', 'creative event',
      'creative party', 'creative celebration', 'creative mixer',
      'creative gathering', 'creative club', 'creative lounge',
      'creative bar', 'creative venue', 'art social', 'art event',
      'art celebration', 'art mixer', 'art gathering', 'art club',
      'art lounge', 'art bar', 'art venue', 'experiential event',
      'experiential social', 'experiential party', 'experiential celebration',
      'experiential mixer', 'experiential gathering', 'experiential club',
      'experiential lounge', 'experiential bar', 'experiential venue'
    ],

    // Popup event terms
    popup: [
      'popup', 'pop-up', 'pop up', 'temporary', 'limited time',
      'one night only', 'exclusive', 'secret', 'hidden',
      'popup party', 'pop-up party', 'pop up party',
      'popup social', 'pop-up social', 'pop up social',
      'popup event', 'pop-up event', 'pop up event',
      'popup celebration', 'pop-up celebration', 'pop up celebration',
      'popup mixer', 'pop-up mixer', 'pop up mixer',
      'popup gathering', 'pop-up gathering', 'pop up gathering',
      'popup club', 'pop-up club', 'pop up club',
      'popup lounge', 'pop-up lounge', 'pop up lounge',
      'popup bar', 'pop-up bar', 'pop up bar',
      'popup venue', 'pop-up venue', 'pop up venue',
      'underground party', 'warehouse party', 'industrial space',
      'temporary venue', 'limited time', 'exclusive popup',
      'one night only', 'special venue'
    ],

    silent: [
      'silent disco', 'silent party', 'headphone party',
      'silent rave', 'silent club', 'headphone club',
      'silent social', 'quiet party', 'wireless headphones',
      'multi-channel', 'multi-dj', 'choose your channel'
    ],

    rooftop: [
      'rooftop party', 'rooftop social', 'skyline party',
      'rooftop venue', 'rooftop bar', 'rooftop club',
      'terrace party', 'terrace social', 'outdoor venue',
      'sky lounge', 'sky bar', 'view venue',
      'penthouse party', 'high-rise venue'
    ],

    networking: [
      'networking', 'mixer', 'mingle', 'meet-up', 'meetup',
      'social gathering', 'social event', 'singles', 'speed dating',
      'happy hour', 'happy-hour', 'business mixer', 'professional',
      'industry', 'entrepreneur', 'startup', 'business social',
      'career', 'professionals', 'business networking'
    ],

    celebration: [
      'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
      'celebration', 'gala', 'reception', 'new years', 'new year\'s',
      'halloween', 'christmas', 'holiday party', 'launch party',
      'release party', 'grand opening', 'farewell', 'retirement',
      'engagement', 'wedding'
    ]
  };

  // Check for time-based indicators
  let timeBasedCategory: PartySubcategory | null = null;

  if (time && time.length >= 5) {
    const hour = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(3, 5));
    const timeInMinutes = hour * 60 + minutes;

    // Day party: 11 AM to 7 PM
    if (timeInMinutes >= 660 && timeInMinutes < 1140) {
      timeBasedCategory = 'day-party';
    }
    // Brunch: 10 AM to 4 PM
    if (timeInMinutes >= 600 && timeInMinutes < 960) {
      timeBasedCategory = 'brunch';
    }
    // Club: 8 PM to 5 AM next day
    if (timeInMinutes >= 1200 || timeInMinutes < 300) {
      timeBasedCategory = 'club';
    }
    // Social/Networking: 5 PM to 9 PM
    if (timeInMinutes >= 1020 && timeInMinutes < 1260) {
      timeBasedCategory = 'networking';
    }
  }

  // Check for keyword matches with evidence tracking
  const categoryMatches: Record<PartySubcategory, {
    matches: boolean,
    matchCount: number,
    confidence: number,
    evidence: string[]
  }> = {
    'general': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'day-party': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'social': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'brunch': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'club': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'networking': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'celebration': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'immersive': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'popup': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'silent': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'rooftop': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'themed': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'exclusive': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'underground': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'festival': { matches: false, matchCount: 0, confidence: 0, evidence: [] },
    'holiday': { matches: false, matchCount: 0, confidence: 0, evidence: [] }
  };
  
  // Process each subcategory
  Object.entries(subcategoryKeywords).forEach(([category, keywords]) => {
    // Find matches in title (highest confidence)
    const titleMatches = keywords.filter(keyword => titleLower.includes(keyword));
    if (titleMatches.length > 0) {
      const subcategory = category === 'dayParty' ? 'day-party' : category as PartySubcategory;
      categoryMatches[subcategory].matches = true;
      categoryMatches[subcategory].matchCount += titleMatches.length;
      categoryMatches[subcategory].confidence += 0.8;
      categoryMatches[subcategory].evidence.push(...titleMatches.map(m => `title:${m}`));
      evidence.titleMatches.push(...titleMatches);
    }
    
    // Find matches in description (medium confidence)
    const descMatches = keywords.filter(keyword =>
      descLower.includes(keyword) && !titleMatches.includes(keyword)
    );
    if (descMatches.length > 0) {
      const subcategory = category === 'dayParty' ? 'day-party' : category as PartySubcategory;
      categoryMatches[subcategory].matches = true;
      categoryMatches[subcategory].matchCount += descMatches.length;
      categoryMatches[subcategory].confidence += 0.5;
      categoryMatches[subcategory].evidence.push(...descMatches.map(m => `desc:${m}`));
      evidence.descriptionMatches.push(...descMatches);
    }
    
    // Find matches in venue (high confidence for venue-specific categories)
    if (venue) {
      const venueMatches = keywords.filter(keyword => venueLower.includes(keyword));
      if (venueMatches.length > 0) {
        const subcategory = category === 'dayParty' ? 'day-party' : category as PartySubcategory;
        categoryMatches[subcategory].matches = true;
        categoryMatches[subcategory].matchCount += venueMatches.length;
        
        // Higher confidence for venue matches in venue-specific categories
        const venueSpecificBoost = ['club', 'rooftop', 'lounge'].includes(subcategory) ? 0.9 : 0.6;
        categoryMatches[subcategory].confidence += venueSpecificBoost;
        categoryMatches[subcategory].evidence.push(...venueMatches.map(m => `venue:${m}`));
        evidence.venueMatches.push(...venueMatches);
      }
    }
  });
  
  // Process time-based category
  if (timeBasedCategory) {
    categoryMatches[timeBasedCategory].matches = true;
    categoryMatches[timeBasedCategory].matchCount += 1;
    categoryMatches[timeBasedCategory].confidence += 0.7;
    categoryMatches[timeBasedCategory].evidence.push(`time:${timeBasedCategory}`);
    evidence.timeMatches.push(timeBasedCategory);
  }
  
  // Find primary category (highest confidence)
  let primaryCategory: PartySubcategory = 'general';
  let highestConfidence = 0;
  
  Object.entries(categoryMatches).forEach(([category, data]) => {
    if (data.matches && data.confidence > highestConfidence) {
      primaryCategory = category as PartySubcategory;
      highestConfidence = data.confidence;
    }
  });
  
  // Find compatible secondary categories using compatibility matrix
  const secondaryCategories: PartySubcategory[] = [];
  
  Object.entries(categoryMatches).forEach(([category, data]) => {
    const subcategory = category as PartySubcategory;
    
    // Skip the primary category and non-matching categories
    if (subcategory === primaryCategory || !data.matches) {
      return;
    }
    
    // Check compatibility with primary category
    const compatibility = CATEGORY_COMPATIBILITY[primaryCategory][subcategory];
    
    // Add as secondary if highly compatible and has sufficient evidence
    if (compatibility >= 0.7 && data.confidence >= 0.4) {
      secondaryCategories.push(subcategory);
    }
  });
  
  // Sort secondary categories by compatibility
  secondaryCategories.sort((a, b) => {
    const compatA = CATEGORY_COMPATIBILITY[primaryCategory][a];
    const compatB = CATEGORY_COMPATIBILITY[primaryCategory][b];
    return compatB - compatA;
  });
  
  // Limit to top 3 secondary categories
  const limitedSecondaries = secondaryCategories.slice(0, 3);
  
  // Log the detection results
  console.log(`[SUBCATEGORY_DETECTION] Event: "${title}", Primary: ${primaryCategory}, Secondary: ${limitedSecondaries.join(', ')}, Confidence: ${highestConfidence.toFixed(2)}`);
  
  // Return the classification result
  return {
    primaryCategory,
    secondaryCategories: limitedSecondaries,
    confidence: Math.min(highestConfidence * 100, 100),
    evidence
  };
}