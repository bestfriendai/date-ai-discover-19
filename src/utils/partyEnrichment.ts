/**
 * Party Event Enrichment Utility
 * 
 * This utility provides functions for enriching party event data with additional details
 * such as music genre, crowd type, dress code, and more.
 */

import { Event } from '@/types';

// Music genre types
export type MusicGenre = 
  'electronic' | 'hip-hop' | 'pop' | 'rock' | 'latin' | 'r&b' | 
  'jazz' | 'reggae' | 'house' | 'techno' | 'disco' | 'other';

// Crowd type
export type CrowdType = 'young' | 'mixed' | 'upscale' | 'casual' | 'lgbtq' | 'other';

// Dress code
export type DressCode = 'casual' | 'smart casual' | 'dressy' | 'formal' | 'costume' | 'other';

// Price range
export type PriceRange = 'free' | 'low' | 'medium' | 'high' | 'vip' | 'unknown';

// Time of day
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'all-day';

// Enriched party event interface
export interface EnrichedPartyEvent extends Event {
  musicGenres?: MusicGenre[];
  crowdType?: CrowdType;
  dressCode?: DressCode;
  priceRange?: PriceRange;
  timeOfDay?: TimeOfDay;
  isWeekend?: boolean;
  hasVIP?: boolean;
  hasDrinkSpecials?: boolean;
  hasFoodOptions?: boolean;
  hasLiveMusic?: boolean;
  hasDJ?: boolean;
  minimumAge?: number;
  popularity?: number; // 1-100 scale
  socialMediaLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
}

/**
 * Detect music genres from event title and description
 * @param event - Event to analyze
 * @returns Array of detected music genres
 */
function detectMusicGenres(event: Event): MusicGenre[] {
  const genres: MusicGenre[] = [];
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  // Electronic music genres
  if (
    text.includes('electronic') || text.includes('edm') || text.includes('dj') ||
    text.includes('techno') || text.includes('house') || text.includes('trance') ||
    text.includes('dubstep') || text.includes('drum and bass') || text.includes('d&b')
  ) {
    genres.push('electronic');
    
    // Sub-genres
    if (text.includes('house')) genres.push('house');
    if (text.includes('techno')) genres.push('techno');
  }
  
  // Hip-hop
  if (
    text.includes('hip hop') || text.includes('hip-hop') || text.includes('rap') ||
    text.includes('trap') || text.includes('r&b') || text.includes('rhythm and blues')
  ) {
    genres.push('hip-hop');
    if (text.includes('r&b') || text.includes('rhythm and blues')) {
      genres.push('r&b');
    }
  }
  
  // Latin
  if (
    text.includes('latin') || text.includes('salsa') || text.includes('bachata') ||
    text.includes('reggaeton') || text.includes('merengue') || text.includes('cumbia')
  ) {
    genres.push('latin');
  }
  
  // Rock
  if (
    text.includes('rock') || text.includes('alternative') || text.includes('indie') ||
    text.includes('punk') || text.includes('metal')
  ) {
    genres.push('rock');
  }
  
  // Pop
  if (
    text.includes('pop') || text.includes('top 40') || text.includes('chart') ||
    text.includes('hits')
  ) {
    genres.push('pop');
  }
  
  // Jazz
  if (
    text.includes('jazz') || text.includes('blues') || text.includes('soul') ||
    text.includes('funk')
  ) {
    genres.push('jazz');
  }
  
  // Reggae
  if (
    text.includes('reggae') || text.includes('dancehall') || text.includes('caribbean') ||
    text.includes('island')
  ) {
    genres.push('reggae');
  }
  
  // Disco
  if (
    text.includes('disco') || text.includes('70s') || text.includes('80s') ||
    text.includes('retro')
  ) {
    genres.push('disco');
  }
  
  // If no genres detected, add 'other'
  if (genres.length === 0) {
    genres.push('other');
  }
  
  return [...new Set(genres)]; // Remove duplicates
}

/**
 * Detect crowd type from event title and description
 * @param event - Event to analyze
 * @returns Detected crowd type
 */
