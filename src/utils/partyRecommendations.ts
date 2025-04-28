/**
 * Party Recommendation Engine
 * 
 * This utility provides functions for recommending party events to users
 * based on their preferences, location, and past behavior.
 */

import { Event } from '@/types';
import { EnrichedPartyEvent, MusicGenre, CrowdType, PriceRange, enrichPartyEvents } from './partyEnrichment';
import { calculateDistance } from './geofencing';

// User preferences interface
export interface UserPreferences {
  musicGenres?: MusicGenre[];
  partyTypes?: string[];
  priceRanges?: PriceRange[];
  crowdTypes?: CrowdType[];
  minimumAge?: number;
  maxDistance?: number;
  preferredDays?: ('weekday' | 'weekend')[];
  preferredTimes?: ('day' | 'night')[];
  features?: {
    liveMusic?: boolean;
    dj?: boolean;
    foodOptions?: boolean;
    drinkSpecials?: boolean;
    vipOptions?: boolean;
  };
}

// User location interface
export interface UserLocation {
  latitude: number;
  longitude: number;
}

// User interaction with an event
export interface EventInteraction {
  eventId: string;
  viewed: boolean;
  clicked: boolean;
  saved: boolean;
  shared: boolean;
  attended: boolean;
  timestamp: number;
}

// Recommendation result interface
export interface RecommendationResult {
  event: EnrichedPartyEvent;
  score: number;
  matchReasons: string[];
  distance?: number;
}

/**
 * Calculate a base score for an event based on its properties
 * @param event - Event to score
 * @returns Base score (0-100)
 */
