
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
        case 'club': score += 10; break;
        case 'day-party': score += 8; break;
        case 'celebration': score += 6; break;
        case 'networking': score += 4; break;
        case 'brunch': score += 5; break;
        default: score += 3;
      }
    }

    // Score based on description quality (length and keywords)
    if (event.description) {
      // Add points for longer descriptions (more info = better event listing)
      score += Math.min(5, Math.floor(event.description.length / 100));
      // Add points for keywords that suggest a good party
      const description = event.description.toLowerCase();
      const goodPartyKeywords = [
        'dj', 'music', 'dance', 'drinks', 'vip', 'exclusive', 'featured',
        'popular', 'sold out', 'tickets', 'nightlife', 'entertainment'
      ];
      goodPartyKeywords.forEach(keyword => {
        if (description.includes(keyword)) score += 1;
      });
    }

    // Score based on having an image
    if (event.image && !event.image.includes('placeholder')) {
      score += 3;
    }
    // Score based on having a venue
    if (event.venue) {
      score += 2;
    }
    // Score based on having a price (ticketed events are often better quality)
    if (event.price) {
      score += 2;
    }
    return { ...event, _score: score };
  });

  // Sort events by score (highest first)
  return scoredEvents
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .map(({ _score, ...event }) => event); // Remove the score before returning
}
