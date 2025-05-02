// Simplified button component that uses the existing button implementation
// This is a bridge to the existing button component

// Import the Button from the original implementation
import { Button as OriginalButton } from '../../../src/components/ui/button';

// Re-export the Button component
export const Button = OriginalButton;
