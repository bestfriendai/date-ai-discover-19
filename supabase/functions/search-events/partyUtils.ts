/**
 * Party subcategory types and utility functions
 */

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

/**
 * Helper function to detect party-related keywords in title or description
 */
export function detectPartyEvent(title: string = '', description: string = ''): boolean {
  // Define specific party-related keywords for different types of party events
  const partyKeywords = {
    // General party terms that strongly indicate a party event - massively expanded for comprehensive detection
    strong: [
      // Modern party terms
      'party', 'celebration', 'social', 'mixer', 'gathering', 'gala',
      'reception', 'meet-up', 'meetup', 'happy hour', 'happy-hour',
      'mingle', 'networking', 'social event', 'cocktail', 'dance party', 'rave',
      'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
      'afterparty', 'after-party', 'singles', 'speed dating', 'social gathering',
      'festival', 'fest', 'concert', 'live music', 'live dj', 'entertainment',
      'vip', 'exclusive', 'launch', 'premiere', 'opening', 'event',
      'night out', 'dance floor', 'dancing', 'electronic music', 'hip hop', 'edm',
      'house music', 'techno', 'disco', 'bar crawl', 'pub crawl', 'social event',
      'networking event', 'mixer event', 'celebration event', 'vip event',
      'exclusive event', 'special event', 'dance event', 'music event', 'nightlife event',
      'show', 'performance', 'dj', 'nightlife', 'bar', 'lounge', 'club',
      
      // New modern party terms
      'silent disco', 'pop-up party', 'immersive experience', 'secret party',
      'underground party', 'warehouse party', 'art party', 'creative social',
      'experiential event', 'interactive party', 'themed social',
      'cultural celebration', 'community gathering', 'local event',
      'micro festival', 'boutique festival', 'curated experience',
      'exclusive access', 'members only', 'private event',
      'speakeasy', 'hidden venue', 'secret location',
      'popup bar', 'popup club', 'popup venue',
      'silent party', 'headphone party', 'silent rave',
      'immersive art', 'immersive music', 'immersive party',
      'rooftop social', 'rooftop party', 'skyline party',
      'yacht party', 'boat party', 'cruise party',
      'pool social', 'beach social', 'outdoor social',

      // Additional party terms
      'themed party', 'costume party', 'masquerade', 'holiday party',
      'new years party', 'halloween party', 'summer party', 'winter party',
      'spring party', 'fall party', 'seasonal party', 'annual party',
      'live dj', 'live band', 'live performance', 'music venue', 'dance venue',
      'nightclub venue', 'lounge venue', 'bar venue', 'club night', 'dance night',
      'party night', 'night life', 'social mixer', 'networking event', 'singles event',
      'mingling', 'daytime event', 'pool event', 'rooftop event', 'outdoor event',
      'friday night', 'saturday night', 'weekend party', 'weekend event',
      'bottle service', 'vip tables', 'open bar', 'drink specials', 'ladies night',
      'industry night', 'college night', 'theme night', 'dance music', 'live entertainment'
    ],

    // Day party specific terms - expanded for better detection
    dayParty: [
      'day party', 'day-party', 'pool party', 'daytime', 'day time',
      'outdoor party', 'garden party', 'patio party', 'beach party',
      'pool', 'day club', 'dayclub', 'afternoon party', 'rooftop party',
      'daytime event', 'afternoon event', 'day event', 'pool event', 'beach event',
      'outdoor event', 'rooftop event', 'terrace party', 'terrace event',
      'day fest', 'day festival', 'outdoor festival', 'pool festival',
      'day celebration', 'afternoon celebration', 'daytime celebration',
      'day social', 'afternoon social', 'daytime social', 'day mixer',
      'bbq party', 'barbecue party', 'cookout', 'picnic', 'outdoor social',
      
      // New modern day party terms
      'day rave', 'sunshine social', 'sunset party', 'sunset social',
      'poolside social', 'poolside party', 'beach club', 'beach social',
      'yacht day', 'boat day', 'cruise day', 'harbor party',
      'garden social', 'outdoor lounge', 'lawn party', 'park social',
      'day festival', 'afternoon festival', 'day carnival',
      'outdoor experience', 'outdoor celebration', 'sunshine celebration',
      'daytime popup', 'day popup', 'popup pool party',
      'rooftop brunch', 'rooftop social', 'skyline social',
      'terrace social', 'patio social', 'courtyard party',
      'outdoor silent disco', 'day silent disco', 'outdoor headphone party'
    ],

    // Brunch event terms - expanded for better detection
    brunch: [
      'brunch', 'breakfast', 'morning', 'mimosa', 'bottomless',
      'champagne brunch', 'sunday brunch', 'brunch party',
      'brunch & bubbles', 'brunch and bubbles', 'brunch social',
      'breakfast party', 'morning party', 'morning social',
      'brunch event', 'breakfast event', 'morning event',
      'brunch celebration', 'breakfast celebration',
      'brunch club', 'breakfast club', 'morning mixer',
      'bloody mary', 'mimosas', 'bellini', 'breakfast cocktails',
      'brunch buffet', 'breakfast buffet', 'morning buffet',
      'weekend brunch', 'saturday brunch', 'sunday breakfast'
    ],

    // Club event terms - expanded for better detection
    club: [
      'nightclub', 'night club', 'club night', 'dance club', 'disco',
      'DJ', 'dance night', 'nightlife', 'night life', 'clubbing',
      'dance floor', 'dancing', 'bottle service', 'vip table',
      'vip section', 'bar crawl', 'pub crawl', 'open bar',
      'lounge', 'venue', 'live music', 'concert', 'performance',
      'electronic', 'hip hop', 'hip-hop', 'edm', 'house music',
      'techno', 'trance', 'dubstep', 'drum and bass', 'dnb',
      'rave', 'raving', 'club music', 'dance music', 'dj set',
      'dj night', 'dj party', 'dj event', 'live dj', 'resident dj',
      'guest dj', 'featured dj', 'headliner', 'main room',
      'vip room', 'vip area', 'vip entrance', 'vip access',
      'bottle package', 'table service', 'table reservation',
      'club event', 'night event', 'evening event', 'late night',
      'after hours', 'after party', 'late party', 'weekend party'
    ],

    // Social gathering terms - expanded for better detection
    social: [
      'networking', 'mixer', 'mingle', 'social gathering', 'business mixer',
      'professional', 'industry', 'entrepreneur', 'startup',
      'business social', 'career', 'professionals', 'business networking',
      'social event', 'social mixer', 'social night', 'social club',
      'meetup', 'meet-up', 'meet and greet', 'networking event',
      'networking opportunity', 'professional mixer', 'industry mixer',
      'industry night', 'industry event', 'business event',
      'business gathering', 'professional gathering', 'professional social',
      'career networking', 'career social', 'career mixer',
      'entrepreneur event', 'entrepreneur social', 'entrepreneur mixer',
      'startup event', 'startup social', 'startup mixer',
      'community gathering', 'community social', 'community mixer'
    ]
  };

  const combinedText = `${title.toLowerCase()} ${description.toLowerCase()}`;

  // Check each category of keywords
  const strongMatch = partyKeywords.strong.find(keyword => combinedText.includes(keyword));
  const dayPartyMatch = partyKeywords.dayParty.find(keyword => combinedText.includes(keyword));
  const brunchMatch = partyKeywords.brunch.find(keyword => combinedText.includes(keyword));
  const clubMatch = partyKeywords.club.find(keyword => combinedText.includes(keyword));
  const socialMatch = partyKeywords.social.find(keyword => combinedText.includes(keyword));

  // Log the detection result for debugging
  console.log(`[PARTY_DETECTION] Event: "${title}", Matches: Strong=${strongMatch || 'none'}, DayParty=${dayPartyMatch || 'none'}, Brunch=${brunchMatch || 'none'}, Club=${clubMatch || 'none'}, Social=${socialMatch || 'none'}`);

  // If any category matches, it's a party event
  // Also check for common venue types that typically host parties
  const venueTypes = ['club', 'lounge', 'bar', 'venue', 'hall', 'ballroom', 'terrace', 'rooftop'];
  const hasPartyVenue = venueTypes.some(venue => combinedText.includes(venue));

  // Check for music genres that are common at parties
  const musicGenres = ['dj', 'electronic', 'hip hop', 'hip-hop', 'edm', 'house', 'techno', 'dance', 'disco'];
  const hasPartyMusic = musicGenres.some(genre => combinedText.includes(genre));

  // Check for time-based indicators that suggest a party
  let isPartyTime = false;
  if (combinedText.includes('night') || combinedText.includes('evening') ||
      combinedText.includes('pm') || combinedText.includes('tonight') ||
      combinedText.includes('weekend')) {
    isPartyTime = true;
  }

  // Check for event types that are often parties
  const eventTypes = ['concert', 'show', 'performance', 'festival', 'fest', 'event'];
  const isEventType = eventTypes.some(type => combinedText.includes(type));

  // Super aggressive detection - return true if any match is found
  // This ensures we catch as many party events as possible
  return !!(strongMatch || dayPartyMatch || brunchMatch || clubMatch || socialMatch ||
           hasPartyVenue || hasPartyMusic || isPartyTime || isEventType);
}

