/**
 * Party subcategory types and utility functions
 */

// Party subcategory types
export type PartySubcategory = 'day-party' | 'social' | 'brunch' | 'club' | 'networking' | 'celebration' | 'general';

/**
 * Helper function to detect party-related keywords in title or description
 */
export function detectPartyEvent(title: string = '', description: string = ''): boolean {
  const partyKeywords = [
    // General party terms
    'party', 'celebration', 'social', 'mixer', 'gathering', 'gala',
    'reception', 'festival', 'meet-up', 'meetup', 'happy hour', 'happy-hour',
    'mingle', 'networking', 'social event', 'cocktail', 'dance party', 'rave',
    'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
    'DJ', 'dance night', 'club night', 'night out', 'mixer', 'brunch',
    'day party', 'day-party', 'pool party', 'rooftop', 'lounge', 'nightclub',
    'singles', 'speed dating', 'social gathering', 'afterparty', 'after-party',

    // Nightlife terms
    'nightlife', 'night life', 'club', 'clubbing', 'dance floor', 'dancing',
    'disco', 'bar crawl', 'pub crawl', 'vip', 'bottle service', 'open bar',

    // Event types that are often parties
    'gala', 'ball', 'masquerade', 'costume party', 'themed party',
    'launch party', 'release party', 'opening party', 'closing party',
    'holiday party', 'new years', 'halloween party', 'christmas party',

    // Venue types that typically host parties
    'lounge', 'bar', 'club', 'rooftop bar', 'speakeasy', 'venue',
    'ballroom', 'dance hall', 'event space'
  ];

  const combinedText = `${title.toLowerCase()} ${description.toLowerCase()}`;
  return partyKeywords.some(keyword => combinedText.includes(keyword));
}

/**
 * Helper function to determine party subcategory
 */
export function detectPartySubcategory(title: string = '', description: string = '', time: string = ''): PartySubcategory {
  const combinedText = `${title.toLowerCase()} ${description.toLowerCase()}`;

  // Check for day party indicators
  if (
    combinedText.includes('day party') ||
    combinedText.includes('day-party') ||
    combinedText.includes('pool party') ||
    combinedText.includes('afternoon party') ||
    combinedText.includes('daytime') ||
    combinedText.includes('day time') ||
    combinedText.includes('outdoor party') ||
    combinedText.includes('garden party') ||
    combinedText.includes('patio party') ||
    combinedText.includes('beach party') ||
    combinedText.includes('pool') ||
    combinedText.includes('day club') ||
    combinedText.includes('dayclub') ||
    (combinedText.includes('rooftop') && !combinedText.includes('night')) ||
    (combinedText.includes('terrace') && !combinedText.includes('night')) ||
    // Check if time is during day hours (before 6 PM)
    (time && time.length >= 5 && parseInt(time.substring(0, 2)) < 18 && parseInt(time.substring(0, 2)) > 8)
  ) {
    return 'day-party';
  }

  // Check for brunch events
  if (
    combinedText.includes('brunch') ||
    combinedText.includes('breakfast') ||
    combinedText.includes('morning') ||
    combinedText.includes('mimosa') ||
    combinedText.includes('bottomless') ||
    combinedText.includes('champagne brunch') ||
    combinedText.includes('sunday brunch') ||
    combinedText.includes('brunch party') ||
    combinedText.includes('brunch & bubbles') ||
    combinedText.includes('brunch and bubbles') ||
    (combinedText.includes('lunch') && combinedText.includes('party')) ||
    // Check if time is during brunch hours (10 AM to 2 PM)
    (time && time.length >= 5 && parseInt(time.substring(0, 2)) >= 10 && parseInt(time.substring(0, 2)) < 14)
  ) {
    return 'brunch';
  }

  // Check for club events
  if (
    combinedText.includes('club') ||
    combinedText.includes('nightclub') ||
    combinedText.includes('night club') ||
    combinedText.includes('dance club') ||
    combinedText.includes('disco') ||
    combinedText.includes('rave') ||
    combinedText.includes('DJ') ||
    combinedText.includes('dance night') ||
    combinedText.includes('dance party') ||
    combinedText.includes('nightlife') ||
    combinedText.includes('night life') ||
    combinedText.includes('clubbing') ||
    combinedText.includes('dance floor') ||
    combinedText.includes('bottle service') ||
    combinedText.includes('vip table') ||
    combinedText.includes('vip section') ||
    // Check if time is during night hours (after 9 PM)
    (time && time.length >= 5 && (parseInt(time.substring(0, 2)) >= 21 || parseInt(time.substring(0, 2)) < 4))
  ) {
    return 'club';
  }

  // Check for networking/social events
  if (
    combinedText.includes('networking') ||
    combinedText.includes('mixer') ||
    combinedText.includes('mingle') ||
    combinedText.includes('meet-up') ||
    combinedText.includes('meetup') ||
    combinedText.includes('social gathering') ||
    combinedText.includes('social event') ||
    combinedText.includes('singles') ||
    combinedText.includes('speed dating') ||
    combinedText.includes('happy hour') ||
    combinedText.includes('happy-hour') ||
    combinedText.includes('business mixer') ||
    combinedText.includes('professional') ||
    combinedText.includes('industry') ||
    combinedText.includes('entrepreneur') ||
    combinedText.includes('startup') ||
    combinedText.includes('business social') ||
    combinedText.includes('career') ||
    combinedText.includes('professionals') ||
    combinedText.includes('business networking')
  ) {
    return 'networking';
  }

  // Check for celebration events
  if (
    combinedText.includes('birthday') ||
    combinedText.includes('anniversary') ||
    combinedText.includes('graduation') ||
    combinedText.includes('bachelor') ||
    combinedText.includes('bachelorette') ||
    combinedText.includes('celebration') ||
    combinedText.includes('gala') ||
    combinedText.includes('reception') ||
    combinedText.includes('new years') ||
    combinedText.includes('new year\'s') ||
    combinedText.includes('halloween') ||
    combinedText.includes('christmas') ||
    combinedText.includes('holiday party') ||
    combinedText.includes('launch party') ||
    combinedText.includes('release party') ||
    combinedText.includes('grand opening') ||
    combinedText.includes('farewell') ||
    combinedText.includes('retirement') ||
    combinedText.includes('engagement') ||
    combinedText.includes('wedding')
  ) {
    return 'celebration';
  }

  // Default to general party
  return 'general';
}
