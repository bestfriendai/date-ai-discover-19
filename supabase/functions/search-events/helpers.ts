/**
 * Helper functions for the search-events function
 */

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Earth's radius in miles
  const radius = 3958.8;
  
  // Calculate the distance
  return radius * c;
}

/**
 * Extract numeric price from a price string
 * @param priceStr Price string (e.g., "$25" or "$10 - $50")
 * @returns Numeric price (uses the lower value if a range is provided)
 */
export function extractNumericPrice(priceStr?: string): number {
  if (!priceStr) return 0;
  
  // Extract numeric values from the price string
  const priceMatch = priceStr.match(/\$([0-9.]+)(?:\s*-\s*\$([0-9.]+))?/);
  
  if (!priceMatch) return 0;
  
  // Return the lower value if it's a range, otherwise return the single value
  return parseFloat(priceMatch[1]);
}

/**
 * Parse event date in various formats
 * @param dateStr Date string
 * @param timeStr Time string
 * @returns Date object
 */
export function parseEventDate(dateStr: string, timeStr: string): Date {
  try {
    // Try to parse ISO date format (YYYY-MM-DD)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);

      // Parse time (HH:MM format)
      let hours = 0, minutes = 0;
      if (timeStr) {
        const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (timeParts) {
          hours = parseInt(timeParts[1], 10);
          minutes = parseInt(timeParts[2], 10);

          // Handle AM/PM
          if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
          } else if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }
      }

      return new Date(year, month - 1, day, hours, minutes);
    }

    // Try to parse date strings like "Mon, May 19"
    const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
    if (monthMatch) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = monthNames.indexOf(monthMatch[1].toLowerCase());
      const day = parseInt(monthMatch[2], 10);

      // Use current year as default
      const year = new Date().getFullYear();

      // Parse time (HH:MM AM/PM format)
      let hours = 0, minutes = 0;
      if (timeStr) {
        const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (timeParts) {
          hours = parseInt(timeParts[1], 10);
          minutes = parseInt(timeParts[2], 10);

          // Handle AM/PM
          if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
          } else if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }
      }

      return new Date(year, month, day, hours, minutes);
    }

    // Fallback: return current date (events with unparseable dates will be sorted last)
    return new Date();
  } catch (error) {
    console.error('Error parsing event date:', error, { dateStr, timeStr });
    return new Date(); // Fallback to current date
  }
}
