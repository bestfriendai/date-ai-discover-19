import { PartySubcategory } from "@/types";

/**
 * Helper function to detect party-related keywords in title or description
 */
export function detectPartyEvent(title: string = '', description: string = ''): boolean {
  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  // Quick check for exact matches of high-confidence party terms
  const highConfidenceTerms = [
    'party', 'nightclub', 'club night', 'dance party', 'rave', 'dj set', 'nightlife',
    'festival', 'celebration', 'social', 'mixer', 'day party', 'pool party'
  ];

  for (const term of highConfidenceTerms) {
    if (combinedText.includes(term)) {
      return true;
    }
  }

  // More comprehensive list of party-related keywords
  const partyKeywords = [
    'party', 'celebration', 'social', 'mixer', 'gathering', 'gala',
    'reception', 'festival', 'meet-up', 'meetup', 'happy hour', 'happy-hour',
    'mingle', 'networking', 'social event', 'cocktail', 'dance party', 'rave',
    'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
    'DJ', 'dance night', 'club night', 'night out', 'mixer', 'brunch',
    'day party', 'day-party', 'pool party', 'rooftop', 'lounge', 'nightclub',
    'singles', 'speed dating', 'social gathering', 'afterparty', 'after-party'
  ];

  // Count how many keywords are found
  let keywordCount = 0;
  for (const keyword of partyKeywords) {
    if (combinedText.includes(keyword)) {
      keywordCount++;
    }
  }

  // If we found multiple keywords, it's likely a party
  return keywordCount >= 2;
}

/**
 * Helper function to determine party subcategory
 */
export function detectPartySubcategory(title: string = '', description: string = '', time: string = ''): PartySubcategory {
  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  // Check for day party indicators
  if (
    combinedText.includes('day party') ||
    combinedText.includes('day-party') ||
    combinedText.includes('pool party') ||
    combinedText.includes('afternoon party') ||
    combinedText.includes('daytime') ||
    (combinedText.includes('rooftop') && !combinedText.includes('night')) ||
    // Check if time is during day hours (before 6 PM)
    (time && time.length >= 5 && parseInt(time.substring(0, 2)) < 18 && parseInt(time.substring(0, 2)) > 8)
  ) {
    return 'day-party';
  }

  // Check for brunch
  if (
    combinedText.includes('brunch') ||
    (combinedText.includes('breakfast') && combinedText.includes('party'))
  ) {
    return 'brunch';
  }

  // Check for nightclub
  if (
    combinedText.includes('nightclub') ||
    combinedText.includes('night club') ||
    combinedText.includes('club night') ||
    combinedText.includes('dance club') ||
    combinedText.includes('disco') ||
    (combinedText.includes('dj') && (combinedText.includes('club') || combinedText.includes('venue')))
  ) {
    return 'club';
  }

  // Check for networking
  if (
    combinedText.includes('networking') ||
    combinedText.includes('business mixer') ||
    combinedText.includes('professional') ||
    combinedText.includes('industry') ||
    combinedText.includes('meetup')
  ) {
    return 'networking';
  }

  // Check for celebration
  if (
    combinedText.includes('celebration') ||
    combinedText.includes('birthday') ||
    combinedText.includes('anniversary') ||
    combinedText.includes('graduation') ||
    combinedText.includes('wedding')
  ) {
    return 'celebration';
  }

  // Check for social
  if (
    combinedText.includes('social') ||
    combinedText.includes('mixer') ||
    combinedText.includes('mingle') ||
    combinedText.includes('meet and greet') ||
    combinedText.includes('singles')
  ) {
    return 'social';
  }

  // Check for festival
  if (
    combinedText.includes('festival') ||
    combinedText.includes('fest') ||
    combinedText.includes('fair') ||
    combinedText.includes('carnival')
  ) {
    return 'festival';
  }

  // Check for rooftop
  if (
    combinedText.includes('rooftop') ||
    combinedText.includes('roof top') ||
    combinedText.includes('roof party')
  ) {
    return 'rooftop';
  }

  // Check for immersive
  if (
    combinedText.includes('immersive') ||
    combinedText.includes('experience') ||
    combinedText.includes('interactive')
  ) {
    return 'immersive';
  }

  // Check for popup
  if (
    combinedText.includes('popup') ||
    combinedText.includes('pop-up') ||
    combinedText.includes('pop up') ||
    combinedText.includes('temporary')
  ) {
    return 'popup';
  }

  // Default to general
  return 'general';
}

/**
 * Helper function to safely parse coordinates
 */
export function safeParseCoordinates(
  longitude: string | number | undefined | null,
  latitude: string | number | undefined | null
): [number, number] | undefined {
  try {
    if (longitude === undefined || longitude === null || latitude === undefined || latitude === null) {
      return undefined;
    }

    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;

    if (isNaN(lng) || isNaN(lat)) {
      return undefined;
    }

    // Validate coordinates are in valid range
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return undefined;
    }

    return [lng, lat];
  } catch (error) {
    console.error('Error parsing coordinates:', error);
    return undefined;
  }
}
