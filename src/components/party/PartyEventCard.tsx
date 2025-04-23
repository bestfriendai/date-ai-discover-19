import React from 'react';
import { Event } from '@/types';
import { Calendar, MapPin, Clock, Music, Users, Star, Ticket } from 'lucide-react';
import PartySubcategoryBadge from './PartySubcategoryBadge';
import { motion } from 'framer-motion';

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
  // Get source icon
  const getSourceIcon = (source?: string) => {
    switch(source?.toLowerCase()) {
      case 'ticketmaster': return '🎟️';
      case 'eventbrite': return '📅';
      case 'predicthq': return '🎭';
      case 'serpapi': return '🔍';
      default: return '🎉';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-xl p-3 mb-4 cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'bg-gradient-to-r from-purple-900/80 to-pink-900/80 border border-purple-500/50 shadow-lg shadow-purple-500/20'
          : 'bg-black/40 backdrop-blur-sm hover:bg-black/60 border border-white/10 hover:border-white/30'
      }`}
      onClick={onClick}
    >
      {/* Source badge */}
      <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
        <span>{getSourceIcon(event.source)}</span>
        <span className="capitalize">{event.source}</span>
      </div>

      <div className="flex gap-3">
        {/* Event Image with gradient overlay */}
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

          {/* Gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

          {/* Glow effect for selected items */}
          {isSelected && (
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/30 to-pink-500/30 animate-pulse"></div>
          )}
        </div>

        {/* Event Details */}
        <div className="flex-1">
          <h3 className="font-bold text-base mb-1 line-clamp-2 text-white group-hover:text-purple-200 transition-colors">
            {event.title}
          </h3>

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

          {/* Party Subcategory and Price */}
          <div className="flex items-center justify-between">
            {event.partySubcategory && (
              <PartySubcategoryBadge subcategory={event.partySubcategory} size="sm" />
            )}

            {event.price && (
              <div className="flex items-center text-xs font-medium bg-black/40 text-white px-2 py-0.5 rounded-full">
                <Ticket className="h-3 w-3 mr-1" />
                {event.price}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pulsing indicator for selected event */}
      {isSelected && (
        <div className="absolute -bottom-1 -right-1 w-6 h-6">
          <span className="absolute w-full h-full rounded-full bg-purple-500 opacity-75 animate-ping"></span>
          <span className="absolute w-full h-full rounded-full bg-purple-600 flex items-center justify-center">
            <Star className="h-3 w-3 text-white" />
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default PartyEventCard;
