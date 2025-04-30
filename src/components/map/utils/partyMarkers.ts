
import { Event } from '@/types';

declare global {
  interface Window {
    google: any;
  }
}

// Helper function to determine the icon and color based on event type
export const getPartyMarkerConfig = (event: Event) => {
  // Default config
  let config = {
    icon: {
      path: window.google?.maps?.SymbolPath?.CIRCLE || 'circle',
      fillColor: '#9C27B0', // Default purple for parties
      fillOpacity: 0.8,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 10
    },
    animation: window.google?.maps?.Animation?.DROP,
    title: event.title || 'Party Event'
  };

  // Customize based on party subcategory if available
  if (event.category === 'party' && event.partySubcategory) {
    switch (event.partySubcategory) {
      case 'nightclub':
      case 'club':
        config.icon.fillColor = '#6A1B9A'; // Dark purple for clubs
        config.icon.scale = 11;
        break;
      case 'festival':
        config.icon.fillColor = '#D50000'; // Red for festivals
        config.icon.scale = 12;
        break;
      case 'social':
      case 'networking':
        config.icon.fillColor = '#1565C0'; // Blue for social/networking
        break;
      case 'day-party':
      case 'brunch':
        config.icon.fillColor = '#FF9800'; // Orange for day parties
        break;
      case 'rooftop':
        config.icon.fillColor = '#009688'; // Teal for rooftop
        break;
      case 'immersive':
        config.icon.fillColor = '#7B1FA2'; // Purple for immersive
        config.icon.scale = 11;
        break;
      case 'popup':
        config.icon.fillColor = '#558B2F'; // Green for popup
        break;
      case 'celebration':
        config.icon.fillColor = '#F44336'; // Red for celebration
        break;
    }
  }
  // For non-party events, use the regular category
  else {
    switch (event.category?.toLowerCase()) {
      case 'music':
        config.icon.fillColor = '#3F51B5'; // Indigo
        break;
      case 'arts':
      case 'theatre':
        config.icon.fillColor = '#E91E63'; // Pink
        break;
      case 'sports':
        config.icon.fillColor = '#4CAF50'; // Green
        break;
      case 'food':
      case 'restaurant':
        config.icon.fillColor = '#FF5722'; // Deep Orange
        break;
      case 'family':
        config.icon.fillColor = '#FFC107'; // Amber
        break;
      default:
        config.icon.fillColor = '#607D8B'; // Blue Grey for others
    }
  }

  return config;
};
