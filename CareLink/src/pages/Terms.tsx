// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import icon components for different terms sections (documents, checks, alerts, people, rules, security)
import { FileText, CheckCircle2, AlertCircle, Users, Scale, Shield } from "lucide-react";

// Terms component - Terms of Service page explaining user obligations and platform policies
const Terms = () => {
  // sections array - Different terms sections with icons, titles, and detailed content about usage rules
  const sections = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Eligibility & Registration",
      content: "You must be at least 18 years old to use CareLink. By registering, you agree to provide accurate information and maintain the confidentiality of your account credentials. Caregivers must complete identity verification and credential submission."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Platform Use",
      content: "CareLink provides a matching platform connecting families with caregivers. We facilitate connections but do not directly employ caregivers. All care arrangements are between families and caregivers directly."
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "Verification Process",
      content: "Caregivers undergo background checks and credential verification. Verified credentials are securely stored for authenticity. While we strive for accuracy, families should conduct their own due diligence before engaging care services."
    },
    {
      icon: <Scale className="h-6 w-6" />,
      title: "Liability & Disputes",
      content: "CareLink acts as an intermediary platform. We are not liable for the quality of care provided or disputes between users. Users agree to resolve disputes through our mediation process before pursuing legal action."
    },
    {
      icon: <AlertCircle className="h-6 w-6" />,
      title: "Prohibited Conduct",
      content: "Users may not misrepresent qualifications, engage in fraudulent activity, harass other users, or use the platform for illegal purposes. Violations may result in account suspension or termination."
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Research Participation",
      content: "CareLink may conduct research to improve services. Participation is voluntary and anonymized. By using the platform, you may be invited to participate in surveys or studies. You can opt out at any time."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="section-padding">
        <div className="container-main max-w-4xl">
          <div className="text-center mb-12">
            <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: January 1, 2026</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground mb-8 text-center">
              By using CareLink, you agree to these terms. Please read them carefully before 
              creating an account or using our services.
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

          <div className="mt-12 card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-4">User Consent</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <p className="text-muted-foreground">I have read and agree to the Terms of Service</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <p className="text-muted-foreground">I understand that my credentials will be verified and securely stored</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <p className="text-muted-foreground">I consent to participate in platform research (optional)</p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-xl bg-secondary/50">
            <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
            <p className="text-muted-foreground">
              Contact our legal team at carelink317@gmail.com for questions about these terms.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Terms;
