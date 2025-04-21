import React from 'react';
import { PartySubcategory } from '@/utils/eventNormalizers';

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
          bgColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
          icon: '🎉'
        };
      case 'social':
        return { 
          label: 'Social',
          bgColor: 'bg-gradient-to-r from-teal-500 to-emerald-500',
          icon: '👥'
        };
      default:
        return { 
          label: 'Party',
          bgColor: 'bg-gradient-to-r from-violet-500 to-purple-500',
          icon: '🎊'
        };
    }
  };

  const { label, bgColor, icon } = getSubcategoryDetails(subcategory);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <div className={`inline-flex items-center rounded-full ${bgColor} text-white font-medium ${sizeClasses[size]} shadow-sm`}>
      <span className="mr-1">{icon}</span> {label}
    </div>
  );
};

export default PartySubcategoryBadge;
