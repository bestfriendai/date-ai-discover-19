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
    'party', 'celebration', 'social', 'mixer', 'gathering', 'gala', 
    'reception', 'festival', 'meet-up', 'meetup', 'happy hour', 'happy-hour',
    'mingle', 'networking', 'social event', 'cocktail', 'dance party', 'rave',
    'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
    'DJ', 'dance night', 'club night', 'night out', 'mixer', 'brunch',
    'day party', 'day-party', 'pool party', 'rooftop', 'lounge', 'nightclub',
    'singles', 'speed dating', 'social gathering', 'afterparty', 'after-party'
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
    (combinedText.includes('rooftop') && !combinedText.includes('night')) ||
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
    (combinedText.includes('lunch') && combinedText.includes('party'))
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
    combinedText.includes('happy-hour')
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
    combinedText.includes('reception')
  ) {
    return 'celebration';
  }
  
  // Default to general party
  return 'general';
}
