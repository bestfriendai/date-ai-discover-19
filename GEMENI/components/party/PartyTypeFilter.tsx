
import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckIcon, MusicIcon, CoffeeIcon, SunIcon, MoonIcon } from '@/lib/icons';

// Party subcategory types - match this exactly with what's used in the codebase
export type PartySubcategory = 'all' | 'nightclub' | 'festival' | 'brunch' | 'day party' | 'general';

interface PartyTypeFilterProps {
  selectedType: PartySubcategory;
  onChange: (type: PartySubcategory) => void;
  className?: string;
}

interface PartyTypeOption {
  value: PartySubcategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const partyTypes: PartyTypeOption[] = [
  {
    value: 'all',
    label: 'All Parties',
    icon: <CheckIcon className="h-4 w-4" />,
    description: 'Show all party types'
  },
  {
    value: 'nightclub',
    label: 'Nightclubs',
    icon: <MoonIcon className="h-4 w-4" />,
    description: 'Clubs, DJ events, nightlife'
  },
  {
    value: 'festival',
    label: 'Festivals',
    icon: <MusicIcon className="h-4 w-4" />,
    description: 'Music festivals, cultural celebrations'
  },
  {
    value: 'brunch',
    label: 'Brunch Parties',
    icon: <CoffeeIcon className="h-4 w-4" />,
    description: 'Brunch events with social atmosphere'
  },
  {
    value: 'day party',
    label: 'Day Parties',
    icon: <SunIcon className="h-4 w-4" />,
    description: 'Daytime events, pool parties, rooftops'
  }
];

const PartyTypeFilter: React.FC<PartyTypeFilterProps> = ({
  selectedType,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {partyTypes.map((type) => (
        <Button
          key={type.value}
          variant={selectedType === type.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(type.value)}
          className="flex items-center gap-1.5"
          title={type.description}
        >
          {type.icon}
          <span>{type.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default PartyTypeFilter;
