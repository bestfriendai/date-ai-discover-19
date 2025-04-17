
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Itinerary } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getItinerary } from '@/services/itineraryService';

const DatePlan: React.FC = () => {
  const params = useParams();
  const { id } = params;
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchItinerary(id);
    }
  }, [id]);

  const fetchItinerary = async (itineraryId: string) => {
    try {
      const fetchedItinerary = await getItinerary(itineraryId);
      setItinerary(fetchedItinerary);
    } catch (error) {
      console.error('Error fetching itinerary:', error);
    }
  };

  if (!itinerary) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{itinerary.name}</h1>
      <p>{itinerary.description}</p>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(date) =>
              date < new Date("2020-01-01")
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePlan;
