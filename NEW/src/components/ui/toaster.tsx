// Simplified toaster component that uses the existing toaster implementation
// This is a bridge to the existing toaster component

// Import the Toaster from the original implementation
import { Toaster as OriginalToaster } from '../../../src/components/ui/toaster';

// Re-export the Toaster component
export const Toaster = OriginalToaster;
