import React from 'react';
import { Event } from '@/types';
import { Calendar, MapPin, Clock } from 'lucide-react';
import PartySubcategoryBadge from './PartySubcategoryBadge';

interface PartyEventCardProps {
  event: Event;
  onClick: () => void;
  isSelected?: boolean;
}

export const PartyEventCard: React.FC<PartyEventCardProps> = ({
  event,
  onClick,
  isSelected = false
}) => {
  return (
    <div 
      className={`relative overflow-hidden rounded-xl p-3 mb-4 cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'bg-gradient-to-r from-purple-900/80 to-pink-900/80 border border-purple-500/50 shadow-lg shadow-purple-500/20' 
          : 'bg-black/40 backdrop-blur-sm hover:bg-black/60 border border-white/10'
      }`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Event Image */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={event.image || '/placeholder.jpg'}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.jpg';
            }}
          />
          
          {/* Glow effect for selected items */}
          {isSelected && (
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/30 to-pink-500/30 animate-pulse"></div>
          )}
        </div>
        
        {/* Event Details */}
        <div className="flex-1">
          <h3 className="font-bold text-base mb-1 line-clamp-2 text-white">{event.title}</h3>
          
          {/* Date and Time */}
          <div className="flex items-center text-xs text-gray-300 mb-1">
            <Calendar className="h-3 w-3 mr-1" />
            {event.date} • <Clock className="h-3 w-3 mx-1" /> {event.time || 'TBD'}
          </div>
          
          {/* Location */}
          <div className="flex items-center text-xs text-gray-300 mb-2">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate max-w-[180px]">{event.venue || event.location}</span>
          </div>
          
          {/* Party Subcategory */}
          {event.partySubcategory && (
            <PartySubcategoryBadge subcategory={event.partySubcategory} size="sm" />
          )}
          
          {/* Price if available */}
          {event.price && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
              {event.price}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartyEventCard;
