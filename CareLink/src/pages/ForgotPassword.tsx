import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Get token from URL if user is coming from email link
  const tokenFromUrl = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");
  const userTypeFromUrl = searchParams.get("userType");

  // State for request password reset step
  const [email, setEmail] = useState(emailFromUrl || "");
  const [userType, setUserType] = useState<"family" | "caregiver">((userTypeFromUrl as "family" | "caregiver" | null) || "family");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"request" | "reset">(tokenFromUrl ? "reset" : "request");
  const [resetToken, setResetToken] = useState(tokenFromUrl || "");

  // State for reset password step
  const [resetEmail, setResetEmail] = useState(emailFromUrl || "");
  const [resetUserType, setResetUserType] = useState<"family" | "caregiver">((userTypeFromUrl as "family" | "caregiver" | null) || "family");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!email.trim()) {
        throw new Error("Email is required");
      }

      if (!userType) {
        throw new Error("Please select your account type");
      }

      const response = await userAPI.forgotPassword(email, userType);

      toast({
        title: "Success",
        description: "If an account with that email exists in the selected category, you will receive a password reset link",
      });

      // Move to reset step if we have a token (for development/testing)
      if (response.token) {
        setResetToken(response.token);
        setResetEmail(email);
        setResetUserType(userType);
        setStep("reset");
      } else {
        // In production, user will click link from email
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send reset link";
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!resetEmail.trim() || !resetToken.trim()) {
        throw new Error("Email and token are required");
      }

      if (!resetUserType) {
        throw new Error("User type is required");
      }

      if (!newPassword.trim()) {
        throw new Error("New password is required");
      }

      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      await userAPI.resetPassword(resetEmail, resetToken, newPassword, confirmPassword, resetUserType);

      setResetSuccess(true);
      toast({
        title: "Success",
        description: "Password reset successfully! Redirecting to login...",
      });

      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to reset password";
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

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-elevated p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Password Reset Successful</h1>
            <p className="text-muted-foreground mb-6">
              Your password has been reset successfully. Redirecting to login page...
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full"
              size="lg"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-2 mb-8 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="card-elevated p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-foreground">CareLink</span>
          </div>

          {step === "request" ? (
            <>
              <h1 className="text-2xl font-bold text-foreground text-center mb-2">Reset Your Password</h1>
              <p className="text-muted-foreground text-center mb-8">
                Enter your email address and we'll send you a link to reset your password
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestReset} className="space-y-5">
                <div>
                  <label htmlFor="userType" className="block text-sm font-medium text-foreground mb-2">
                    Account Type <span aria-label="required">*</span>
                  </label>
                  <select
                    id="userType"
                    value={userType}
                    onChange={(e) => setUserType(e.target.value as "family" | "caregiver")}
                    className="input-base w-full"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select your account type</option>
                    <option value="family">Family Member</option>
                    <option value="caregiver">Caregiver</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email Address <span aria-label="required">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-base pl-10"
                      placeholder="Enter your email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Remember your password?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground text-center mb-2">Set New Password</h1>
              <p className="text-muted-foreground text-center mb-8">
                Enter your new password below
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="email-display" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    id="email-display"
                    type="email"
                    value={resetEmail}
                    disabled
                    className="input-base bg-muted"
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-foreground mb-2">
                    New Password <span aria-label="required">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-base pr-12"
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      disabled={isLoading}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-2">
                    Confirm Password <span aria-label="required">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-base pr-12"
                      placeholder="Confirm new password"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Want to try again?{" "}
                  <button
                    onClick={() => {
                      setStep("request");
                      setResetToken("");
                      setEmail("");
                      setError("");
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Use different email
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
