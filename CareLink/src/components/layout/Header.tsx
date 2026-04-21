// Import hooks for state management and routing
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
// Import custom Button component
import { Button } from "@/components/ui/button";
// Import icons: Menu (hamburger), X (close), Heart (logo)
import { Menu, X, Heart } from "lucide-react";

// Header component that appears at the top of every page
const Header = () => {
  // State to control mobile menu visibility (open/closed)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Get current page location to highlight active navigation link
  const location = useLocation();

  // Array of navigation links with their paths and labels
  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
  ];

  // Function to check if a navigation link is the current active page
  const isActive = (path: string) => location.pathname === path;

  return (
    // Header wrapper: Sticky positioning stays at top, z-50 ensures it's above other content
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Container: Constrains content width and adds horizontal padding */}
      <div className="container-main">
        {/* Header row: Flex layout with 16rem height, space-between distributes items to edges */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo section: Clickable link that navigates to home page */}
          <Link to="/" className="flex items-center gap-2 group" aria-label="CareLink - Home">
            {/* Icon container: Rounded background, scales up slightly on hover */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105" aria-hidden="true">
              <Heart className="h-5 w-5" />
            </div>
            {/* Brand name: Bold, large text */}
            <span className="text-xl font-bold text-foreground">CareLink</span>
          </Link>

          {/* Desktop navigation: Only visible on medium screens and up, creates horizontal menu */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {/* Map through nav links and create a link for each */}
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                // Conditional styling: Active links have primary background, inactive have muted foreground
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                aria-current={isActive(link.path) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth buttons: Only visible on medium screens and up */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in" id="mobile-menu">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                    className="px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                    aria-current={undefined}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
