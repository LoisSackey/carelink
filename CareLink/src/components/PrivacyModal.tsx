import { useState } from "react";
import { X, ChevronDown, ChevronUp, Database, Lock, Eye, UserCheck, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyModal = ({ isOpen, onClose }: PrivacyModalProps) => {
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

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
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Privacy Policy</h2>
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
              At CareLink, we take your privacy seriously. This policy explains how we collect, 
              use, and protect your personal information when you use our platform.
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

          {/* Contact Section */}
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h3 className="font-semibold text-foreground mb-2">Questions About Privacy?</h3>
            <p className="text-muted-foreground text-sm mb-2">
              If you have any questions about our privacy practices, please contact our Data Protection Officer.
            </p>
            <p className="text-sm text-muted-foreground">
              Email: carelink317@gmail.com | Phone: +233 55 729 7261
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

export default PrivacyModal;
