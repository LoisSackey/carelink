// Import React library for using hooks and React features
import * as React from "react";

// MOBILE_BREAKPOINT constant - Pixel width threshold that defines mobile vs desktop (below 768px is mobile)
const MOBILE_BREAKPOINT = 768;

// useIsMobile hook - Custom hook that detects if the device/window is mobile-sized and listens for changes
export function useIsMobile() {
  // isMobile state - Tracks whether current viewport width is below mobile breakpoint (undefined = not initialized)
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  // useEffect hook - Sets up media query listener to detect screen size changes when component mounts
  React.useEffect(() => {
    // matchMedia creates media query to detect if width is less than breakpoint (767px or less)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // onChange function - Called whenever media query changes (window resized across breakpoint)
    const onChange = () => {
      // Update isMobile state whenever window size changes
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Register listener for media query changes
    mql.addEventListener("change", onChange);
    
    // Set initial isMobile value based on current window width
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // Return cleanup function to remove listener when component unmounts
    return () => mql.removeEventListener("change", onChange);
  }, []); // Empty dependency array means effect runs once on mount

  // Return boolean indicating if current screen is mobile-sized (return !! to convert to boolean)
  return !!isMobile;
}