function calculateBaseScore(event: EnrichedPartyEvent): number {
  // Start with the event's popularity score if available
  let score = event.popularity || 50;
  
  // Adjust score based on various factors
  
  // Boost score for events with good descriptions
  if (event.description && event.description.length > 300) {
    score += 5;
  }
  
  // Boost score for events with images
  if (event.image && !event.image.includes('placeholder')) {
    score += 5;
  }
  
  // Boost score for events with coordinates
  if (event.coordinates || (event.latitude && event.longitude)) {
    score += 5;
  }
  
  // Boost score for events with links
  if (event.url) {
    score += 5;
  }
  
  // Boost score for events with special features
  if (event.hasVIP) score += 2;
  if (event.hasDrinkSpecials) score += 2;
  if (event.hasFoodOptions) score += 2;
  if (event.hasLiveMusic) score += 3;
  if (event.hasDJ) score += 2;
  
  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate a preference match score for an event based on user preferences
 * @param event - Event to score
 * @param preferences - User preferences
 * @returns Preference match score (0-100) and match reasons
 */
function calculatePreferenceMatchScore(
  event: EnrichedPartyEvent,
  preferences: UserPreferences
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  let matchCount = 0;
  let possibleMatches = 0;
  
  // Match music genres
  if (preferences.musicGenres && preferences.musicGenres.length > 0 && event.musicGenres) {
    possibleMatches++;
    const matchingGenres = event.musicGenres.filter(genre => 
      preferences.musicGenres?.includes(genre)
    );
    
    if (matchingGenres.length > 0) {
      matchCount++;
      score += 20 * (matchingGenres.length / preferences.musicGenres.length);
      reasons.push(`Matches your music preferences: ${matchingGenres.join(', ')}`);
    }
  }
  
  // Match party types
  if (preferences.partyTypes && preferences.partyTypes.length > 0 && event.partySubcategory) {
    possibleMatches++;
    if (preferences.partyTypes.includes(event.partySubcategory)) {
      matchCount++;
      score += 20;
      reasons.push(`Matches your preferred party type: ${event.partySubcategory}`);
    }
  }
  
  // Match price ranges
  if (preferences.priceRanges && preferences.priceRanges.length > 0 && event.priceRange) {
    possibleMatches++;
    if (preferences.priceRanges.includes(event.priceRange)) {
      matchCount++;
      score += 15;
      reasons.push(`Matches your price preference: ${event.priceRange}`);
    }
  }
  
  // Match crowd types
  if (preferences.crowdTypes && preferences.crowdTypes.length > 0 && event.crowdType) {
    possibleMatches++;
    if (preferences.crowdTypes.includes(event.crowdType)) {
      matchCount++;
      score += 15;
      reasons.push(`Matches your preferred crowd: ${event.crowdType}`);
    }
  }
  
  // Match preferred days
  if (preferences.preferredDays && preferences.preferredDays.length > 0) {
    possibleMatches++;
    const isWeekend = event.isWeekend || false;
    
    if (
      (isWeekend && preferences.preferredDays.includes('weekend')) ||
      (!isWeekend && preferences.preferredDays.includes('weekday'))
    ) {
      matchCount++;
      score += 10;
      reasons.push(`Happens on your preferred day: ${isWeekend ? 'weekend' : 'weekday'}`);
    }
  }
  
  // Match preferred times
  if (preferences.preferredTimes && preferences.preferredTimes.length > 0 && event.timeOfDay) {
    possibleMatches++;
    const isDay = event.timeOfDay === 'morning' || event.timeOfDay === 'afternoon';
    const isNight = event.timeOfDay === 'evening' || event.timeOfDay === 'night';
    
    if (
      (isDay && preferences.preferredTimes.includes('day')) ||
      (isNight && preferences.preferredTimes.includes('night'))
    ) {
      matchCount++;
      score += 10;
      reasons.push(`Happens at your preferred time: ${isDay ? 'day' : 'night'}`);
    }
  }
  
  // Match features
  if (preferences.features) {
    if (preferences.features.liveMusic !== undefined) {
      possibleMatches++;
      if (event.hasLiveMusic === preferences.features.liveMusic) {
        matchCount++;
        score += 5;
        if (preferences.features.liveMusic) {
          reasons.push('Features live music');
        }
      }
    }
    
    if (preferences.features.dj !== undefined) {
      possibleMatches++;
      if (event.hasDJ === preferences.features.dj) {
        matchCount++;
        score += 5;
        if (preferences.features.dj) {
          reasons.push('Features a DJ');
        }
      }
    }
    
    if (preferences.features.foodOptions !== undefined) {
      possibleMatches++;
      if (event.hasFoodOptions === preferences.features.foodOptions) {
        matchCount++;
        score += 5;
        if (preferences.features.foodOptions) {
          reasons.push('Has food options');
        }
      }
    }
    
    if (preferences.features.drinkSpecials !== undefined) {
      possibleMatches++;
      if (event.hasDrinkSpecials === preferences.features.drinkSpecials) {
        matchCount++;
        score += 5;
        if (preferences.features.drinkSpecials) {
          reasons.push('Has drink specials');
        }
      }
    }
    
    if (preferences.features.vipOptions !== undefined) {
      possibleMatches++;
      if (event.hasVIP === preferences.features.vipOptions) {
        matchCount++;
        score += 5;
        if (preferences.features.vipOptions) {
          reasons.push('Has VIP options');
        }
      }
    }
  }
  
  // Check minimum age
  if (preferences.minimumAge !== undefined && event.minimumAge !== undefined) {
    if (event.minimumAge <= preferences.minimumAge) {
      score += 5;
      reasons.push(`Age requirement: ${event.minimumAge}+`);
    } else {
      // Significant penalty for age mismatch
      score -= 50;
      reasons.push(`Age requirement (${event.minimumAge}+) exceeds your preference`);
    }
  }
  
  // Boost score based on overall match percentage
  if (possibleMatches > 0) {
    const matchPercentage = matchCount / possibleMatches;
    score = score * (0.5 + 0.5 * matchPercentage);
  }
  
  // Ensure score is within 0-100 range
  return {
    score: Math.max(0, Math.min(100, score)),
    reasons
  };
}

/**
 * Calculate a location score for an event based on user location
 * @param event - Event to score
 * @param userLocation - User location
 * @param maxDistance - Maximum preferred distance in miles
 * @returns Location score (0-100), distance, and match reason
 */
function calculateLocationScore(
  event: EnrichedPartyEvent,
  userLocation: UserLocation,
  maxDistance: number = 30
): { score: number; distance: number; reason?: string } {
  // Skip if event has no coordinates
  if (!event.coordinates && (!event.latitude || !event.longitude)) {
    return { score: 0, distance: Infinity };
  }
  
  // Get event coordinates
  const eventLat = event.coordinates 
    ? event.coordinates[1] 
    : event.latitude!;
  
  const eventLng = event.coordinates 
    ? event.coordinates[0] 
    : event.longitude!;
  
  // Calculate distance
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    eventLat,
    eventLng
  );
  
  // Calculate score based on distance
  let score = 0;
  let reason: string | undefined;
  
  if (distance <= maxDistance) {
    // Score decreases linearly with distance
    score = 100 * (1 - distance / maxDistance);
    
    // Add reason based on distance
    if (distance < 1) {
      reason = 'Very close to you (less than 1 mile)';
    } else if (distance < 5) {
      reason = `Close to you (${distance.toFixed(1)} miles)`;
    } else if (distance < 15) {
      reason = `Within reasonable distance (${distance.toFixed(1)} miles)`;
    } else {
      reason = `Within your max distance (${distance.toFixed(1)} miles)`;
    }
  }
  
  return { score, distance, reason };
}

/**
 * Calculate a recency score for an event
 * @param event - Event to score
 * @returns Recency score (0-100) and match reason
 */
