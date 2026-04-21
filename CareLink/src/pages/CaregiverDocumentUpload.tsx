import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Upload, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { credentialAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const CaregiverDocumentUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fromSignup = (location.state as any)?.fromSignup || false;
  const tempToken = (location.state as any)?.tempToken || null;
  const tempUserId = (location.state as any)?.userId || null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...newFiles]);
      setError("");
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one document to upload");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      // determine user id for upload
      const userId = localStorage.getItem("userId") || tempUserId;
      if (!userId) {
        setError("User not found. Please log in again.");
        return;
      }

      // decide token to use for upload (allow temporary token from signup)
      const uploadToken = tempToken || localStorage.getItem("token");

      if (!uploadToken) {
        setError("Authentication token missing. Please log in again or restart the signup process.");
        return;
      }

      // Upload each file
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("credential", file);
        formData.append("credentialType", "other");
        formData.append("credentialName", file.name.replace(/\.[^/.]+$/, "")); // Remove extension
        formData.append("issuer", "Self-Verified");

        await credentialAPI.upload(formData, uploadToken);
      }

      setUploadSuccess(true);
      toast({
        title: "✓ Documents Uploaded Successfully!",
        description: "Your documents have been submitted for admin review. You'll be notified once approved.",
      });

      // After signup flow we want to clear any temporary credentials and send user to login
      if (fromSignup) {
        // remove any auth info that might have been saved accidentally
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userType");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setTimeout(() => {
          navigate("/caregiver-dashboard");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload documents. Please try again.");
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload documents",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Skipping upload is no longer allowed during signup. Keep handler for compatibility but prevent navigation.
  const handleSkip = () => {
    toast({
      title: "Upload Required",
      description: "Uploading your professional documents is required to complete caregiver registration.",
    });
  };

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-8 py-20">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Documents Submitted!</h1>
              <p className="text-muted-foreground text-lg">Your documents are now under review by our admin team</p>
            </div>

            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex gap-3 p-3 rounded-lg bg-primary/5">
                <span className="text-primary font-bold">1</span>
                <div>
                  <p className="font-medium text-foreground">Documents Received</p>
                  <p className="text-sm text-muted-foreground">Your files are safe with us</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-primary/5">
                <span className="text-primary font-bold">2</span>
                <div>
                  <p className="font-medium text-foreground">Under Review</p>
                  <p className="text-sm text-muted-foreground">Admin team is verifying your credentials</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-primary/5">
                <span className="text-primary font-bold">3</span>
                <div>
                  <p className="font-medium text-foreground">Approval Notification</p>
                  <p className="text-sm text-muted-foreground">You'll receive an email within 24-48 hours</p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
              Redirecting to your profile setup in a moment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-foreground">CareLink</span>
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-2xl shadow-lg p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Upload Your Documents</h1>
            <p className="text-muted-foreground">
              {fromSignup 
                ? "Great! Now please upload your professional credentials so families can verify your qualifications."
                : "Your documents help families trust your qualifications and experience."
              }
            </p>
          </div>

          {/* Document Upload Area */}
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Upload Professional Documents</p>
              <p className="text-sm text-muted-foreground mb-6">
                Certifications, licenses, degrees, or credentials (PDF, JPG, PNG - max 10MB each)
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                id="doc-upload"
              />
              <Button type="button" variant="outline" asChild>
                <label htmlFor="doc-upload" className="cursor-pointer">
                  Choose Files
                </label>
              </Button>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Selected Documents ({selectedFiles.length}):</p>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4 space-y-2">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Why we need this</p>
                  <p className="text-sm text-muted-foreground">
                    Professional verification helps build trust with families and ensures quality care. Your documents will be reviewed within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="flex-1 gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload Documents
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Helper Text */}
            <p className="text-center text-xs text-muted-foreground">
              {fromSignup
                ? "After uploading, your account will be pending admin approval. You can check your dashboard while we review your documents."
                : "After uploading, you can continue setting up your caregiver profile."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverDocumentUpload;
