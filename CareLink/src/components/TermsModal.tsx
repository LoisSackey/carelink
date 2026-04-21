import { useState } from "react";
import { X, ChevronDown, ChevronUp, FileText, CheckCircle2, AlertCircle, Users, Scale, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal = ({ isOpen, onClose }: TermsModalProps) => {
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

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

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50 overflow-y-auto">
      <div className="bg-background rounded-xl border border-border w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background rounded-t-xl">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Terms of Service</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Last updated: January 1, 2026
            </p>
            <p className="text-muted-foreground">
              By using CareLink, you agree to these terms. Please read them carefully before 
              creating an account or using our services.
            </p>
          </div>

          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={index} className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      {section.icon}
                    </div>
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                  </div>
                  {expandedSections.includes(index) ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.includes(index) && (
                  <div className="px-4 pb-4 border-t border-border/50 bg-secondary/30">
                    <p className="text-muted-foreground leading-relaxed pt-3">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User Consent Section */}
          <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-secondary">
            <h3 className="font-semibold text-foreground mb-4">User Consent</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground text-sm">I have read and agree to the Terms of Service</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground text-sm">I understand that my credentials will be verified and securely stored</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground text-sm">I consent to participate in platform research (optional)</p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
            <p className="text-muted-foreground text-sm">
              Contact our legal team at carelink317@gmail.com for questions about these terms.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex justify-end gap-3 sticky bottom-0 bg-background rounded-b-xl">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
