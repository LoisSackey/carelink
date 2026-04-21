import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const CaregiverLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // always clear previous authentication before logging in again
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

      // Check if user is caregiver type
      if (response.user.userType !== 'caregiver') {
        setError("This account is not registered as a Caregiver account. Please use the correct login page.");
        setIsLoading(false);
        return;
      }

      // Check if caregiver is approved
      if (!response.user.approved) {
        setError("Your caregiver account is pending approval. Please check back later.");
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

      navigate("/caregiver-dashboard");
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
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 mb-8 text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold text-foreground">CareLink</span>
        </Link>

        <div className="card-elevated p-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">Caregiver Login</h1>
          <p className="text-muted-foreground text-center mb-8">Manage your caregiver profile and bookings</p>

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
                <Link to="/forgot-password" className="text-sm text-accent hover:underline">
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
              variant="secondary"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>


          <div className="mt-6 text-center">
            <p className="text-muted-foreground">Don't have an account? <Link to="/signup/caregiver" className="text-accent hover:underline">Sign up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverLogin;
