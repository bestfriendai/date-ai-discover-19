/**
 * Event Processor Service
 * 
 * Processes events from multiple sources with deduplication, filtering, and sorting
 */

import { Event, SearchParams, ApiUsage } from '../types.ts';
import { detectPartyEvent, detectPartySubcategory } from '../utils/partyUtils.ts';

interface EventSource {
  events: Event[];
  error: string | null;
}

interface EventSources {
  ticketmaster: EventSource;
  predictHQ: EventSource;
}

interface ProcessedEvents {
  events: Event[];
  sourceStats: {
    ticketmasterCount: number;
    ticketmasterError?: string;
    predicthqCount: number;
    predicthqError?: string;
  };
  meta: {
    processingTime: number;
    totalEvents: number;
    eventsWithCoords: number;
    ticketmasterCount: number;
    predicthqCount: number;
    apiUsage?: ApiUsage;
  };
}

export class EventProcessor {
  /**
   * Process events from multiple sources
   */
  process(sources: EventSources, params: SearchParams): ProcessedEvents {
    const startTime = performance.now();
    
    // Extract events from sources
    const ticketmasterEvents = sources.ticketmaster.events || [];
    const predictHQEvents = sources.predictHQ.events || [];
    
    // Combine events from both sources
    let allEvents: Event[] = [...ticketmasterEvents, ...predictHQEvents];
    
    // Apply normalization and filtering
    allEvents = this.normalizeAndFilterEvents(allEvents, params);
    
    // Deduplicate events
    allEvents = this.deduplicateEvents(allEvents);
    
    // Filter by coordinates if provided
    if (params.latitude && params.longitude) {
      // Use separateEventsByCoordinates instead of filterEventsByCoordinates
      const { eventsWithCoords } = this.separateEventsByCoordinates(allEvents);
      allEvents = eventsWithCoords;
      
      // Apply distance filtering if radius is provided
      if (params.radius) {
        allEvents = this.filterEventsByDistance(
          allEvents,
          params.latitude,
          params.longitude,
          params.radius
        );
      }
    }
    
    // Sort events by date
    allEvents = this.sortEventsByDate(allEvents);
    
    // Generate source statistics
    const sourceStats = {
      ticketmasterCount: ticketmasterEvents.length,
      ticketmasterError: sources.ticketmaster.error,
      predicthqCount: predictHQEvents.length,
      predicthqError: sources.predictHQ.error
    };
    
    // Generate metadata
    const meta = {
      processingTime: performance.now() - startTime,
      totalEvents: allEvents.length,
      eventsWithCoords: allEvents.filter(event => event.coordinates).length,
      ticketmasterCount: ticketmasterEvents.length,
      predicthqCount: predictHQEvents.length
    };
    
    return {
      events: allEvents,
      sourceStats,
      meta
    };
  }
  
  /**
   * Normalize and filter events
   */
  private normalizeAndFilterEvents(events: Event[], params: SearchParams): Event[] {
    // Filter out events with missing required fields
    return events.filter(event => {
      // Check for required fields
      if (!event.id || !event.title || !event.start) {
        return false;
      }
      
      // Apply text search if provided
      if (params.text && params.text.length > 0) {
        const searchText = params.text.toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(searchText);
        const descMatch = event.description?.toLowerCase().includes(searchText);
        
        if (!titleMatch && !descMatch) {
          return false;
        }
      }
      
      // Apply category filtering if provided
      if (params.categories && params.categories.length > 0) {
        // Special handling for party category
        if (params.categories.includes('party')) {
          // Check if this is a party event
          const isPartyEvent = detectPartyEvent(
            event.title,
            event.description || ''
          );
          
          if (isPartyEvent) {
            // Detect party subcategory
            const partySubcategory = detectPartySubcategory(
              event.title,
              event.description || '',
              event.time || ''
            );
            
            // Add party subcategory to event
            event.partySubcategory = partySubcategory;
            return true;
          }
        }
        
        // For other categories, check if event category matches any of the requested categories
        if (event.category && params.categories.includes(event.category)) {
          return true;
        }
        
        // If we get here and party was requested, but the event is not a party event, filter it out
        if (params.categories.includes('party')) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Deduplicate events based on title and date similarity
   */
  private deduplicateEvents(events: Event[]): Event[] {
    const uniqueEvents: Event[] = [];
    const seenKeys = new Set<string>();
    
    for (const event of events) {
      // Create a deduplication key based on title and date
      // Normalize title by removing special characters and converting to lowercase
      const normalizedTitle = event.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract date from start time
      const eventDate = event.start.split('T')[0];
      
      // Create a composite key
      const dedupKey = `${normalizedTitle}|${eventDate}`;
      
      // Check if we've seen this event before
      if (!seenKeys.has(dedupKey)) {
        seenKeys.add(dedupKey);
        uniqueEvents.push(event);
      } else {
        // If we have a duplicate, keep the one with more information
        // Find the existing event
        const existingIndex = uniqueEvents.findIndex(e => {
          const existingNormalizedTitle = e.title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          const existingDate = e.start.split('T')[0];
          const existingKey = `${existingNormalizedTitle}|${existingDate}`;
          
          return existingKey === dedupKey;
        });
        
        if (existingIndex !== -1) {
          const existingEvent = uniqueEvents[existingIndex];
          
          // Prefer events with coordinates
          if (!existingEvent.coordinates && event.coordinates) {
            uniqueEvents[existingIndex] = event;
          }
          // Prefer events with images
          else if (!existingEvent.image && event.image) {
            uniqueEvents[existingIndex] = event;
          }
          // Prefer events with longer descriptions
          else if (
            (!existingEvent.description || existingEvent.description.length < 50) &&
            event.description && event.description.length >= 50
          ) {
            uniqueEvents[existingIndex] = event;
          }
          // Prefer events with higher rank
          else if (
            existingEvent.rank !== undefined && 
            event.rank !== undefined && 
            event.rank > existingEvent.rank
          ) {
            uniqueEvents[existingIndex] = event;
          }
        }
      }
    }
    
    return uniqueEvents;
  }
  
  /**
   * Sort events by date
   */
  private sortEventsByDate(events: Event[]): Event[] {
    return [...events].sort((a, b) => {
      // Parse dates
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      
      // Compare dates
      return dateA.getTime() - dateB.getTime();
    });
  }
  
  /**
   * Separate events with coordinates from those without
   */
  private separateEventsByCoordinates(events: Event[]): { eventsWithCoords: Event[], eventsWithoutCoords: Event[] } {
    const eventsWithCoords: Event[] = [];
    const eventsWithoutCoords: Event[] = [];
    
    for (const event of events) {
      if (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2) {
        eventsWithCoords.push(event);
      } else {
        eventsWithoutCoords.push(event);
      }
    }
    
    return { eventsWithCoords, eventsWithoutCoords };
  }
  
  /**
   * Filter events by distance from a point
   */
  private filterEventsByDistance(
    events: Event[],
    latitude: number,
    longitude: number,
    radiusMiles: number
  ): Event[] {
    return events.filter(event => {
      // Skip events without coordinates
      if (!event.coordinates || !Array.isArray(event.coordinates) || event.coordinates.length !== 2) {
        return false;
      }
      
      // Calculate distance
      const distance = this.calculateDistance(
        latitude,
        longitude,
        event.coordinates[0],
        event.coordinates[1]
      );
      
      // Convert km to miles
      const distanceMiles = distance * 0.621371;
      
      // Add distance to event for sorting/display
      event.distance = distanceMiles;
      
      // Include if within radius
      return distanceMiles <= radiusMiles;
    });
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }
  
  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
