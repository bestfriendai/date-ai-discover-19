/**
 * Party subcategory types and utility functions
 */

// Constants for scoring
const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 30
};

const KEYWORD_WEIGHTS = {
  TITLE: 2.0,    // Keywords in title are worth double
  DESC: 1.0,     // Keywords in description are worth normal weight
  TIME: 1.5      // Time-based matches are worth 1.5x
};

// Party subcategory types
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
  | 'general';

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

    // Social gathering terms - high priority
    'celebration', 'social', 'mixer', 'gathering', 'gala', 'reception',
    'meet-up', 'meetup', 'happy hour', 'happy-hour', 'mingle', 'networking',
    'social event', 'cocktail', 'singles', 'speed dating', 'social gathering',

    // Special events - high priority
    'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
    'launch party', 'release party', 'opening party',

    // Music & entertainment - medium priority
    'festival', 'fest', 'concert', 'live music', 'live dj', 'entertainment',
    'electronic music', 'hip hop', 'edm', 'house music', 'techno', 'disco',
    'bar crawl', 'pub crawl', 'show', 'performance', 'dj', 'bar', 'lounge',

    // Venue & atmosphere terms - medium priority
    'vip', 'exclusive', 'night out', 'dancing', 'club', 'venue',

    // Themed parties - high priority
    'themed party', 'costume party', 'masquerade', 'holiday party',
    'new years party', 'halloween party', 'summer party', 'winter party',
    'spring party', 'fall party', 'seasonal party', 'annual party',

    // Venue types - medium priority
    'nightclub venue', 'lounge venue', 'bar venue', 'club night', 'dance night',
    'party night', 'night life', 'social mixer', 'networking event', 'singles event',

    // Time & activity terms - lower priority
    'mingling', 'daytime event', 'pool event', 'rooftop event', 'outdoor event',
    'friday night', 'saturday night', 'weekend party', 'weekend event',
    'bottle service', 'vip tables', 'open bar', 'drink specials', 'ladies night',
    'industry night', 'college night', 'theme night', 'dance music', 'live entertainment'
  ],

  // Day party specific terms - expanded for better detection
  dayParty: [
    // Core day party terms
    'day party', 'day-party', 'pool party', 'daytime', 'day time',
    'outdoor party', 'garden party', 'patio party', 'beach party',
    'pool', 'day club', 'dayclub', 'afternoon party', 'rooftop party',

    // Event types
    'daytime event', 'afternoon event', 'day event', 'pool event', 'beach event',
    'outdoor event', 'rooftop event', 'terrace party', 'terrace event',
    'day fest', 'day festival', 'outdoor festival', 'pool festival',

    // Social gatherings
    'day celebration', 'afternoon celebration', 'daytime celebration',
    'day social', 'afternoon social', 'daytime social',
    'day mixer', 'afternoon mixer', 'daytime mixer',
    'day gathering', 'afternoon gathering', 'daytime gathering',

    // Activities
    'day drinking', 'afternoon drinking', 'daytime drinking',
    'day dancing', 'afternoon dancing', 'daytime dancing',

    // Time indicators
    'afternoon', 'daytime', 'day time', 'midday', 'mid-day',
    'morning', 'noon', 'early', 'sunrise', 'sunset',
    'brunch', 'lunch', 'day', 'sunshine', 'sunny',

    // Seasonal
    'summer day', 'spring day', 'fall day', 'winter day',
    'summer afternoon', 'spring afternoon', 'fall afternoon', 'winter afternoon',
    'summer pool', 'spring pool', 'summer beach', 'spring beach',
    'summer garden', 'spring garden', 'summer patio', 'spring patio',
    'summer outdoor', 'spring outdoor', 'fall outdoor', 'winter outdoor'
  ]
};

