// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import Button UI component for clickable actions
import { Button } from "@/components/ui/button";
// Import Link component for navigation between pages
import { Link } from "react-router-dom";
// Import icon components from lucide-react for visual elements
import { 
  Shield,       // Icon for trust/security
  Brain,        // Icon for innovation/intelligence
  Heart,        // Icon for compassion
  Users,        // Icon for team/people
  Target,       // Icon for mission/goals
  Award,        // Icon for excellence/achievements
  CheckCircle2  // Icon for verified/completed
} from "lucide-react";

// About component - Displays company information, team, values, and mission
const About = () => {
  // values array - Core company values with icons and descriptions
  const values = [
    { icon: <Heart className="h-6 w-6" />, title: "Compassion", desc: "We believe in treating every individual with dignity and kindness." },
    { icon: <Shield className="h-6 w-6" />, title: "Trust", desc: "Blockchain verification ensures complete transparency and security." },
    { icon: <Brain className="h-6 w-6" />, title: "Innovation", desc: "Smart matching technology creates perfect caregiver-family connections." },
    { icon: <Award className="h-6 w-6" />, title: "Excellence", desc: "We hold ourselves to the highest standards of care quality." },
  ];



  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="section-padding bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container-main text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            About CareLink
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're on a mission to transform how families find and connect with caregivers, 
            using technology to build trust and deliver exceptional care.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding">
        <div className="container-main">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="card-elevated p-8">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To connect every family with trusted, verified caregivers through innovative technology, 
                ensuring peace of mind and exceptional care for loved ones of all ages.
              </p>
            </div>
            <div className="card-elevated p-8">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                A world where quality caregiving is accessible to all, where caregivers are valued professionals, 
                and where trust in care is guaranteed through transparent verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-secondary/30">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="section-padding">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Technology</h2>
            <p className="text-muted-foreground text-lg">
              We combine AI and blockchain to create a secure, efficient caregiving platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card-elevated p-8">
              <Brain className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Smart Caregiver Matching</h3>
              <ul className="space-y-3">
                {["Evaluates care needs and family preferences", "Matches based on skills and experience", "Considers location and availability", "Continuously improves recommendations"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-elevated p-8">
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Credential Verification System</h3>
              <ul className="space-y-3">
                {["Secure credential records", "Verified professional certifications", "Transparent work history", "Protected identity management"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Join Our Community</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Whether you're looking for care or want to become a caregiver, we're here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
