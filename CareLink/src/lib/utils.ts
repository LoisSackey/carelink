// Import clsx utility function that conditionally joins classNames together
// Import ClassValue type that defines valid CSS class input types
import { clsx, type ClassValue } from "clsx";
// Import twMerge function that handles Tailwind CSS class merging and conflict resolution
import { twMerge } from "tailwind-merge";

// Export cn (className) helper function that merges CSS classes properly
// This function takes multiple CSS class inputs as arguments using rest parameter syntax (...inputs)
// cn is a utility used throughout the app to safely combine Tailwind classes
export function cn(...inputs: ClassValue[]) {
  // Use clsx to conditionally combine all class inputs (handles boolean values and arrays)
  // Then use twMerge to resolve Tailwind CSS conflicts (later classes override earlier ones)
  // This ensures Tailwind utilities don't conflict when classes are combined dynamically
  return twMerge(clsx(inputs));
}
