/**
 * Party subcategory types and utility functions
 */

// Constants for scoring
const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 40, // Lowered from 50 to catch more medium-confidence party events
  LOW: 25     // Lowered from 30 to be more inclusive with party detection
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
    'summer pool', 'spring pool', 'summer beach', 'spring beach',
    'summer garden', 'spring garden', 'summer patio', 'spring patio',
    'summer outdoor', 'spring outdoor', 'fall outdoor', 'winter outdoor',
    'summer party', 'spring party', 'summer celebration', 'spring celebration',
    'summer festival', 'spring festival', 'summer concert', 'spring concert',
    'summer event', 'spring event', 'summer gathering', 'spring gathering',
    'summer social', 'spring social', 'summer mixer', 'spring mixer'
  ]
};

/**
 * Helper function to detect party-related keywords in title or description
 * Enhanced to be more sensitive to party-related terms
 */
export function detectPartyEvent(title: string = '', description: string = ''): boolean {
  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  // Quick check for exact matches of high-confidence party terms
  // This is a fast path for obvious party events
  const highConfidenceTerms = [
    'party', 'nightclub', 'club night', 'dance party', 'rave', 'dj set', 'nightlife',
    'festival', 'celebration', 'social', 'mixer', 'day party', 'pool party'
  ];

  const hasExactMatch = highConfidenceTerms.some(term =>
    titleLower.includes(term) || descLower.includes(term)
  );

  // If we have an exact match of high-confidence terms, return true immediately
  if (hasExactMatch) {
    console.log(`[PARTY_DETECTION] Event: "${title}" - Quick match on high-confidence term`);
    return true;
  }

  // Check for strong party indicators
  const hasStrongPartyIndicator = partyKeywords.strong.some(keyword => combinedText.includes(keyword));

  // Check for day party indicators
  const hasDayPartyIndicator = partyKeywords.dayParty.some(keyword => combinedText.includes(keyword));

  // If we have direct indicators, return true
  if (hasStrongPartyIndicator || hasDayPartyIndicator) {
    console.log(`[PARTY_DETECTION] Event: "${title}" - Direct indicator match`);
    return true;
  }

  // For more ambiguous cases, calculate a detailed score
  let score = 0;

  // Score title matches (weighted higher)
  partyKeywords.strong.forEach(keyword => {
    if (titleLower.includes(keyword)) {
      score += 20 * KEYWORD_WEIGHTS.TITLE;
    }
  });

  partyKeywords.dayParty.forEach(keyword => {
    if (titleLower.includes(keyword)) {
      score += 15 * KEYWORD_WEIGHTS.TITLE;
    }
  });

  // Score description matches
  partyKeywords.strong.forEach(keyword => {
    if (descLower.includes(keyword)) {
      score += 20 * KEYWORD_WEIGHTS.DESC;
    }
  });

  partyKeywords.dayParty.forEach(keyword => {
    if (descLower.includes(keyword)) {
      score += 15 * KEYWORD_WEIGHTS.DESC;
    }
  });

  // Additional scoring for venue-related terms that often indicate party events
  const venueTerms = ['club', 'lounge', 'bar', 'venue', 'hall', 'room'];
  venueTerms.forEach(term => {
    if (titleLower.includes(term)) {
      score += 10 * KEYWORD_WEIGHTS.TITLE;
    }
    if (descLower.includes(term)) {
      score += 10 * KEYWORD_WEIGHTS.DESC;
    }
  });

  // Additional scoring for time-related terms that often indicate party events
  const timeTerms = ['night', 'evening', 'weekend', 'friday', 'saturday'];
  timeTerms.forEach(term => {
    if (titleLower.includes(term)) {
      score += 5 * KEYWORD_WEIGHTS.TITLE;
    }
    if (descLower.includes(term)) {
      score += 5 * KEYWORD_WEIGHTS.DESC;
    }
  });

  // Log the score for debugging
  console.log(`[PARTY_DETECTION] Event: "${title}", Score: ${score}`);

  // Return true if score meets minimum threshold
  return score >= SCORE_THRESHOLDS.LOW;
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
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();

  // Base score from keyword detection
  const baseScore = partyKeywords.strong.reduce((acc, keyword) => {
    if (titleLower.includes(keyword)) acc += 20 * KEYWORD_WEIGHTS.TITLE;
    if (descLower.includes(keyword)) acc += 20 * KEYWORD_WEIGHTS.DESC;
    return acc;
  }, 0);

  score += baseScore;

  // Bonus for specific subcategories
  const subcategoryBonus = {
    'immersive': 30,
    'silent': 25,
    'popup': 25,
    'rooftop': 20,
    'club': 20,
    'day-party': 15,
    'brunch': 15,
    'networking': 10,
    'celebration': 10,
    'general': 0
  };

  score += subcategoryBonus[subcategory] || 0;

  // Time-based bonus
  if (time && time.length >= 5) {
    const hour = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(3, 5));
    const timeInMinutes = hour * 60 + minutes;

    // Prime party times get bonus points
    if (timeInMinutes >= 1200 || timeInMinutes < 300) { // 8 PM - 5 AM
      score += 20 * KEYWORD_WEIGHTS.TIME;
    } else if (timeInMinutes >= 660 && timeInMinutes < 1140) { // 11 AM - 7 PM
      score += 15 * KEYWORD_WEIGHTS.TIME;
    }
  }

  // Cap score at 100
  score = Math.min(Math.round(score), 100);

  // Log the detailed score calculation
  console.log(`[PARTY_SCORE] Event: "${title}", Final Score: ${score}, Subcategory: ${subcategory}`);

  return score;
}

/**
 * Helper function to determine party subcategory
 */
export function detectPartySubcategory(title: string = '', description: string = '', time: string = ''): PartySubcategory {
  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

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
