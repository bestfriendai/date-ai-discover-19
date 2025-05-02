import React from 'react';
import { PartySubcategory } from '@/types';

interface PartySubcategoryBadgeProps {
  subcategory: PartySubcategory;
  size?: 'sm' | 'md' | 'lg';
}

export const PartySubcategoryBadge: React.FC<PartySubcategoryBadgeProps> = ({ 
  subcategory,
  size = 'md'
}) => {
  // Define colors and icons for each subcategory
  const getSubcategoryDetails = (subcategory: PartySubcategory) => {
    switch(subcategory) {
      case 'day-party':
        return { 
          label: 'Day Party',
          bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          icon: '☀️'
        };
      case 'brunch':
        return { 
          label: 'Brunch',
          bgColor: 'bg-gradient-to-r from-orange-400 to-pink-500',
          icon: '🍳'
        };
      case 'club':
        return { 
          label: 'Club',
          bgColor: 'bg-gradient-to-r from-purple-600 to-indigo-600',
          icon: '🎧'
        };
      case 'networking':
        return { 
          label: 'Networking',
          bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          icon: '🤝'
        };
      case 'celebration':
        return { 
          label: 'Celebration',
          bgColor: 'bg-gradient-to-r from-pink-500 to-red-500',
          icon: '🎉'
        };
      case 'social':
        return { 
          label: 'Social',
          bgColor: 'bg-gradient-to-r from-green-500 to-teal-500',
          icon: '👥'
        };
      case 'festival':
        return { 
          label: 'Festival',
          bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
          icon: '🎪'
        };
      case 'rooftop':
        return { 
          label: 'Rooftop',
          bgColor: 'bg-gradient-to-r from-blue-400 to-indigo-500',
          icon: '🏙️'
        };
      case 'immersive':
        return { 
          label: 'Immersive',
          bgColor: 'bg-gradient-to-r from-violet-600 to-purple-600',
          icon: '✨'
        };
      case 'popup':
        return { 
          label: 'Pop-up',
          bgColor: 'bg-gradient-to-r from-amber-500 to-orange-600',
          icon: '🎪'
        };
      case 'nightclub':
        return { 
          label: 'Nightclub',
          bgColor: 'bg-gradient-to-r from-indigo-800 to-purple-900',
          icon: '🌃'
        };
      default:
        return { 
          label: 'Party',
          bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
          icon: '🎵'
        };
    }
  };

  const { label, bgColor, icon } = getSubcategoryDetails(subcategory);
  
  // Size classes
  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-1 px-3',
    lg: 'text-base py-2 px-4'
  };
  
  return (
    <div className={`inline-flex items-center rounded-full ${bgColor} text-white font-medium ${sizeClasses[size]} shadow-md`}>
      <span className="mr-1">{icon}</span>
      <span>{label}</span>
    </div>
  );
};
