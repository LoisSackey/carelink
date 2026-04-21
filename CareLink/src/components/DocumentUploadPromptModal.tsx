import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle2, X } from "lucide-react";
import { credentialAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadPromptModalProps {
  isOpen: boolean;
  caregiverId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentUploadPromptModal({
  isOpen,
  caregiverId,
  onClose,
  onSuccess,
}: DocumentUploadPromptModalProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    credentialType: "cpr-certification",
    credentialName: "",
    issuer: "",
  });
  const [uploadComplete, setUploadComplete] = useState(false);

  const credentialTypes = [
    { value: "cpr-certification", label: "CPR Certification" },
    { value: "nursing-license", label: "Nursing License" },
    { value: "first-aid", label: "First Aid Training" },
    { value: "background-check", label: "Background Check" },
    { value: "health-screening", label: "Health Screening" },
    { value: "degree", label: "Degree" },
    { value: "other", label: "Other" },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one document",
        variant: "destructive",
      });
      return;
    }

    if (!formData.credentialName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a credential name",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload each file
      for (const file of uploadedFiles) {
        const formDataObj = new FormData();
        formDataObj.append("credential", file);
        formDataObj.append("credentialType", formData.credentialType);
        formDataObj.append("credentialName", formData.credentialName);
        formDataObj.append("issuer", formData.issuer);

        await credentialAPI.upload(formDataObj);
      }

      toast({
        title: "Success",
        description: `${uploadedFiles.length} document(s) uploaded successfully! Admin will review and approve shortly.`,
      });

      setUploadComplete(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to upload documents",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  if (uploadComplete) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-background rounded-lg p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Documents Uploaded Successfully!
          </h2>
          <p className="text-muted-foreground mb-6">
            Your documents have been submitted for admin verification. You'll be notified once they're approved.
          </p>
          <Button onClick={() => { onSuccess(); onClose(); }} className="w-full">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-background rounded-lg p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Upload Your Documents
              </h2>
              <p className="text-sm text-muted-foreground">
                Professional verification required for your account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alert */}
        <div className="mb-6 p-4 rounded-lg bg-info/5 border border-info/20 flex gap-3">
          <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Document verification required
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload professional certificates, licenses, or credentials. Admin will review and verify your documents for account approval.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Credential Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Document Type <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.credentialType}
              onChange={(e) =>
                setFormData({ ...formData, credentialType: e.target.value })
              }
              className="input-base w-full"
              required
            >
              {credentialTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Credential Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Document Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.credentialName}
              onChange={(e) =>
                setFormData({ ...formData, credentialName: e.target.value })
              }
              placeholder="e.g., CPR Certification 2024"
              className="input-base w-full"
              required
            />
          </div>

          {/* Issuer */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Issuing Organization
            </label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) =>
                setFormData({ ...formData, issuer: e.target.value })
              }
              placeholder="e.g., Red Cross, Nursing Board"
              className="input-base w-full"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Upload Documents <span className="text-destructive">*</span>
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                multiple
                className="hidden"
                id="document-upload"
              />
              <label htmlFor="document-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Click to upload or drag files
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG, DOC, DOCX (max 10MB each)
                </p>
              </label>
            </div>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Selected Documents ({uploadedFiles.length})
              </label>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Upload className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={uploading}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              type="submit"
              disabled={uploading || uploadedFiles.length === 0}
              className="flex-1"
            >
              {uploading ? "Uploading..." : "Upload Documents"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