function detectCrowdType(event: Event): CrowdType {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  if (
    text.includes('college') || text.includes('student') || text.includes('young') ||
    text.includes('youth') || text.includes('teen')
  ) {
    return 'young';
  }
  
  if (
    text.includes('upscale') || text.includes('luxury') || text.includes('vip') ||
    text.includes('exclusive') || text.includes('premium')
  ) {
    return 'upscale';
  }
  
  if (
    text.includes('casual') || text.includes('relaxed') || text.includes('chill') ||
    text.includes('laid back') || text.includes('laid-back')
  ) {
    return 'casual';
  }
  
  if (
    text.includes('lgbtq') || text.includes('lgbt') || text.includes('gay') ||
    text.includes('lesbian') || text.includes('queer') || text.includes('pride')
  ) {
    return 'lgbtq';
  }
  
  return 'mixed';
}

/**
 * Detect dress code from event title and description
 * @param event - Event to analyze
 * @returns Detected dress code
 */
function detectDressCode(event: Event): DressCode {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  if (
    text.includes('formal') || text.includes('black tie') || text.includes('gala') ||
    text.includes('elegant')
  ) {
    return 'formal';
  }
  
  if (
    text.includes('dressy') || text.includes('dress to impress') || 
    text.includes('cocktail attire') || text.includes('semi-formal')
  ) {
    return 'dressy';
  }
  
  if (
    text.includes('smart casual') || text.includes('business casual') ||
    text.includes('neat')
  ) {
    return 'smart casual';
  }
  
  if (
    text.includes('costume') || text.includes('fancy dress') || 
    text.includes('themed') || text.includes('halloween')
  ) {
    return 'costume';
  }
  
  return 'casual';
}

/**
 * Detect price range from event title and description
 * @param event - Event to analyze
 * @returns Detected price range
 */
function detectPriceRange(event: Event): PriceRange {
  // If we have actual price information
  if (event.price) {
    const priceStr = typeof event.price === 'string' ? event.price : event.price.toString();
    const priceMatch = priceStr.match(/\$(\d+)/);
    
    if (priceMatch) {
      const price = parseInt(priceMatch[1]);
      
      if (price === 0) return 'free';
      if (price < 20) return 'low';
      if (price < 50) return 'medium';
      if (price < 100) return 'high';
      return 'vip';
    }
    
    // Check for free events
    if (
      priceStr.toLowerCase().includes('free') || 
      priceStr.toLowerCase().includes('no cover')
    ) {
      return 'free';
    }
  }
  
  // Try to detect from description
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  if (
    text.includes('free') || text.includes('no cover') || 
    text.includes('no charge') || text.includes('complimentary')
  ) {
    return 'free';
  }
  
  if (
    text.includes('vip') || text.includes('bottle service') || 
    text.includes('premium') || text.includes('exclusive')
  ) {
    return 'vip';
  }
  
  return 'unknown';
}

/**
 * Detect time of day from event time
 * @param event - Event to analyze
 * @returns Detected time of day
 */
function detectTimeOfDay(event: Event): TimeOfDay {
  if (!event.time) return 'evening';
  
  const timeStr = event.time.toLowerCase();
  const hourMatch = timeStr.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
  
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    const ampm = hourMatch[3]?.toLowerCase();
    
    // Convert to 24-hour format
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }
  
  // Default to evening if we can't parse the time
  return 'evening';
}

/**
 * Check if event is on a weekend
 * @param event - Event to analyze
 * @returns Whether the event is on a weekend
 */
