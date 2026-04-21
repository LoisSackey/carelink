// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import icon components for different privacy aspects (security, encryption, visibility, etc.)
import { Shield, Lock, Eye, Database, UserCheck, FileText } from "lucide-react";

// Privacy component - Privacy policy page explaining how user data is collected, used, and protected
const Privacy = () => {
  // sections array - Different privacy policy sections with icons, titles, and content
  const sections = [
    {
      icon: <Database className="h-6 w-6" />,
      title: "Data Collection",
      content: "We collect information you provide directly, such as name, email, and phone number. For caregivers, we also collect professional credentials, certifications, and work history for verification and matching purposes."
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Data Security",
      content: "Your data is encrypted at rest and in transit using industry-standard AES-256 encryption. Credential records are securely stored and protected against unauthorized access."
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Data Usage",
      content: "We use your data to provide and improve our services, including caregiver matching, identity verification, and platform analytics. We never sell your personal information to third parties."
    },
    {
      icon: <UserCheck className="h-6 w-6" />,
      title: "User Rights",
      content: "You have the right to access, correct, or delete your personal data. You can request a copy of your data or ask us to remove your account at any time through your account settings or by contacting support."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Blockchain Verification",
      content: "Caregiver credentials are verified and securely stored. Only verification status (verified/unverified) is visible to families; full credential details remain private and are not shared publicly."
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Research Compliance",
      content: "Any research using platform data is conducted in compliance with applicable regulations and ethics guidelines. Participation in research studies is voluntary and requires explicit consent."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="section-padding">
        <div className="container-main max-w-4xl">
          <div className="text-center mb-12">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: January 1, 2026</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground mb-8 text-center">
              At CareLink, we take your privacy seriously. This policy explains how we collect, 
              use, and protect your personal information when you use our platform.
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className="card-elevated p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">{section.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
            <h3 className="font-semibold text-foreground mb-2">Questions About Privacy?</h3>
            <p className="text-muted-foreground mb-4">
              If you have any questions about our privacy practices, please contact our Data Protection Officer.
            </p>
            <p className="text-sm text-muted-foreground">
              Email: carelink317@gmail.com | Phone: +233 55 729 7261
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Privacy;
