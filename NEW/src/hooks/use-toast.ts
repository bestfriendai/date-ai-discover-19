// Simplified toast hook that uses the existing toast implementation
// This is a bridge to the existing toast component

// Import the toast from the original implementation
import { toast as originalToast } from '../../src/hooks/use-toast';

// Re-export the toast function
export const toast = originalToast;