function calculateRecencyScore(
  event: EnrichedPartyEvent
): { score: number; reason?: string } {
  // Skip if event has no date
  if (!event.rawDate && !event.date) {
    return { score: 0 };
  }
  
  // Parse event date
  let eventDate: Date;
  
  if (event.rawDate) {
    eventDate = new Date(event.rawDate);
  } else {
    // Try to parse from formatted date string
    const dateStr = event.date.toLowerCase();
    const parts = dateStr.split(',');
    
    if (parts.length >= 2) {
      eventDate = new Date(parts.slice(1).join(',').trim());
    } else {
      eventDate = new Date(dateStr);
    }
  }
  
  // Skip if date is invalid
  if (isNaN(eventDate.getTime())) {
    return { score: 0 };
  }
  
  // Calculate days until event
  const now = new Date();
  const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  // Calculate score based on days until event
  let score = 0;
  let reason: string | undefined;
  
  if (daysUntil < 0) {
    // Event has already passed
    score = 0;
  } else if (daysUntil < 1) {
    // Event is today
    score = 100;
    reason = 'Happening today!';
  } else if (daysUntil < 3) {
    // Event is in the next 3 days
    score = 90;
    reason = `Happening soon (in ${Math.ceil(daysUntil)} days)`;
  } else if (daysUntil < 7) {
    // Event is in the next week
    score = 80;
    reason = `Happening this week (in ${Math.ceil(daysUntil)} days)`;
  } else if (daysUntil < 14) {
    // Event is in the next 2 weeks
    score = 70;
    reason = `Happening next week (in ${Math.ceil(daysUntil)} days)`;
  } else if (daysUntil < 30) {
    // Event is in the next month
    score = 60;
    reason = `Happening this month (in ${Math.ceil(daysUntil)} days)`;
  } else {
    // Event is more than a month away
    score = Math.max(0, 50 - Math.floor(daysUntil / 30) * 10);
    reason = `Happening in ${Math.ceil(daysUntil)} days`;
  }
  
  return { score, reason };
}

/**
 * Calculate a personalization score for an event based on user interactions
 * @param event - Event to score
 * @param interactions - User interactions with events
 * @returns Personalization score (0-100) and match reasons
 */
