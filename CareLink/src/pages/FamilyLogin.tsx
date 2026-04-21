import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Eye, EyeOff, ArrowLeft, Chrome } from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { GoogleLogin } from "@react-oauth/google";

const FamilyLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await userAPI.googleAuth(credentialResponse.credential, 'family');

      if (response.user.userType !== 'family') {
        setError("This Google account is registered as a " + response.user.userType + " account. Please use the correct login page.");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userId", response.user.id);
      localStorage.setItem("userType", response.user.userType);
      // Store profile picture if available
      if (response.user.profilePicture) {
        localStorage.setItem("profilePicture", response.user.profilePicture);
      }

      toast({
        title: "Success",
        description: "Logged in with Google successfully!",
      });

      navigate("/family-dashboard");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // clear any previous auth state
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userType");

    setError("");
    setIsLoading(true);

    try {
      const response = await userAPI.login({
        email: formData.email,
        password: formData.password
      });

      // Check if user is family type
      if (response.user.userType !== 'family') {
        setError("This account is not registered as a Family account. Please use the correct login page.");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userId", response.user.id);
      localStorage.setItem("userType", response.user.userType);

      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      navigate("/family-dashboard");
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 mb-8 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold text-foreground">CareLink</span>
        </Link>

        <div className="card-elevated p-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">Family Login</h1>
          <p className="text-muted-foreground text-center mb-8">Find a caregiver for your loved ones</p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email or Phone <span aria-label="required">*</span>
              </label>
              <input
                id="email"
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-base"
                placeholder="Enter your email or phone"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password <span aria-label="required">*</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-base pr-12"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
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

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">Don't have an account? <Link to="/signup/family" className="text-primary hover:underline">Sign up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyLogin;
