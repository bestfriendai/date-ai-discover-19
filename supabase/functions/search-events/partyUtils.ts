/**
 * Party subcategory types and utility functions
 */

// Party subcategory types
export type PartySubcategory = 'day-party' | 'social' | 'brunch' | 'club' | 'networking' | 'celebration' | 'general';

/**
 * Helper function to detect party-related keywords in title or description
 */
export function detectPartyEvent(title: string = '', description: string = ''): boolean {
  // Define specific party-related keywords for different types of party events
  const partyKeywords = {
    // General party terms that strongly indicate a party event
    strong: [
      'party', 'celebration', 'social', 'mixer', 'gathering', 'gala',
      'reception', 'meet-up', 'meetup', 'happy hour', 'happy-hour',
      'mingle', 'networking', 'social event', 'cocktail', 'dance party', 'rave',
      'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
      'afterparty', 'after-party', 'singles', 'speed dating', 'social gathering',
      'festival', 'fest', 'concert', 'live music', 'live dj', 'entertainment',
      'vip', 'exclusive', 'launch', 'premiere', 'opening', 'event'
    ],

    // Day party specific terms
    dayParty: [
      'day party', 'day-party', 'pool party', 'daytime', 'day time',
      'outdoor party', 'garden party', 'patio party', 'beach party',
      'pool', 'day club', 'dayclub', 'afternoon party', 'rooftop party'
    ],

    // Brunch event terms
    brunch: [
      'brunch', 'breakfast', 'morning', 'mimosa', 'bottomless',
      'champagne brunch', 'sunday brunch', 'brunch party',
      'brunch & bubbles', 'brunch and bubbles'
    ],

    // Club event terms
    club: [
      'nightclub', 'night club', 'club night', 'dance club', 'disco',
      'DJ', 'dance night', 'nightlife', 'night life', 'clubbing',
      'dance floor', 'dancing', 'bottle service', 'vip table',
      'vip section', 'bar crawl', 'pub crawl', 'open bar',
      'lounge', 'venue', 'live music', 'concert', 'performance',
      'electronic', 'hip hop', 'hip-hop', 'edm', 'house music'
    ],

    // Social gathering terms
    social: [
      'networking', 'mixer', 'mingle', 'social gathering', 'business mixer',
      'professional', 'industry', 'entrepreneur', 'startup',
      'business social', 'career', 'professionals', 'business networking'
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
  return !!(strongMatch || dayPartyMatch || brunchMatch || clubMatch || socialMatch);
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
      'pool', 'day club', 'dayclub', 'rooftop party', 'terrace party'
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
      'electronic', 'hip hop', 'hip-hop', 'edm', 'house music'
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
  // Priority: Brunch > Day Party > Club > Networking > Celebration > General

  if (matchesBrunch) {
    return 'brunch';
  }

  if (matchesDayParty || (timeBasedCategory === 'day-party' && !matchesClub && !matchesNetworking)) {
    return 'day-party';
  }

  if (matchesClub || timeBasedCategory === 'club') {
    return 'club';
  }

  if (matchesNetworking) {
    return 'networking';
  }

  if (matchesCelebration) {
    return 'celebration';
  }

  // Default to general if no specific subcategory is detected
  return 'general';
}
