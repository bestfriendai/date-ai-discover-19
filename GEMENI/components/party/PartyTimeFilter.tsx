
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  SunIcon, 
  MoonIcon, 
  CalendarIcon, 
  ClockIcon 
} from '@/lib/icons';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

// Time filter types
export type TimeOfDay = 'all' | 'day' | 'night';
export type DayOfWeek = 'all' | 'weekday' | 'weekend';

interface PartyTimeFilterProps {
  selectedTimeOfDay: TimeOfDay;
  selectedDayOfWeek: DayOfWeek;
  onTimeOfDayChange: (time: TimeOfDay) => void;
  onDayOfWeekChange: (day: DayOfWeek) => void;
  className?: string;
}

const PartyTimeFilter: React.FC<PartyTimeFilterProps> = ({
  selectedTimeOfDay,
  selectedDayOfWeek,
  onTimeOfDayChange,
  onDayOfWeekChange,
  className = ''
}) => {
  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      <div className="flex items-center">
        <ClockIcon className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="text-sm font-medium">Time of Day</span>
      </div>
      
      <Tabs
        value={selectedTimeOfDay}
        onValueChange={(value) => onTimeOfDayChange(value as TimeOfDay)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>Any Time</span>
          </TabsTrigger>
          <TabsTrigger value="day" className="flex items-center gap-1.5">
            <SunIcon className="h-3.5 w-3.5" />
            <span>Day</span>
          </TabsTrigger>
          <TabsTrigger value="night" className="flex items-center gap-1.5">
            <MoonIcon className="h-3.5 w-3.5" />
            <span>Night</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="flex items-center mt-2">
        <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="text-sm font-medium">Day of Week</span>
      </div>
      
      <Tabs
        value={selectedDayOfWeek}
        onValueChange={(value) => onDayOfWeekChange(value as DayOfWeek)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Any Day</span>
          </TabsTrigger>
          <TabsTrigger value="weekday" className="flex items-center gap-1.5">
            <span>Weekdays</span>
          </TabsTrigger>
          <TabsTrigger value="weekend" className="flex items-center gap-1.5">
            <span>Weekend</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default PartyTimeFilter;
