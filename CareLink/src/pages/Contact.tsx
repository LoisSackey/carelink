// Import useState hook for managing form state
import { useState } from "react";
// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import Button UI component for form submission
import { Button } from "@/components/ui/button";
// Import icon components for visual representation of contact methods and actions
import { Mail, Phone, MapPin, Send, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
// Import contact API
import { contactAPI } from "@/lib/api";

// Contact component - Contact form page with company contact info and FAQs
const Contact = () => {
  // formData state - Holds user input for the contact form (name, email, subject, message)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // handleSubmit function - Processes form submission and sends to both FormSpree and backend API
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();
    setIsLoading(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Send to FormSpree for email notification
      const formspreeResponse = await fetch('https://formspree.io/f/mojjjepz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message
        })
      });

      if (!formspreeResponse.ok) {
        throw new Error('FormSpree submission failed');
      }

      // Also submit to backend API for admin dashboard
      await contactAPI.create(formData);

      setSubmitStatus("success");
      // Clear all form fields after successful submission
      setFormData({ name: "", email: "", subject: "", message: "" });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus("idle"), 5000);
    } catch (error) {
      console.error("Contact form submission error:", error);
      setSubmitStatus("error");
      setErrorMessage("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // contactInfo array - Company contact details
  const contactInfo = [
    { icon: <Mail className="h-5 w-5" />, label: "Email", value: "carelink317@gmail.com" },
    { icon: <Phone className="h-5 w-5" />, label: "Phone", value: "+233 55 729 7261" },
    { icon: <MapPin className="h-5 w-5" />, label: "Address", value: "Accra, Ghana" },
  ];

  // faqs array - Frequently asked questions
  const faqs = [
    { q: "How do I book a caregiver?", a: "Browse available caregivers, review their profiles, and book through our platform. You'll receive confirmation once accepted." },
    { q: "What payment methods do you accept?", a: "We accept credit cards, debit cards, mobile money, and bank transfers. All transactions are secured." },
    { q: "Can I cancel or reschedule a booking?", a: "Yes, you can cancel or reschedule up to 24 hours before the service. See our cancellation policy for details." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="section-padding bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container-main text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="section-padding">
        <div className="container-main">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="card-elevated p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Send us a Message</h2>
                
                {/* Success Message */}
                {submitStatus === "success" && (
                  <div className="mb-6 p-4 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2" role="status" aria-live="polite">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" aria-hidden="true" />
                    <p className="text-success">Thank you for your message! We'll get back to you soon.</p>
                  </div>
                )}

                {/* Error Message */}
                {submitStatus === "error" && (
                  <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2" role="alert" aria-live="assertive">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" aria-hidden="true" />
                    <p className="text-destructive">{errorMessage}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">Name <span aria-label="required">*</span></label>
                      <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-base"
                        placeholder="Your name"
                        required
                        disabled={isLoading}
                        aria-describedby="name-error"

                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">Email <span aria-label="required">*</span></label>
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-base"
                        placeholder="your@email.com"
                        required
                        disabled={isLoading}
                        aria-describedby="email-error"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">Subject <span aria-label="required">*</span></label>
                    <input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="input-base"
                      placeholder="How can we help?"
                      required
                      disabled={isLoading}
                      aria-describedby="subject-error"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">Message <span aria-label="required">*</span></label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="input-base min-h-[150px] resize-none"
                      placeholder="Tell us more..."
                      required
                      disabled={isLoading}
                      aria-describedby="message-error"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isLoading}>
                    {isLoading ? "Sending..." : <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>}
                  </Button>
                </form>
              </div>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Contact Information</h3>
                <div className="space-y-4">
                  {contactInfo.map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="font-medium text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Quick FAQs
                </h3>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index}>
                      <p className="font-medium text-foreground text-sm">{faq.q}</p>
                      <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