function isWeekendEvent(event: Event): boolean {
  if (!event.date) return false;
  
  try {
    // Try to parse the date
    const dateStr = event.date.toLowerCase();
    
    // Check for day names in the date string
    if (
      dateStr.includes('saturday') || 
      dateStr.includes('sunday')
    ) {
      return true;
    }
    
    // Try to parse as a date object
    let dateObj: Date;
    
    if (event.rawDate) {
      dateObj = new Date(event.rawDate);
    } else {
      // Extract date parts from formatted string like "Monday, June 10, 2023"
      const parts = dateStr.split(',');
      if (parts.length >= 2) {
        dateObj = new Date(parts.slice(1).join(',').trim());
      } else {
        dateObj = new Date(dateStr);
      }
    }
    
    // Check if valid date
    if (isNaN(dateObj.getTime())) return false;
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const day = dateObj.getDay();
    
    // Return true if weekend (Saturday or Sunday)
    return day === 0 || day === 6;
  } catch (error) {
    console.error('Error parsing date:', error);
    return false;
  }
}

/**
 * Detect if event has VIP options
 * @param event - Event to analyze
 * @returns Whether the event has VIP options
 */
function hasVIPOptions(event: Event): boolean {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  return (
    text.includes('vip') || text.includes('bottle service') || 
    text.includes('table service') || text.includes('reserved table') ||
    text.includes('exclusive') || text.includes('premium')
  );
}

/**
 * Detect if event has drink specials
 * @param event - Event to analyze
 * @returns Whether the event has drink specials
 */
function hasDrinkSpecials(event: Event): boolean {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  return (
    text.includes('drink special') || text.includes('happy hour') || 
    text.includes('open bar') || text.includes('free drink') ||
    text.includes('2 for 1') || text.includes('two for one') ||
    text.includes('discounted drink') || text.includes('$5 drink') ||
    text.includes('cocktail special')
  );
}

/**
 * Detect if event has food options
 * @param event - Event to analyze
 * @returns Whether the event has food options
 */
function hasFoodOptions(event: Event): boolean {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  return (
    text.includes('food') || text.includes('menu') || 
    text.includes('dinner') || text.includes('lunch') ||
    text.includes('brunch') || text.includes('appetizer') ||
    text.includes('cuisine') || text.includes('restaurant') ||
    text.includes('buffet') || text.includes('catering')
  );
}

/**
 * Detect if event has live music
 * @param event - Event to analyze
 * @returns Whether the event has live music
 */
function hasLiveMusic(event: Event): boolean {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  return (
    text.includes('live music') || text.includes('live band') || 
    text.includes('live performance') || text.includes('performer') ||
    text.includes('concert') || text.includes('performing live')
  );
}

/**
 * Detect if event has a DJ
 * @param event - Event to analyze
 * @returns Whether the event has a DJ
 */
function hasDJ(event: Event): boolean {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  return (
    text.includes('dj') || text.includes('disc jockey') || 
    text.includes('spinning') || text.includes('turntable') ||
    text.includes('mix') || text.includes('set')
  );
}

/**
 * Detect minimum age for event
 * @param event - Event to analyze
 * @returns Minimum age or undefined if not detected
 */
function detectMinimumAge(event: Event): number | undefined {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  // Look for age restrictions
  const ageMatch = text.match(/(\d+)\+|(\d+) and over|(\d+) \& over|(\d+) years?|age (\d+)/i);
  
  if (ageMatch) {
    // Find the first non-undefined group
    const age = ageMatch.slice(1).find(g => g !== undefined);
    if (age) {
      return parseInt(age);
    }
  }
  
  // Check for common age restrictions
  if (text.includes('21+') || text.includes('21 and over') || text.includes('21 & over')) {
    return 21;
  }
  
  if (text.includes('18+') || text.includes('18 and over') || text.includes('18 & over')) {
    return 18;
  }
  
  if (text.includes('all ages')) {
    return 0;
  }
  
  // Default to 21 for nightclub events
  if (event.partySubcategory === 'nightclub') {
    return 21;
  }
  
  return undefined;
}

/**
 * Calculate popularity score for event
 * @param event - Event to analyze
 * @returns Popularity score (1-100)
 */
