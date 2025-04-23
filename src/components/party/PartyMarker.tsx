import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, MapPin, Ticket, Music, Users, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Event } from '@/types';
import PartySubcategoryBadge from './PartySubcategoryBadge';

interface PartyMarkerProps {
  event: Event;
  isSelected: boolean;
  onClick: () => void;
}

export const PartyMarker: React.FC<PartyMarkerProps> = ({
  event,
  isSelected,
  onClick
}) => {
  // Get marker color based on party subcategory
  const getMarkerColor = (subcategory?: string) => {
    switch(subcategory) {
      case 'day-party': return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      case 'brunch': return 'bg-gradient-to-r from-orange-400 to-pink-500';
      case 'club': return 'bg-gradient-to-r from-purple-600 to-indigo-600';
      case 'networking': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'celebration': return 'bg-gradient-to-r from-pink-500 to-rose-500';
      case 'social': return 'bg-gradient-to-r from-teal-500 to-emerald-500';
      default: return 'bg-gradient-to-r from-violet-500 to-purple-500';
    }
  };

  // Get marker icon based on party subcategory
  const getMarkerIcon = (subcategory?: string) => {
    switch(subcategory) {
      case 'day-party': return '☀️';
      case 'brunch': return '🍳';
      case 'club': return '🎧';
      case 'networking': return '🤝';
      case 'celebration': return '🎉';
      case 'social': return '👥';
      default: return '🎊';
    }
  };

  return (
    <TooltipProvider delayDuration={isSelected ? 0 : 200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            onClick={onClick}
            className={cn(
              'cursor-pointer transition-all duration-300 ease-out focus:outline-none rounded-full flex items-center justify-center',
              'border shadow-lg backdrop-blur-sm',
              getMarkerColor(event.partySubcategory),
              isSelected ?
                'scale-125 border-white z-30 shadow-lg' :
                'border-white/30 hover:scale-110 hover:border-white/70 z-10 shadow-md',
              'w-10 h-10 sm:w-12 sm:h-12'
            )}
            aria-label={`Party Event: ${event.title}`}
            animate={isSelected ? {
              scale: 1.25,
              boxShadow: '0 0 20px 5px rgba(255,255,255,0.4)'
            } : {
              scale: 1,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            whileHover={{
              scale: isSelected ? 1.25 : 1.15,
              boxShadow: '0 0 15px 2px rgba(255,255,255,0.25)'
            }}
            whileTap={{ scale: isSelected ? 1.2 : 1.05 }}
          >
            <span className="text-lg">{getMarkerIcon(event.partySubcategory)}</span>

            {/* Pulsing ring for selected markers */}
            {isSelected && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-white"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="z-50 p-0 overflow-hidden max-w-[280px] border border-white/20">
          <div className="relative">
            {/* Header with image background */}
            <div className="relative h-24 w-full overflow-hidden">
              <img
                src={event.image || '/placeholder.jpg'}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>

              {/* Source badge */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {event.source}
              </div>

              {/* Title */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-bold text-sm text-white line-clamp-2">{event.title}</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 bg-card">
              <div className="space-y-2">
                {/* Date and Time */}
                {event.date && (
                  <div className="flex items-center text-xs text-card-foreground">
                    <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    <span>{event.date}</span>
                    {event.time && (
                      <>
                        <span className="mx-1.5">•</span>
                        <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        <span>{event.time}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Location */}
                {event.venue && (
                  <div className="flex items-center text-xs text-card-foreground">
                    <MapPin className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                )}

                {/* Price */}
                {event.price && (
                  <div className="flex items-center text-xs text-card-foreground">
                    <Ticket className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    <span>{event.price}</span>
                  </div>
                )}

                {/* Party Subcategory */}
                {event.partySubcategory && (
                  <div className="pt-1">
                    <PartySubcategoryBadge subcategory={event.partySubcategory} size="sm" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PartyMarker;