// Subcategory-specific keywords
const subcategoryKeywords = {
  dayParty: [
    'day party', 'day-party', 'pool party', 'daytime party',
    'afternoon party', 'outdoor party', 'garden party',
    'beach party', 'day club', 'dayclub', 'pool club',
    'day fest', 'daytime event', 'afternoon event',
    'outdoor festival', 'pool festival', 'beach festival',
    'day social', 'afternoon social', 'daytime social',
    'day drinking', 'afternoon drinking', 'daytime drinking'
  ],
  
  brunch: [
    'brunch', 'breakfast', 'morning', 'mimosa', 'bloody mary',
    'bottomless', 'champagne brunch', 'sunday brunch',
    'brunch party', 'breakfast party', 'morning party',
    'brunch club', 'brunch social', 'breakfast social',
    'brunch buffet', 'brunch special', 'morning social',
    'brunch event', 'breakfast event', 'morning event'
  ],
  
  club: [
    'nightclub', 'club night', 'dance party', 'rave',
    'dj set', 'nightlife', 'bottle service', 'vip table',
    'dance floor', 'after party', 'afterparty', 'late night',
    'club event', 'dance event', 'electronic music', 'edm',
    'house music', 'techno', 'disco', 'hip hop', 'dj',
    'night club', 'dance club', 'club scene', 'club venue'
  ],
  
  social: [
    'social', 'mixer', 'gathering', 'mingle', 'social event',
    'cocktail', 'happy hour', 'happy-hour', 'social gathering',
    'meet and greet', 'social club', 'social night',
    'social mixer', 'social hour', 'social drinks',
    'get together', 'get-together', 'community event',
    'community gathering', 'social meetup'
  ],
  
  immersive: [
    'immersive experience', 'immersive art', 'immersive music',
    'immersive party', 'interactive party', 'interactive experience',
    'immersive event', 'interactive event', 'experiential',
    'multi-sensory', 'immersive installation', 'art installation',
    'immersive theater', 'immersive performance', 'interactive art',
    'art experience', 'immersive environment', 'art party'
  ],
  
  popup: [
    'popup', 'pop-up', 'pop up', 'temporary', 'limited time',
    'popup bar', 'popup club', 'popup venue', 'popup event',
    'popup party', 'pop-up bar', 'pop-up club', 'pop-up venue',
    'pop-up event', 'pop-up party', 'temporary venue',
    'limited engagement', 'one night only', 'secret location',
    'hidden venue', 'speakeasy'
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

/**
 * Helper function to detect party-related keywords in title or description
 */
export function detectPartyEvent(title: string = '', description: string = ''): boolean {
  // Normalize inputs
  const normalizedTitle = title.toLowerCase();
  const normalizedDesc = description.toLowerCase();
  
  // Check for strong party keywords in title
  for (const keyword of partyKeywords.strong) {
    if (normalizedTitle.includes(keyword)) {
      return true;
    }
  }
  
  // Check for strong party keywords in description
  for (const keyword of partyKeywords.strong) {
    if (normalizedDesc.includes(keyword)) {
      return true;
    }
  }
  
  // Check for day party keywords in title
  for (const keyword of partyKeywords.dayParty) {
    if (normalizedTitle.includes(keyword)) {
      return true;
    }
  }
  
  // Check for day party keywords in description
  for (const keyword of partyKeywords.dayParty) {
    if (normalizedDesc.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate a party relevance score (0-100)
 */
export function calculatePartyScore(
  title: string = '',
  description: string = '',
  time: string = '',
  subcategory: PartySubcategory = 'general'
): number {
  let score = 0;
  
  // Normalize inputs
  const normalizedTitle = title.toLowerCase();
  const normalizedDesc = description.toLowerCase();
  
  // Check for strong party keywords in title (double weight)
  for (const keyword of partyKeywords.strong) {
    if (normalizedTitle.includes(keyword)) {
      score += 10 * KEYWORD_WEIGHTS.TITLE;
    }
  }
  
  // Check for strong party keywords in description
  for (const keyword of partyKeywords.strong) {
    if (normalizedDesc.includes(keyword)) {
      score += 10 * KEYWORD_WEIGHTS.DESC;
    }
  }
  
  // Check for day party keywords in title (double weight)
  for (const keyword of partyKeywords.dayParty) {
    if (normalizedTitle.includes(keyword)) {
      score += 15 * KEYWORD_WEIGHTS.TITLE;
    }
  }
  
  // Check for day party keywords in description
  for (const keyword of partyKeywords.dayParty) {
    if (normalizedDesc.includes(keyword)) {
      score += 15 * KEYWORD_WEIGHTS.DESC;
    }
  }
  
  // Add time-based score
  if (time && time.length >= 5) {
    const hour = parseInt(time.substring(0, 2));
    
    // Evening/night events (7 PM - 2 AM) get a bonus
    if (hour >= 19 || hour < 2) {
      score += 20 * KEYWORD_WEIGHTS.TIME;
    }
    
    // Afternoon events (12 PM - 6 PM) get a smaller bonus
    if (hour >= 12 && hour < 19) {
      score += 10 * KEYWORD_WEIGHTS.TIME;
    }
  }
  
  // Add subcategory-based score
  if (subcategory !== 'general') {
    score += 15;
  }
  
  // Cap the score at 100
  return Math.min(100, score);
}

/**
 * Helper function to determine party subcategory
 */
export function detectPartySubcategory(title: string = '', description: string = '', time: string = ''): PartySubcategory {
  // Normalize inputs
  const normalizedTitle = title.toLowerCase();
  const normalizedDesc = description.toLowerCase();
  const combinedText = `${normalizedTitle} ${normalizedDesc}`;
  
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
  
  // Check for keyword matches
  const matchesDayParty = subcategoryKeywords.dayParty.some(keyword => combinedText.includes(keyword));
  const matchesBrunch = subcategoryKeywords.brunch.some(keyword => combinedText.includes(keyword));
  const matchesClub = subcategoryKeywords.club.some(keyword => combinedText.includes(keyword));
  const matchesNetworking = subcategoryKeywords.networking.some(keyword => combinedText.includes(keyword));
  const matchesCelebration = subcategoryKeywords.celebration.some(keyword => combinedText.includes(keyword));
  
  // Log the detection results
  console.log(`[SUBCATEGORY_DETECTION] Event: "${title}", Matches: DayParty=${matchesDayParty}, Brunch=${matchesBrunch}, Club=${matchesClub}, Networking=${matchesNetworking}, Celebration=${matchesCelebration}, TimeBasedCategory=${timeBasedCategory || 'none'}`);
  
  // Determine the subcategory based on keyword matches and time
  // Priority: Immersive > Silent > Popup > Rooftop > Brunch > Day Party > Club > Networking > Celebration > General
  
  // Check for modern party types first
  const matchesImmersive = subcategoryKeywords.immersive.some(keyword => combinedText.includes(keyword));
  const matchesSilent = subcategoryKeywords.silent.some(keyword => combinedText.includes(keyword));
  const matchesPopup = subcategoryKeywords.popup.some(keyword => combinedText.includes(keyword));
  const matchesRooftop = subcategoryKeywords.rooftop.some(keyword => combinedText.includes(keyword));
  
  // Return based on priority
  if (matchesImmersive) return 'immersive';
  if (matchesSilent) return 'silent';
  if (matchesPopup) return 'popup';
  if (matchesRooftop) return 'rooftop';
  if (matchesBrunch) return 'brunch';
  if (matchesDayParty || (timeBasedCategory === 'day-party' && !matchesClub && !matchesNetworking)) return 'day-party';
  if (matchesClub || timeBasedCategory === 'club') return 'club';
  if (matchesNetworking) return 'networking';
  if (matchesCelebration) return 'celebration';
  
  // Default to general if no specific subcategory is detected
  return 'general';
}