function calculatePopularity(event: Event): number {
  let score = 50; // Start with a neutral score
  
  // Adjust based on venue
  if (event.venue) {
    const venueLower = event.venue.toLowerCase();
    if (
      venueLower.includes('arena') || 
      venueLower.includes('stadium') || 
      venueLower.includes('center') ||
      venueLower.includes('theatre') ||
      venueLower.includes('theater')
    ) {
      score += 20; // Large venues indicate popular events
    }
  }
  
  // Adjust based on description length
  if (event.description) {
    if (event.description.length > 500) score += 10; // Detailed descriptions suggest better events
    else if (event.description.length < 100) score -= 10; // Minimal descriptions suggest less organized events
  }
  
  // Adjust based on image availability
  if (!event.image || event.image.includes('placeholder')) {
    score -= 15; // No image suggests less professional event
  }
  
  // Adjust based on detected features
  if (hasVIPOptions(event)) score += 10;
  if (hasDrinkSpecials(event)) score += 5;
  if (hasFoodOptions(event)) score += 5;
  if (hasLiveMusic(event)) score += 10;
  if (hasDJ(event)) score += 5;
  
  // Adjust based on party subcategory
  if (event.partySubcategory === 'festival') score += 15;
  if (event.partySubcategory === 'nightclub') score += 10;
  
  // Adjust based on time of day
  const timeOfDay = detectTimeOfDay(event);
  if (timeOfDay === 'night') score += 5; // Night events tend to be more popular
  
  // Adjust based on day of week
  if (isWeekendEvent(event)) score += 10; // Weekend events tend to be more popular
  
  // Ensure score is within 1-100 range
  return Math.max(1, Math.min(100, score));
}

/**
 * Extract social media links from event description
 * @param event - Event to analyze
 * @returns Object with social media links
 */
function extractSocialMediaLinks(event: Event): { 
  instagram?: string; 
  facebook?: string; 
  twitter?: string; 
  website?: string; 
} {
  const links: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  } = {};
  
  if (!event.description) return links;
  
  // Extract Instagram links
  const instagramMatch = event.description.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/i);
  if (instagramMatch) {
    links.instagram = `https://instagram.com/${instagramMatch[1]}`;
  }
  
  // Extract Facebook links
  const facebookMatch = event.description.match(/facebook\.com\/([a-zA-Z0-9_\-\.]+)/i);
  if (facebookMatch) {
    links.facebook = `https://facebook.com/${facebookMatch[1]}`;
  }
  
  // Extract Twitter links
  const twitterMatch = event.description.match(/twitter\.com\/([a-zA-Z0-9_]+)/i);
  if (twitterMatch) {
    links.twitter = `https://twitter.com/${twitterMatch[1]}`;
  }
  
  // Extract website links
  const websiteMatch = event.description.match(/(https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i);
  if (websiteMatch) {
    links.website = websiteMatch[1];
  }
  
  return links;
}

/**
 * Enrich a party event with additional details
 * @param event - Event to enrich
 * @returns Enriched party event
 */
export function enrichPartyEvent(event: Event): EnrichedPartyEvent {
  // Skip if not a party event
  if (event.category !== 'party' && !event.isPartyEvent) {
    return event as EnrichedPartyEvent;
  }
  
  const timeOfDay = detectTimeOfDay(event);
  const isWeekend = isWeekendEvent(event);
  
  return {
    ...event,
    musicGenres: detectMusicGenres(event),
    crowdType: detectCrowdType(event),
    dressCode: detectDressCode(event),
    priceRange: detectPriceRange(event),
    timeOfDay,
    isWeekend,
    hasVIP: hasVIPOptions(event),
    hasDrinkSpecials: hasDrinkSpecials(event),
    hasFoodOptions: hasFoodOptions(event),
    hasLiveMusic: hasLiveMusic(event),
    hasDJ: hasDJ(event),
    minimumAge: detectMinimumAge(event),
    popularity: calculatePopularity(event),
    socialMediaLinks: extractSocialMediaLinks(event)
  };
}

/**
 * Enrich multiple party events with additional details
 * @param events - Events to enrich
 * @returns Enriched party events
 */
export function enrichPartyEvents(events: Event[]): EnrichedPartyEvent[] {
  return events.map(enrichPartyEvent);
}

/**
 * Filter events by time of day
 * @param events - Events to filter
 * @param timeOfDay - Time of day to filter by
 * @returns Filtered events
 */
