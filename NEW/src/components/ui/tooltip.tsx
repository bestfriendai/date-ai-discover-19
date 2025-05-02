// Simplified tooltip component that uses the existing tooltip implementation
// This is a bridge to the existing tooltip component

// Import the tooltip components from the original implementation
import { 
  TooltipProvider as OriginalTooltipProvider,
  Tooltip as OriginalTooltip,
  TooltipTrigger as OriginalTooltipTrigger,
  TooltipContent as OriginalTooltipContent
} from '../../../src/components/ui/tooltip';

// Re-export the tooltip components
export const TooltipProvider = OriginalTooltipProvider;
export const Tooltip = OriginalTooltip;
export const TooltipTrigger = OriginalTooltipTrigger;
export const TooltipContent = OriginalTooltipContent;
