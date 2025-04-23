
import type { Event } from '@/types';

// Type guard for PredictHQ events
function isPredictHQEvent(event: Event): event is Event & {
  rank: number;
  localRelevance: number;
  attendance: { forecast?: number; actual?: number };
  demandSurge: boolean;
  isRealTime: boolean;
} {
  return event.source === 'predicthq' &&
    typeof (event as any).rank === 'number' &&
    typeof (event as any).localRelevance === 'number' &&
    typeof (event as any).demandSurge === 'boolean' &&
    typeof (event as any).isRealTime === 'boolean';
}

export function scoreAndSortPartyEvents(events: Event[]): Event[] {
  // First, filter to only include party events
  const filteredEvents = events.filter(event => event.category === 'party');

  // Score each party event based on various factors
  const scoredEvents = filteredEvents.map(event => {
    let score = 0;

    // Score based on subcategory (prioritize clubs, day parties, etc.)
    if (event.partySubcategory) {
      switch(event.partySubcategory) {
        case 'club': score += 15; break; // Increased weight for clubs
        case 'day-party': score += 12; break; // Increased weight for day parties
        case 'celebration': score += 10; break; // Increased weight for celebrations
        case 'networking': score += 6; break;
        case 'brunch': score += 8; break; // Increased weight for brunch
        case 'social': score += 7; break;
        default: score += 5; // Increased base score
      }
    }

    // Score based on description quality (length and keywords)
    if (event.description) {
      // Add points for longer descriptions (more info = better event listing)
      score += Math.min(5, Math.floor(event.description.length / 100));

      // Add points for keywords that suggest a good party - with weighted scoring
      const description = event.description.toLowerCase();
      const title = (event.title || '').toLowerCase();
      const combinedText = `${title} ${description}`;

      // High-value keywords (strong indicators of a good party)
      const highValueKeywords = [
        'vip', 'exclusive', 'sold out', 'tickets', 'open bar',
        'bottle service', 'dance floor', 'headliner', 'dj set',
        'rave', 'underground', 'warehouse', 'silent disco',
        'pop-up party', 'immersive experience', 'secret location',
        'rooftop party', 'yacht party', 'pool party', 'beach party',
        'festival', 'all-inclusive'
      ];

      // Medium-value keywords
      const mediumValueKeywords = [
        'dj', 'music', 'dance', 'drinks', 'featured', 'popular',
        'nightlife', 'entertainment', 'live music', 'concert',
        'performance', 'party', 'club', 'nightclub', 'themed party',
        'costume party', 'masquerade', 'glow party', 'foam party',
        'paint party', 'neon party', 'retro party', 'decade party',
        'international', 'cultural', 'local artists'
      ];

      // Low-value keywords (general terms)
      const lowValueKeywords = [
        'social', 'gathering', 'mixer', 'event', 'venue', 'bar',
        'lounge', 'night', 'weekend'
      ];

      // Score based on keyword presence with different weights
      highValueKeywords.forEach(keyword => {
        if (combinedText.includes(keyword)) score += 3; // Higher weight
      });

      mediumValueKeywords.forEach(keyword => {
        if (combinedText.includes(keyword)) score += 2; // Medium weight
      });

      lowValueKeywords.forEach(keyword => {
        if (combinedText.includes(keyword)) score += 1; // Lower weight
      });
    }

    // Score based on having an image
    if (event.image && !event.image.includes('placeholder')) {
      score += 4; // Increased - images are important for party events
    }

    // Score based on having a venue
    if (event.venue) {
      score += 3; // Increased - venue info is important
    }

    // Score based on having a price (ticketed events are often better quality)
    if (event.price) {
      // Add extra points for higher-priced events (often indicate better quality)
      const priceStr = typeof event.price === 'number' ? `$${event.price}` : event.price;
      const priceMatch = priceStr?.match(/\$(\d+)/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1]);
        if (price > 100) score += 4;
        else if (price > 50) score += 3;
        else score += 2;
      } else {
        score += 2; // Default score for having a price
      }

      // Add points if it's a ticketed event (indicated by price)
      if (typeof priceStr === 'string' && priceStr.toLowerCase().includes('ticket')) {
        score += 2;
      }
    }

    // Score based on time of day (if available)
    if (event.time) {
      const [hours] = event.time.split(':').map(Number);
      // Score higher for evening/night events
      if (hours >= 22 || hours < 4) score += 5; // 10 PM to 4 AM (prime party time)
      else if (hours >= 20 && hours < 22) score += 4; // 8 PM to 10 PM
      else if (hours >= 16 && hours < 20) score += 3; // 4 PM to 8 PM (day parties)
      else if (hours >= 11 && hours < 16) score += 2; // 11 AM to 4 PM (brunch/day events)
    }

    // Add points for PredictHQ data if available
    if (isPredictHQEvent(event)) {
      // Add points for rank (global popularity)
      score += Math.floor(event.rank / 10); // Add up to 10 points for rank (0-100)

      // Add points for local relevance
      score += Math.floor(event.localRelevance / 10); // Add up to 10 points for local relevance

      // Add points for expected attendance
      if (event.attendance?.forecast) {
        // Scale attendance score logarithmically
        const attendanceScore = Math.min(10, Math.floor(Math.log10(event.attendance.forecast)));
        score += attendanceScore;
      }

      // Add points for demand surge and real-time events
      if (event.demandSurge) {
        score += 5; // Events with high demand get a boost
      }
      if (event.isRealTime) {
        score += 3; // Real-time events get a small boost
      }
    }

    return { ...event, _score: score };
  });

  // Sort events by score (highest first)
  return scoredEvents
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .map(({ _score, ...event }) => event); // Remove the score before returning
}
