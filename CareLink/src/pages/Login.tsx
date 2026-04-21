// Import React hooks for state management
import { useState } from "react";
// Import Link component for navigation between pages
import { Link, useNavigate } from "react-router-dom";
// Import custom Button UI component
import { Button } from "@/components/ui/button";
// Import Heart icon for logo and Eye/EyeOff icons for password visibility toggle
import { Heart, Eye, EyeOff, LogIn } from "lucide-react";
// Import API client for backend communication
import { userAPI } from "@/lib/api";
// Import toast notifications for user feedback
import { useToast } from "@/hooks/use-toast";
// Import Google OAuth
import { GoogleLogin } from "@react-oauth/google";

// Main Login page component
const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State to toggle between showing/hiding password
  const [showPassword, setShowPassword] = useState(false);
  // State to store form input values (email and password)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  // State to track loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      // Try family first
      const response = await userAPI.googleAuth(credentialResponse.credential, 'family');

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userId", response.user.id);
      localStorage.setItem("userType", response.user.userType);

      toast({
        title: "Success",
        description: "Logged in with Google successfully!",
      });

      // Redirect based on user type
      if (response.user.userType === "caregiver") {
        navigate("/caregiver-dashboard");
      } else if (response.user.userType === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/family-dashboard");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Google login failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
    toast({
      title: "Error",
      description: "Google login failed",
      variant: "destructive",
    });
  };

  // Handle form submission when user clicks login button
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await userAPI.login({
        email: formData.email,
        password: formData.password
      });

      // Store token in localStorage
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userId", response.user.id);
      localStorage.setItem("userType", response.user.userType);

      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      // Redirect based on user type
      if (response.user.userType === "caregiver") {
        navigate("/caregiver-dashboard");
      } else if (response.user.userType === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/family-dashboard");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Login failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Main container: Full screen with gradient background, centered content with padding
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      {/* Card container: Maximum width of 28rem for responsive design */}
      <div className="w-full max-w-md">
        {/* Logo section: Clickable link that navigates to home page */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          {/* Icon container: Rounded background with primary color and Heart icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" />
          </div>
          {/* App name text: Bold, large font in foreground color */}
          <span className="text-2xl font-bold text-foreground">CareLink</span>
        </Link>

        {/* Login form card: Elevated shadow, padding, and rounded corners */}
        <div className="card-elevated p-8">
          {/* Main heading: Centered, large, bold text */}
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">Welcome Back</h1>
          {/* Subheading: Muted gray text, centered, with margin below */}
          <p className="text-muted-foreground text-center mb-8">Sign in to your account</p>

          {/* Form element: Handles submission and creates vertical spacing between fields */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email/Phone input field container */}
            <div>
              {/* Label text: Small font, medium weight, displayed as block element */}
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email or Phone <span aria-label="required">*</span>
              </label>
              {/* Text input: Takes email or phone, updates state on change, required field */}
              <input
                id="email"
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-base"
                placeholder="Enter your email or phone"
                required
                disabled={isLoading}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            {/* Password field container */}
            <div>
              {/* Header row: Flex layout with label on left and forgot password link on right */}
              <div className="flex items-center justify-between mb-2">
                {/* Password label: Small font, medium weight */}
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password <span aria-label="required">*</span>
                </label>
                {/* Link to forgot password page: Primary color, underlines on hover */}
                <Link to="/forgot-password" className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1">
                  Forgot password?
                </Link>
              </div>
              {/* Relative container for password input and toggle button */}
              <div className="relative">
                {/* Password input: Toggles between text and password type, has right padding for button */}
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-base pr-12"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  aria-describedby={error ? "login-error" : undefined}
                />
                {/* Toggle password visibility button: Icon button positioned absolutely on right */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {/* Conditionally render Eye or EyeOff icon based on showPassword state */}
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Error message display */}
            {error && (
              <div id="login-error" className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm" role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              <LogIn className="h-4 w-4" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              width="100%"
            />
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Quick access</span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => navigate("/family-login")}
                className="p-4 rounded-lg border border-border bg-secondary/50 hover:bg-secondary hover:border-primary transition-all duration-200 text-center group"
              >
                <p className="text-muted-foreground mb-2 text-xs group-hover:text-primary transition-colors font-medium">Family</p>
              </button>
              <button
                type="button"
                onClick={() => navigate("/caregiver-login")}
                className="p-4 rounded-lg border border-border bg-secondary/50 hover:bg-secondary hover:border-primary transition-all duration-200 text-center group"
              >
                <p className="text-muted-foreground mb-2 text-xs group-hover:text-primary transition-colors font-medium">Caregiver</p>
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin-login")}
                className="p-4 rounded-lg border border-border bg-secondary/50 hover:bg-secondary hover:border-primary transition-all duration-200 text-center group"
              >
                <p className="text-muted-foreground mb-2 text-xs group-hover:text-primary transition-colors font-medium">Admin</p>
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
