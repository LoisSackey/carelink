import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { credentialAPI } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, FileText, Eye, Download } from "lucide-react";

interface Credential {
  _id: string;
  caregiverId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  credentialType: string;
  credentialName: string;
  issuer: string;
  fileUrl: string;
  fileName: string;
  verificationStatus: string;
  createdAt: string;
}

export default function AdminCredentialReview() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load pending credentials
  useEffect(() => {
    loadPendingCredentials();
  }, []);

  const loadPendingCredentials = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await credentialAPI.getPendingCredentials();
      setCredentials(Array.isArray(data?.credentials) ? data.credentials : []);
    } catch (err: any) {
      console.error("Failed to load pending credentials:", err);
      setError(err.message || "Failed to load credentials");
      toast({
        title: "Error",
        description: err.message || "Failed to load credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle verification
  const handleVerify = async (credentialId: string, status: "verified" | "rejected") => {
    if (status === "rejected" && !verificationNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      setVerifying(true);
      await credentialAPI.verifyCredential(credentialId, status, verificationNotes);

      toast({
        title: "Success",
        description: `Credential ${status} successfully`,
      });

      // Remove from list and reset selection
      setCredentials(credentials.filter(c => c._id !== credentialId));
      setSelectedCredential(null);
      setVerificationNotes("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to verify credential",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Handle file download
  const handleDownload = async (credentialId: string, fileName: string) => {
    try {
      setDownloading(true);
      const { blob, filename } = await credentialAPI.downloadCredentialFile(credentialId);

      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" text="Loading credentials..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <p className="text-sm text-muted-foreground">Please try again later.</p>
      </Card>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-success/30 mx-auto mb-3" />
        <p className="text-foreground font-medium mb-2">All caught up!</p>
        <p className="text-muted-foreground">No pending credentials to review</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Credentials List */}
      <div className="lg:col-span-2">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Pending Credentials ({credentials.length})
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Review and verify caregiver certifications
          </p>
        </div>

        <div className="space-y-3">
          {credentials.map((credential) => (
            <Card
              key={credential._id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedCredential?._id === credential._id
                  ? "border-primary ring-1 ring-primary"
                  : ""
              }`}
              onClick={() => setSelectedCredential(credential)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <h4 className="font-semibold text-foreground truncate">
                      {credential.credentialName || "Untitled"}
                    </h4>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Caregiver:</span> {credential.caregiverId?.name || "(unknown)"}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      {(credential.credentialType || "").replace(/-/g, " ")}
                    </div>
                    <div>
                      <span className="font-medium">Issued:</span>{" "}
                      {credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : "-"}
                    </div>
                  </div>
                </div>

                <Clock className="h-5 w-5 text-warning flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Details & Actions */}
      {selectedCredential && (
        <Card className="p-6 h-fit sticky top-4">
          <h3 className="font-semibold text-foreground mb-4">Review Details</h3>

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Credential</p>
              <p className="text-sm text-foreground font-medium mt-1">
                {selectedCredential.credentialName}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Caregiver</p>
              <p className="text-sm text-foreground font-medium">{selectedCredential.caregiverId?.name || "(unknown)"}</p>
              <p className="text-xs text-muted-foreground">{selectedCredential.caregiverId?.email || ""}</p>
              <p className="text-xs text-muted-foreground">{selectedCredential.caregiverId?.phone || ""}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Document</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {selectedCredential.fileName || ""}
              </p>
              <div className="flex gap-2 mt-2">
                <a
                  href={selectedCredential.fileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Eye className="h-3 w-3" />
                  View
                </a>
                <button
                  onClick={() => handleDownload(selectedCredential._id, selectedCredential.fileName)}
                  disabled={downloading}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  <Download className="h-3 w-3" />
                  {downloading ? "Downloading..." : "Download"}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Type</p>
              <p className="text-sm text-foreground mt-1 capitalize">
                {(selectedCredential.credentialType || "").replace(/-/g, " ")}
              </p>
            </div>
          </div>

          {/* Rejection Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Verification Notes
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Reason for rejection (if rejecting)..."
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required if rejecting credential
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVerify(selectedCredential._id, "rejected")}
              disabled={verifying}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => handleVerify(selectedCredential._id, "verified")}
              disabled={verifying}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Verify
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
