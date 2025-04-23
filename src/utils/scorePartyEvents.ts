
import type { Event } from '@/types';

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
        'rave', 'underground', 'warehouse'
      ];

      // Medium-value keywords
      const mediumValueKeywords = [
        'dj', 'music', 'dance', 'drinks', 'featured', 'popular',
        'nightlife', 'entertainment', 'live music', 'concert',
        'performance', 'party', 'club', 'nightclub'
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
      score += 2;
    }

    // Score based on time of day (if available)
    if (event.time) {
      const [hours] = event.time.split(':').map(Number);
      // Score higher for evening/night events
      if (hours >= 20 || hours < 4) score += 4; // 8 PM to 4 AM
      else if (hours >= 16 && hours < 20) score += 2; // 4 PM to 8 PM (for day parties)
    }

    return { ...event, _score: score };
  });

  // Sort events by score (highest first)
  return scoredEvents
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .map(({ _score, ...event }) => event); // Remove the score before returning
}
