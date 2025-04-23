import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Clock } from 'lucide-react/dist/esm/icons/clock';
import { Calendar } from 'lucide-react/dist/esm/icons/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimeSliderProps {
  onTimeRangeChange: (range: [number, number]) => void;
  defaultValue?: [number, number]; // 0-24 hours
}

export function TimeSlider({ onTimeRangeChange, defaultValue = [0, 24] }: TimeSliderProps) {
  const [value, setValue] = useState<[number, number]>(defaultValue);
  
  // Format time for display (convert 0-24 to readable time)
  const formatTime = (hour: number) => {
    if (hour === 0 || hour === 24) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  useEffect(() => {
    onTimeRangeChange(value);
  }, [value, onTimeRangeChange]);

  return (
    <TooltipProvider>
      <div className="w-full max-w-sm bg-background/80 backdrop-blur rounded-lg shadow-lg border border-border/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Time Filter</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="rounded-full bg-slate-800/50 p-1.5 hover:bg-slate-800/80 transition-colors">
                <Calendar className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Filter events by time of day</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="mb-6">
          <Slider 
            defaultValue={defaultValue}
            max={24} 
            step={1} 
            value={value}
            onValueChange={(values) => setValue(values as [number, number])}
            className="w-full"
          />
        </div>
        
        <div className="flex justify-between items-center text-xs font-medium">
          <div>
            <div className="text-primary">{formatTime(value[0])}</div>
            <div className="text-muted-foreground">Start</div>
          </div>
          <div className="text-center">
            <div className="text-primary">{value[1] - value[0]} hours</div>
            <div className="text-muted-foreground">Duration</div>
          </div>
          <div>
            <div className="text-primary text-right">{formatTime(value[1])}</div>
            <div className="text-muted-foreground text-right">End</div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
