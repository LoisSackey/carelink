// Import useLocation hook to get current URL path
import { useLocation } from "react-router-dom";
// Import useEffect hook for side effects (logging 404 errors)
import { useEffect } from "react";

// NotFound component - 404 error page displayed when user navigates to non-existent route
const NotFound = () => {
  // location hook - Provides access to current location object with pathname
  const location = useLocation();

  // useEffect - Logs 404 errors to console for debugging when non-existent routes are accessed
  useEffect(() => {
    // Log the attempted path that resulted in 404 error
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]); // Re-run effect if pathname changes

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
