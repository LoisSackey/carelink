import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Users, Briefcase, Shield, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const LoginSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <section className="flex-1 section-padding">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Welcome Back
            </h1>
            <p className="text-lg text-muted-foreground">
              Select your role to sign in to your account
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Family Login */}
            <Link to="/family-login" className="group">
              <div className="card-elevated p-8 h-full hover-lift transition-all cursor-pointer">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Users className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Family</h2>
                <p className="text-muted-foreground mb-6">
                  Find and book verified caregivers for your loved ones
                </p>
                <div className="flex items-center gap-2 text-primary group-hover:translate-x-1 transition-transform">
                  <span className="font-medium">Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Caregiver Login */}
            <Link to="/caregiver-login" className="group">
              <div className="card-elevated p-8 h-full hover-lift transition-all cursor-pointer">
                <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <Briefcase className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Caregiver</h2>
                <p className="text-muted-foreground mb-6">
                  Manage your profile and find care opportunities
                </p>
                <div className="flex items-center gap-2 text-accent group-hover:translate-x-1 transition-transform">
                  <span className="font-medium">Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Admin Login */}
            <Link to="/admin-login" className="group">
              <div className="card-elevated p-8 h-full hover-lift transition-all cursor-pointer">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6 group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                  <Shield className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Admin</h2>
                <p className="text-muted-foreground mb-6">
                  Manage platform users and approvals
                </p>
                <div className="flex items-center gap-2 text-destructive group-hover:translate-x-1 transition-transform">
                  <span className="font-medium">Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Don't have an account?
            </p>
            <Button variant="outline" size="lg" asChild>
              <Link to="/signup">Create an Account</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LoginSelection;
