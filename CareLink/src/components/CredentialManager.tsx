import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { credentialAPI } from "@/lib/api";
import { Upload, FileCheck, AlertCircle, Clock, XCircle, Trash2, Eye } from "lucide-react";

interface Credential {
  _id: string;
  credentialType: string;
  credentialName: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  fileName: string;
  verificationStatus: "pending" | "verified" | "rejected" | "expired";
  verificationNotes?: string;
  blockchainVerified?: boolean;
}

interface CredentialManagerProps {
  caregiverId: string;
  isOwnProfile: boolean;
}

export default function CredentialManager({ caregiverId, isOwnProfile }: CredentialManagerProps) {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    credentialType: "cpr-certification",
    credentialName: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    credentialNumber: "",
  });

  // Load credentials
  const loadCredentials = async () => {
    try {
      setLoading(true);
      const data = await credentialAPI.getCaregiverCredentials(caregiverId);
      setCredentials(data.credentials || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle form input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Upload credential
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }

    if (!formData.credentialName.trim()) {
      toast({
        title: "Error",
        description: "Please enter credential name",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const formDataObj = new FormData();
      formDataObj.append("credential", selectedFile);
      formDataObj.append("credentialType", formData.credentialType);
      formDataObj.append("credentialName", formData.credentialName);
      formDataObj.append("issuer", formData.issuer);
      formDataObj.append("issueDate", formData.issueDate);
      formDataObj.append("expiryDate", formData.expiryDate);
      formDataObj.append("credentialNumber", formData.credentialNumber);

      const result = await credentialAPI.upload(formDataObj);

      toast({
        title: "Success",
        description: "Credential uploaded successfully",
      });

      // Reload credentials
      loadCredentials();

      // Reset form
      setSelectedFile(null);
      setShowUploadForm(false);
      setFormData({
        credentialType: "cpr-certification",
        credentialName: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
        credentialNumber: "",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to upload credential",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete credential
  const handleDelete = async (credentialId: string) => {
    if (!window.confirm("Are you sure you want to delete this credential?")) {
      return;
    }

    try {
      await credentialAPI.deleteCredential(credentialId);
      toast({
        title: "Success",
        description: "Credential deleted successfully",
      });
      loadCredentials();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete credential",
        variant: "destructive",
      });
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <div className="flex items-center gap-2 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
            <FileCheck className="h-3 w-3" />
            Verified
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-2 px-2 py-1 bg-warning/10 text-warning rounded-full text-xs font-medium">
            <Clock className="h-3 w-3" />
            Pending Review
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-2 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Rejected
          </div>
        );
      case "expired":
        return (
          <div className="flex items-center gap-2 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            Expired
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Professional Credentials</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage your certifications and credentials
          </p>
        </div>
        {isOwnProfile && (
          <Button
            onClick={() => {
              setShowUploadForm(!showUploadForm);
              if (!showUploadForm) loadCredentials();
            }}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Add Credential
          </Button>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && isOwnProfile && (
        <Card className="p-6 bg-secondary/30 border-dashed">
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Credential Type <span className="text-destructive">*</span>
                </label>
                <select
                  name="credentialType"
                  value={formData.credentialType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="nursing-license">Nursing License</option>
                  <option value="cpr-certification">CPR Certification</option>
                  <option value="first-aid-certification">First Aid Certification</option>
                  <option value="background-check">Background Check</option>
                  <option value="health-screening">Health Screening</option>
                  <option value="training-certificate">Training Certificate</option>
                  <option value="degree">Degree</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Credential Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="credentialName"
                  value={formData.credentialName}
                  onChange={handleInputChange}
                  placeholder="e.g., CPR Certification 2024"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Issuer
                </label>
                <input
                  type="text"
                  name="issuer"
                  value={formData.issuer}
                  onChange={handleInputChange}
                  placeholder="e.g., Red Cross, Ministry of Health"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Credential Number
                </label>
                <input
                  type="text"
                  name="credentialNumber"
                  value={formData.credentialNumber}
                  onChange={handleInputChange}
                  placeholder="License/Certificate number"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Issue Date
                </label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Document <span className="text-destructive">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  id="credential-file"
                />
                <label htmlFor="credential-file" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {selectedFile ? selectedFile.name : "Click to upload or drag file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG, DOC, DOCX (max 10MB)
                  </p>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !selectedFile}>
                {uploading ? "Uploading..." : "Upload Credential"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Credentials List */}
      <div className="space-y-3">
        {credentials.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No credentials uploaded yet</p>
            {isOwnProfile && (
              <p className="text-xs text-muted-foreground mt-2">
                Upload your certifications to increase your profile credibility
              </p>
            )}
          </Card>
        ) : (
          credentials.map((credential) => (
            <Card key={credential._id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FileCheck className="h-5 w-5 text-primary flex-shrink-0" />
                    <h4 className="font-semibold text-foreground truncate">
                      {credential.credentialName}
                    </h4>
                    {getStatusBadge(credential.verificationStatus)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Type:</span> {credential.credentialType.replace(/-/g, " ")}
                    </div>
                    {credential.issuer && (
                      <div>
                        <span className="font-medium">Issuer:</span> {credential.issuer}
                      </div>
                    )}
                    {credential.issueDate && (
                      <div>
                        <span className="font-medium">Issued:</span>{" "}
                        {new Date(credential.issueDate).toLocaleDateString()}
                      </div>
                    )}
                    {credential.expiryDate && (
                      <div>
                        <span className="font-medium">Expires:</span>{" "}
                        {new Date(credential.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {credential.verificationStatus === "rejected" && credential.verificationNotes && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      <strong>Rejection reason:</strong> {credential.verificationNotes}
                    </div>
                  )}

                  {credential.blockchainVerified && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-success font-medium">
                      <FileCheck className="h-3 w-3" />
                      Blockchain Verified
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={credential.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-secondary rounded-md transition-colors"
                    title="View document"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </a>

                  {isOwnProfile && credential.verificationStatus !== "verified" && (
                    <button
                      onClick={() => handleDelete(credential._id)}
                      className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                      title="Delete credential"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
