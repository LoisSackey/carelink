import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader
} from "lucide-react";

interface ReceiptUploadProps {
  isEmbedded?: boolean;
}

const ReceiptUpload = ({ isEmbedded = false }: ReceiptUploadProps = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paymentMethod = searchParams.get("method") || "momo";
  const bookingId = searchParams.get("booking");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes("image") && !file.type.includes("pdf")) {
        toast({
          title: "Invalid File",
          description: "Please upload an image or PDF file",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a receipt to upload",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("bookingId", bookingId || "");
      formData.append("paymentMethod", paymentMethod);

      // Simulate file upload (in production, this would be an API call)
      // const response = await fetch("/api/upload-receipt", {
      //   method: "POST",
      //   body: formData
      // });

      // For now, simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Store receipt info in sessionStorage
      sessionStorage.setItem("receiptInfo", JSON.stringify({
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        bookingId,
        paymentMethod
      }));

      toast({
        title: "Receipt Uploaded!",
        description: "Your receipt has been submitted. Admin will verify it shortly.",
      });

      // mark payment flow so dashboard doesn't force login on return
      sessionStorage.setItem("fromPaymentFlow", "true");

      // Navigate to payment status pending page
      navigate(`/payment-status?booking=${bookingId}&method=${paymentMethod}&status=pending&receipt=true`);
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload Failed",
        description: "Failed to upload receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const methodLabel = paymentMethod === "momo" ? "Mobile Money" : "Bank Transfer";

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen bg-background"}>
      <section className={isEmbedded ? "w-full" : "section-padding"}>
        <div className={isEmbedded ? "w-full" : "container-main max-w-2xl"}>
          {/* Back Button */}
          {isEmbedded && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Upload Payment Receipt</h1>
            <p className="text-muted-foreground">Please upload a screenshot or photo of your {methodLabel} receipt</p>
          </div>

          {/* Upload Area */}
          <div className="card-elevated p-8">
            {!uploadedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-secondary rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, PDF (up to 5MB)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-900">File Selected</p>
                    <p className="text-sm text-green-700 mt-1">{uploadedFile.name}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Make sure your receipt shows:</p>
                <ul className="space-y-1 text-xs list-disc list-inside">
                  <li>Transaction/Reference number</li>
                  <li>Amount paid</li>
                  <li>Date and time of transaction</li>
                  <li>Clear and readable receipt</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                className="flex-1"
                disabled={!uploadedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Receipt
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 p-4 rounded-lg bg-secondary/50 text-sm text-muted-foreground text-center">
            <p>Your receipt will be verified by the caregiver. You'll receive a notification once it's approved.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReceiptUpload;
