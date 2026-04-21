import { useState } from "react";
// Import Link component for navigation between pages
import { Link } from "react-router-dom";
// Import icon components for logo and contact methods
import { Heart, Mail, Phone, MapPin } from "lucide-react";
// Import modal components
import PrivacyModal from "@/components/PrivacyModal";
import TermsModal from "@/components/TermsModal";

// Footer component - Displays footer with brand, navigation links, legal links, and contact info
const Footer = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  return (
    // Footer wrapper: Semi-transparent background with border at top
    <footer className="bg-secondary/50 border-t border-border" role="contentinfo">
      {/* Container: Constrains footer content and adds padding */}
      <div className="container-main section-padding">
        {/* Grid layout: Responsive columns with content sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2" aria-label="CareLink - Home">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
                <Heart className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-foreground">CareLink</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Connecting families with trusted, verified caregivers through secure matching and verification.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <nav aria-label="Footer Navigation">
              <ul className="space-y-3">
                {[
                  { path: "/about", label: "About Us" },
                  { path: "/signup/caregiver", label: "Become a Caregiver" },
                  { path: "/contact", label: "Contact" },
                ].map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <nav aria-label="Legal Navigation">
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowTermsModal(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                <a href="mailto:carelink317@gmail.com" className="hover:text-primary transition-colors">
                  carelink317@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                <a href="tel:+233557297261" className="hover:text-primary transition-colors">
                  +233 55 729 7261
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>Accra, Ghana</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 CareLink. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with <Heart className="inline h-4 w-4 text-accent" aria-hidden="true" /> for families everywhere
          </p>
        </div>
      </div>

      {/* Modals */}
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </footer>
  );
};

export default Footer;