/**
 * Helper function to determine party subcategory
 */
export function detectPartySubcategory(title: string = '', description: string = '', time: string = ''): PartySubcategory {
  const combinedText = `${title.toLowerCase()} ${description.toLowerCase()}`;

  // Use the same keyword categories from detectPartyEvent for consistency
  const subcategoryKeywords = {
    dayParty: [
      'day party', 'day-party', 'pool party', 'afternoon party', 'daytime',
      'day time', 'outdoor party', 'garden party', 'patio party', 'beach party',
      'pool', 'day club', 'dayclub', 'rooftop party', 'terrace party',
      'day rave', 'sunshine social', 'sunset party', 'sunset social',
      'poolside social', 'poolside party', 'beach club', 'beach social',
      'yacht day', 'boat day', 'cruise day', 'harbor party',
      'garden social', 'outdoor lounge', 'lawn party', 'park social'
    ],

    brunch: [
      'brunch', 'breakfast', 'morning', 'mimosa', 'bottomless',
      'champagne brunch', 'sunday brunch', 'brunch party',
      'brunch & bubbles', 'brunch and bubbles'
    ],

    club: [
      'nightclub', 'night club', 'club night', 'dance club', 'disco',
      'rave', 'DJ', 'dance night', 'dance party', 'nightlife',
      'night life', 'clubbing', 'dance floor', 'bottle service',
      'vip table', 'vip section', 'bar crawl', 'pub crawl',
      'lounge', 'venue', 'live music', 'concert', 'performance',
      'electronic', 'hip hop', 'hip-hop', 'edm', 'house music',
      'underground club', 'secret club', 'hidden venue',
      'speakeasy club', 'warehouse club', 'industrial venue',
      'boutique club', 'intimate venue', 'exclusive club',
      'members club', 'private club', 'curated night'
    ],

    immersive: [
      'immersive experience', 'immersive art', 'immersive music',
      'immersive party', 'experiential event', 'interactive party',
      'art party', 'creative social', 'themed social',
      'themed party', 'concept party', 'multi-room venue',
      'art space', 'creative venue', 'immersive club'
    ],

    popup: [
      'pop-up party', 'popup bar', 'popup club', 'popup venue',
      'secret party', 'secret location', 'hidden venue',
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

    // Day party: 9 AM to 6 PM
    if (hour >= 9 && hour < 18) {
      timeBasedCategory = 'day-party';
    }
    // Brunch: 10 AM to 2 PM
    if (hour >= 10 && hour < 14) {
      timeBasedCategory = 'brunch';
    }
    // Club: 9 PM to 4 AM
    if (hour >= 21 || hour < 4) {
      timeBasedCategory = 'club';
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