export function filterEventsByTimeOfDay(
  events: EnrichedPartyEvent[], 
  timeOfDay: 'all' | 'day' | 'night'
): EnrichedPartyEvent[] {
  if (timeOfDay === 'all') return events;
  
  return events.filter(event => {
    const eventTimeOfDay = event.timeOfDay || detectTimeOfDay(event);
    
    if (timeOfDay === 'day') {
      return eventTimeOfDay === 'morning' || eventTimeOfDay === 'afternoon';
    } else if (timeOfDay === 'night') {
      return eventTimeOfDay === 'evening' || eventTimeOfDay === 'night';
    }
    
    return true;
  });
}

/**
 * Filter events by day of week
 * @param events - Events to filter
 * @param dayOfWeek - Day of week to filter by
 * @returns Filtered events
 */
export function filterEventsByDayOfWeek(
  events: EnrichedPartyEvent[], 
  dayOfWeek: 'all' | 'weekday' | 'weekend'
): EnrichedPartyEvent[] {
  if (dayOfWeek === 'all') return events;
  
  return events.filter(event => {
    const isWeekend = event.isWeekend !== undefined 
      ? event.isWeekend 
      : isWeekendEvent(event);
    
    if (dayOfWeek === 'weekend') {
      return isWeekend;
    } else if (dayOfWeek === 'weekday') {
      return !isWeekend;
    }
    
    return true;
  });
}

/**
 * Get recommended events based on user preferences
 * @param events - Events to filter
 * @param preferences - User preferences
 * @returns Recommended events sorted by relevance
 */
export function getRecommendedEvents(
  events: EnrichedPartyEvent[],
  preferences: {
    musicGenres?: MusicGenre[];
    partyTypes?: string[];
    timeOfDay?: 'day' | 'night' | 'all';
    dayOfWeek?: 'weekday' | 'weekend' | 'all';
    priceRange?: PriceRange[];
    minimumAge?: number;
  }
): EnrichedPartyEvent[] {
  // Filter events based on preferences
  let filteredEvents = [...events];
  
  // Filter by time of day
  if (preferences.timeOfDay && preferences.timeOfDay !== 'all') {
    filteredEvents = filterEventsByTimeOfDay(filteredEvents, preferences.timeOfDay);
  }
  
  // Filter by day of week
  if (preferences.dayOfWeek && preferences.dayOfWeek !== 'all') {
    filteredEvents = filterEventsByDayOfWeek(filteredEvents, preferences.dayOfWeek);
  }
  
  // Filter by party types
  if (preferences.partyTypes && preferences.partyTypes.length > 0) {
    filteredEvents = filteredEvents.filter(event => 
      event.partySubcategory && preferences.partyTypes?.includes(event.partySubcategory)
    );
  }
  
  // Filter by minimum age
  if (preferences.minimumAge !== undefined) {
    filteredEvents = filteredEvents.filter(event => {
      const eventAge = event.minimumAge !== undefined 
        ? event.minimumAge 
        : detectMinimumAge(event);
      
      return eventAge === undefined || eventAge <= preferences.minimumAge!;
    });
  }
  
  // Score events based on preferences
  const scoredEvents = filteredEvents.map(event => {
    let score = event.popularity || calculatePopularity(event);
    
    // Boost score for matching music genres
    if (preferences.musicGenres && preferences.musicGenres.length > 0 && event.musicGenres) {
      const matchingGenres = event.musicGenres.filter(genre => 
        preferences.musicGenres?.includes(genre)
      );
      
      score += matchingGenres.length * 10;
    }
    
    // Boost score for matching price ranges
    if (preferences.priceRange && preferences.priceRange.length > 0 && event.priceRange) {
      if (preferences.priceRange.includes(event.priceRange)) {
        score += 10;
      }
    }
    
    return { event, score };
  });
  
  // Sort by score (descending)
  scoredEvents.sort((a, b) => b.score - a.score);
  
  // Return sorted events
  return scoredEvents.map(item => item.event);
}
