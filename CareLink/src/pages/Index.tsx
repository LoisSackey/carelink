// Import React hooks and Link component from React Router for client-side navigation between pages
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
// Import Button UI component for clickable actions
import { Button } from "@/components/ui/button";
// Import Header layout component that displays navigation and branding
import Header from "@/components/layout/Header";
// Import Footer layout component that displays contact info and links
import Footer from "@/components/layout/Footer";
// Import icon components from lucide-react library for visual elements
import { 
  Shield,       // Icon for security/verification features
  Brain,        // Icon for smart matching system
  Heart,        // Icon for quality care
  Star,         // Icon for ratings and testimonials
  CheckCircle2, // Icon for verified/completed status
  Users,        // Icon for people/community
  Clock        // Icon for flexible scheduling
} from "lucide-react";
// Import hero image asset for the homepage banner
import heroImage from "@/assets/hero-image.jpg";
import heroImage2 from "@/assets/hero-image.jpeg";

// Index component - The homepage of the CareLink application displaying features, stats, testimonials
const Index = () => {
  // features array - Contains data for the 4 main feature cards shown on homepage
  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Smart Matching System",
      description: "Our matching algorithm connects families with caregivers based on needs, preferences, and verified experience."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Verification",
      description: "All credentials are verified and securely stored, ensuring authenticity and trust."
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Quality Care",
      description: "Every caregiver is thoroughly vetted, trained, and committed to providing exceptional care."
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Flexible Scheduling",
      description: "Book care on your terms with flexible scheduling options that fit your family's needs."
    }
  ];

  const stats = [
    { value: "1,200+", label: "Verified Caregivers" },
    { value: "8,500+", label: "Active Family Members" },
    { value: "4.8/5", label: "Average Rating" },
    { value: "96%", label: "Satisfaction Rate" }
  ];

  // Slideshow state
  const [slide, setSlide] = useState(0);
  const heroImages = [heroImage, heroImage2];
  // Simple auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with slideshow */}
      <section className="relative w-full min-h-[50vh] lg:min-h-[60vh] flex items-center overflow-hidden">
        {/* Slideshow background */}
        {heroImages.map((img, idx) => (
          <div
            key={img}
            className={`absolute inset-0 w-full h-full bg-center bg-cover z-0 transition-opacity duration-1000 ${slide === idx ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${img})` }}
            aria-hidden="true"
          />
        ))}
        {/* Optional overlay for readability */}
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="container-main relative z-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center py-16 md:py-24">
            <div className="space-y-8 animate-slide-up text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium">
                <Shield className="h-4 w-4" />
                Trusted & Verified Care
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Connect with Quality
                <span className="text-gradient block">Care Services</span>
                for Your Loved Ones
              </h1>
              <p className="text-lg max-w-lg text-white/90">
                Connect families with verified, qualified caregivers. 
                Credentials are securely verified and stored for trust and transparency.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/signup/caregiver">Become a Caregiver</Link>
                </Button>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-10 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center"
                    >
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-white">
                  <span className="font-semibold">50,000+</span>
                  <span className="text-white/80"> families trust us</span>
                </div>
              </div>

              {/* Verified Match Card - now below hero text/buttons, aligned far left */}
              <div className="mt-8 flex justify-start">
                <div className="bg-card/90 rounded-xl p-4 shadow-elevated border border-border flex items-center gap-3 backdrop-blur-sm">
                  <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Verified Match</p>
                    <p className="text-sm text-muted-foreground">Found in 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Removed floating card from hero image */}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-secondary/30" aria-label="Platform Statistics">
        <div className="container-main py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary" aria-label={`${stat.label}: ${stat.value}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Families Choose CareLink
            </h2>
            <p className="text-muted-foreground text-lg">
              We combine cutting-edge technology with genuine care to deliver the best caregiving experience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-elevated p-6 hover-lift group"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-secondary/30">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Getting started with CareLink is simple and straightforward.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Your Profile", desc: "Sign up and tell us about your care needs and preferences." },
              { step: "02", title: "Browse Matches", desc: "Review verified caregiver profiles that match your requirements." },
              { step: "03", title: "Book & Connect", desc: "Review profiles, schedule interviews, and book your perfect caregiver." }
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container-main text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Sign In to Your Account
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Select your role to access your CareLink account
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button variant="secondary" size="lg" asChild>
              <Link to="/login-selection">Sign In</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link to="/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
