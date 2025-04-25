
import { Event } from '@/types';

export interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
  isSelected?: boolean;
}
