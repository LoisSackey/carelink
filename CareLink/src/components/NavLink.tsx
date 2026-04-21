// Import NavLink from React Router and the type props for it
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
// Import forwardRef for passing refs to underlying HTML elements
import { forwardRef } from "react";
// Import cn utility function for merging and resolving CSS class conflicts
import { cn } from "@/lib/utils";

// Interface extending Router NavLink props with support for custom className and active/pending states
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;          // Base CSS classes applied always
  activeClassName?: string;    // Additional classes applied when link is active (current page)
  pendingClassName?: string;   // Additional classes applied while navigation is pending
}

// NavLink component - Enhanced version of React Router's NavLink with better className handling
// Uses forwardRef to allow parent components to access the underlying HTMLAnchorElement
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      // RouterNavLink component from React Router with ref forwarding
      <RouterNavLink
        ref={ref}  // Forward ref to underlying anchor element
        to={to}    // Navigation path/destination
        // className function - Dynamically generates class list based on isActive and isPending states
        className={({ isActive, isPending }) =>
          // Use cn utility to merge: base classes + active classes + pending classes
          // Later classes override earlier ones due to Tailwind resolution
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props} // Spread remaining props (children, onClick, style, etc.)
      />
    );
  },
);

// Set display name for better debugging in React DevTools
NavLink.displayName = "NavLink";

// Export the NavLink component for use throughout the application
export { NavLink };
