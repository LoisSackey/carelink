import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { credentialAPI } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
  Filter,
  Loader2,
  Trash2,
} from "lucide-react";

interface Credential {
  _id: string;
  caregiverId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    verified: boolean;
  };
  credentialType: string;
  credentialName: string;
  issuer: string;
  fileName: string;
  verificationStatus: string;
  createdAt: string;
  downloadUrl: string;
}

type VerificationFilter = "all" | "verified" | "pending" | "rejected";

export default function AdminCredentialBrowser() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<VerificationFilter>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load all credentials
  useEffect(() => {
    loadCredentials();
  }, [filter]);

  const loadCredentials = async () => {
    try {
      setError(null);
      setLoading(true);
      const filterObj: any = {};
      if (filter !== "all") {
        filterObj.status = filter;
      }
      const data = await credentialAPI.getAllCredentials(filterObj);
      // defensive: ensure we always have an array
      setCredentials(Array.isArray(data?.credentials) ? data.credentials : []);
    } catch (err: any) {
      console.error("Error loading credentials:", err);
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

  // Handle file download
  const handleDownload = async (credentialId: string, fileName: string) => {
    try {
      setDownloading(credentialId);
      const { blob, filename } = await credentialAPI.downloadCredentialFile(
        credentialId
      );

      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
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
      setDownloading(null);
    }
  };

  // Handle credential deletion
  const handleDeleteClick = (credential: Credential) => {
    setSelectedCredential(credential);
    setDeleteDialogOpen(true);
  };

  // Confirm deletion
  const handleConfirmDelete = async () => {
    if (!selectedCredential) return;

    try {
      setDeleting(selectedCredential._id);
      await credentialAPI.deleteCredential(selectedCredential._id);

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      // Reload credentials
      await loadCredentials();
      setDeleteDialogOpen(false);
      setSelectedCredential(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-success/10 text-success";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      case "pending":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
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
        <p className="text-sm text-muted-foreground">Try refreshing or contact support.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          All ({credentials.length})
        </Button>
        <Button
          variant={filter === "verified" ? "default" : "outline"}
          onClick={() => setFilter("verified")}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Verified (
          {credentials.filter((c) => c.verificationStatus === "verified").length}
          )
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Pending (
          {credentials.filter((c) => c.verificationStatus === "pending").length}
          )
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          onClick={() => setFilter("rejected")}
          className="gap-2"
        >
          <XCircle className="h-4 w-4" />
          Rejected (
          {credentials.filter((c) => c.verificationStatus === "rejected").length}
          )
        </Button>
      </div>

      {/* Credentials Table */}
      {credentials.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No credentials found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {credentials.map((credential) => (
            <Card
              key={credential._id}
              className="p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusIcon(credential.verificationStatus)}
                    <div>
                      <h3 className="font-semibold text-foreground truncate">
                        {credential.credentialName || "Untitled"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {(credential.credentialType || "").replace(/-/g, " ")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">
                        Caregiver:
                      </span>{" "}
                      {credential.caregiverId?.name || "(unknown)"}
                      {credential.caregiverId?.verified && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-1 rounded">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Issuer:
                      </span>{" "}
                      {credential.issuer || "(unknown)"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">File:</span>{" "}
                      {credential.fileName}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Uploaded:
                      </span>{" "}
                      {credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : "-"}
                    </div>
                  </div>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                      credential.verificationStatus
                    )}`}
                  >
                    {credential.verificationStatus}
                  </span>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDownload(
                          credential._id,
                          credential.fileName
                        )
                      }
                      disabled={downloading === credential._id}
                      className="gap-2"
                    >
                      {downloading === credential._id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(credential)}
                      disabled={deleting === credential._id}
                      className="gap-2"
                    >
                      {deleting === credential._id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
              {selectedCredential && (
                <>
                  <br />
                  <br />
                  <strong>Document:</strong> {selectedCredential.credentialName || "(unknown)"}
                  <br />
                  <strong>Caregiver:</strong> {selectedCredential.caregiverId?.name || "(unknown)"}
                  <br />
                  <strong>File:</strong> {selectedCredential.fileName || "-"}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
