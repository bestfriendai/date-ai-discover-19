
import { Event } from '@/types';

const DEFAULT_ICON_PATH = "M12 1C18 1 23 5.5 23 11.5C23 17.5 15.5 28 12 28C8.5 28 1 17.5 1 11.5C1 5.5 6 1 12 1Z";
const DEFAULT_ICON_SCALE = 0.9;

/**
 * Gets the appropriate marker configuration for a party event
 */
export function getPartyMarkerConfig(event: Event) {
  // Default marker config
  let config: any = {
    title: event.title || 'Party Event',
    animation: window.google?.maps?.Animation?.DROP,
    zIndex: 10,
  };

  // Basic party icon (purple party popper)
  const partyIconConfig = {
    path: DEFAULT_ICON_PATH,
    fillColor: '#8B5CF6', // Purple
    fillOpacity: 0.9,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    scale: DEFAULT_ICON_SCALE,
    anchor: new window.google?.maps?.Point(12, 28),
    labelOrigin: new window.google?.maps?.Point(12, 12)
  };

  // Customize based on party subcategory
  if (event.partySubcategory) {
    // Handle specific party subcategories
    switch (event.partySubcategory) {
      case "nightclub":
        partyIconConfig.fillColor = '#9333EA'; // Purple
        break;
      
      case "festival":
        partyIconConfig.fillColor = '#EC4899'; // Pink
        partyIconConfig.scale = DEFAULT_ICON_SCALE * 1.2;
        break;
      
      case "brunch":
        partyIconConfig.fillColor = '#F59E0B'; // Amber
        break;
      
      case "day party":
        partyIconConfig.fillColor = '#F97316'; // Orange
        break;
      
      case "rooftop":
        partyIconConfig.fillColor = '#10B981'; // Emerald
        break;
      
      case "immersive":
        partyIconConfig.fillColor = '#3B82F6'; // Blue
        break;
      
      case "popup":
        partyIconConfig.fillColor = '#06B6D4'; // Cyan
        break;
      
      // Handle any other subcategory with a default color
      default:
        partyIconConfig.fillColor = '#8B5CF6'; // Purple
        break;
    }
  } else {
    // If no subcategory but is a party event
    partyIconConfig.fillColor = '#8B5CF6'; // Purple
  }

  // Add icon to config
  config.icon = partyIconConfig;

  return config;
}