function calculatePersonalizationScore(
  event: EnrichedPartyEvent,
  interactions: EventInteraction[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Find similar events the user has interacted with
  const similarEvents = interactions.filter(interaction => {
    // Skip if not the same event
    if (interaction.eventId === event.id) return false;
    
    // Find the event in the user's history
    const interactedEvent = event;
    
    // Check if it's a similar event
    return (
      (event.partySubcategory && event.partySubcategory === interactedEvent.partySubcategory) ||
      (event.musicGenres && interactedEvent.musicGenres && 
        event.musicGenres.some(genre => interactedEvent.musicGenres?.includes(genre)))
    );
  });
  
  // Calculate score based on similar events
  if (similarEvents.length > 0) {
    // Count positive interactions
    const viewedCount = similarEvents.filter(i => i.viewed).length;
    const clickedCount = similarEvents.filter(i => i.clicked).length;
    const savedCount = similarEvents.filter(i => i.saved).length;
    const sharedCount = similarEvents.filter(i => i.shared).length;
    const attendedCount = similarEvents.filter(i => i.attended).length;
    
    // Calculate weighted score
    score += viewedCount * 2;
    score += clickedCount * 5;
    score += savedCount * 10;
    score += sharedCount * 15;
    score += attendedCount * 20;
    
    // Cap score at 100
    score = Math.min(100, score);
    
    // Add reasons
    if (attendedCount > 0) {
      reasons.push(`You've attended ${attendedCount} similar events`);
    }
    
    if (savedCount > 0) {
      reasons.push(`You've saved ${savedCount} similar events`);
    }
    
    if (sharedCount > 0) {
      reasons.push(`You've shared ${sharedCount} similar events`);
    }
  }
  
  return { score, reasons };
}

/**
 * Get recommended party events for a user
 * @param events - Events to recommend from
 * @param preferences - User preferences
 * @param userLocation - User location
 * @param interactions - User interactions with events
 * @returns Recommended events sorted by relevance
 */
export function getRecommendedPartyEvents(
  events: Event[],
  preferences: UserPreferences,
  userLocation?: UserLocation,
  interactions: EventInteraction[] = []
): RecommendationResult[] {
  // Enrich events with additional details
  const enrichedEvents = enrichPartyEvents(events);
  
  // Calculate scores for each event
  const scoredEvents = enrichedEvents.map(event => {
    // Calculate base score
    const baseScore = calculateBaseScore(event);
    
    // Calculate preference match score
    const preferenceMatch = calculatePreferenceMatchScore(event, preferences);
    
    // Calculate location score if user location is provided
    const locationMatch = userLocation
      ? calculateLocationScore(event, userLocation, preferences.maxDistance)
      : { score: 0, distance: Infinity };
    
    // Calculate recency score
    const recencyMatch = calculateRecencyScore(event);
    
    // Calculate personalization score
    const personalizationMatch = calculatePersonalizationScore(event, interactions);
    
    // Calculate final score (weighted average)
    const finalScore = (
      baseScore * 0.1 +
      preferenceMatch.score * 0.4 +
      locationMatch.score * 0.2 +
      recencyMatch.score * 0.2 +
      personalizationMatch.score * 0.1
    );
    
    // Collect match reasons
    const matchReasons: string[] = [
      ...(preferenceMatch.reasons || []),
      locationMatch.reason,
      recencyMatch.reason,
      ...(personalizationMatch.reasons || [])
    ].filter(Boolean) as string[];
    
    return {
      event,
      score: finalScore,
      matchReasons,
      distance: locationMatch.distance !== Infinity ? locationMatch.distance : undefined
    };
  });
  
  // Sort by score (descending)
  scoredEvents.sort((a, b) => b.score - a.score);
  
  return scoredEvents;
}

/**
 * Get trending party events
 * @param events - Events to analyze
 * @param userLocation - User location (optional)
 * @returns Trending events sorted by score
 */
export function getTrendingPartyEvents(
  events: Event[],
  userLocation?: UserLocation
): RecommendationResult[] {
  // Enrich events with additional details
  const enrichedEvents = enrichPartyEvents(events);
  
  // Calculate scores for each event
  const scoredEvents = enrichedEvents.map(event => {
    // Calculate base score
    let score = calculateBaseScore(event);
    
    // Boost score for events happening soon
    const recencyMatch = calculateRecencyScore(event);
    score = score * 0.6 + recencyMatch.score * 0.4;
    
    // Calculate distance if user location is provided
    let distance: number | undefined;
    let locationReason: string | undefined;
    
    if (userLocation && (event.coordinates || (event.latitude && event.longitude))) {
      const locationMatch = calculateLocationScore(event, userLocation, 50);
      distance = locationMatch.distance;
      locationReason = locationMatch.reason;
      
      // Apply small location boost
      score = score * 0.9 + locationMatch.score * 0.1;
    }
    
    // Collect match reasons
    const matchReasons: string[] = [
      'Trending party event',
      recencyMatch.reason,
      locationReason
    ].filter(Boolean) as string[];
    
    return {
      event,
      score,
      matchReasons,
      distance
    };
  });
  
  // Sort by score (descending)
  scoredEvents.sort((a, b) => b.score - a.score);
  
  return scoredEvents;
}

/**
 * Get party events near a location
 * @param events - Events to filter
 * @param location - Location to search near
 * @param maxDistance - Maximum distance in miles
 * @returns Nearby events sorted by distance
 */
export function getNearbyPartyEvents(
  events: Event[],
  location: UserLocation,
  maxDistance: number = 30
): RecommendationResult[] {
  // Enrich events with additional details
  const enrichedEvents = enrichPartyEvents(events);
  
  // Filter and score events
  const nearbyEvents = enrichedEvents
    .map(event => {
      // Skip if event has no coordinates
      if (!event.coordinates && (!event.latitude || !event.longitude)) {
        return null;
      }
      
      // Get event coordinates
      const eventLat = event.coordinates 
        ? event.coordinates[1] 
        : event.latitude!;
      
      const eventLng = event.coordinates 
        ? event.coordinates[0] 
        : event.longitude!;
      
      // Calculate distance
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        eventLat,
        eventLng
      );
      
      // Skip if too far
      if (distance > maxDistance) {
        return null;
      }
      
      // Calculate base score
      const baseScore = calculateBaseScore(event);
      
      // Calculate recency score
      const recencyMatch = calculateRecencyScore(event);
      
      // Calculate final score (weighted by distance)
      const distanceScore = 100 * (1 - distance / maxDistance);
      const finalScore = (
        baseScore * 0.3 +
        distanceScore * 0.5 +
        recencyMatch.score * 0.2
      );
      
      // Format distance for reason
      let distanceReason: string;
      if (distance < 1) {
        distanceReason = 'Less than 1 mile away';
      } else {
        distanceReason = `${distance.toFixed(1)} miles away`;
      }
      
      return {
        event,
        score: finalScore,
        matchReasons: [
          distanceReason,
          recencyMatch.reason
        ].filter(Boolean) as string[],
        distance
      };
    })
    .filter(Boolean) as RecommendationResult[];
  
  // Sort by distance (ascending)
  nearbyEvents.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  
  return nearbyEvents;
}
