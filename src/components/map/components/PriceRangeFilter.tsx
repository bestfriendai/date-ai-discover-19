import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { DollarSign, PlusCircle, MinusCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface PriceRangeFilterProps {
  onPriceRangeChange: (range: [number, number]) => void;
  onFreeEventsChange: (showFreeOnly: boolean) => void;
  defaultValue?: [number, number]; // default price range
  defaultShowFreeOnly?: boolean;
}

export function PriceRangeFilter({
  onPriceRangeChange,
  onFreeEventsChange,
  defaultValue = [0, 200],
  defaultShowFreeOnly = false
}: PriceRangeFilterProps) {
  const [value, setValue] = useState<[number, number]>(defaultValue);
  const [showFreeOnly, setShowFreeOnly] = useState(defaultShowFreeOnly);

  // Format price for display
  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${price}`;
  };

  useEffect(() => {
    if (!showFreeOnly) {
      onPriceRangeChange(value);
    }
  }, [value, showFreeOnly, onPriceRangeChange]);

  useEffect(() => {
    onFreeEventsChange(showFreeOnly);
  }, [showFreeOnly, onFreeEventsChange]);

  return (
    <TooltipProvider>
      <div className="w-full max-w-sm bg-background/80 backdrop-blur rounded-lg shadow-lg border border-border/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Price Filter</span>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="free-events-mode"
              checked={showFreeOnly}
              onCheckedChange={setShowFreeOnly}
            />
            <Label htmlFor="free-events-mode">Free events only</Label>
          </div>
        </div>

        <div className="mb-6">
          <Slider
            defaultValue={defaultValue}
            min={0}
            max={500}
            step={10}
            value={value}
            disabled={showFreeOnly}
            onValueChange={(values) => setValue(values as [number, number])}
            className={`w-full ${showFreeOnly ? 'opacity-50' : ''}`}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-medium">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`flex items-center gap-1 ${showFreeOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!showFreeOnly && value[0] > 0) {
                    setValue([Math.max(0, value[0] - 10), value[1]]);
                  }
                }}
                disabled={showFreeOnly}
              >
                <MinusCircle className="h-3 w-3" />
                <div className="text-primary">{formatPrice(value[0])}</div>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Minimum price</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`flex items-center gap-1 ${showFreeOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!showFreeOnly && value[1] < 500) {
                    setValue([value[0], Math.min(500, value[1] + 10)]);
                  }
                }}
                disabled={showFreeOnly}
              >
                <div className="text-primary text-right">{formatPrice(value[1])}</div>
                <PlusCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Maximum price</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
