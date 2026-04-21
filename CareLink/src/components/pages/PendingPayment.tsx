import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Smartphone,
  CreditCard
} from "lucide-react";

interface PendingPaymentProps {
  isEmbedded?: boolean;
}

const PendingPayment = ({ isEmbedded = false }: PendingPaymentProps = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [receiptInfo, setReceiptInfo] = useState<any>(null);
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const paymentMethod = searchParams.get("method") || "momo";
  const bookingId = searchParams.get("booking");

  useEffect(() => {
    // Get receipt and booking info from sessionStorage
    const receipt = JSON.parse(sessionStorage.getItem("receiptInfo") || "{}");
    const booking = JSON.parse(sessionStorage.getItem("bookingInfo") || "{}");
    setReceiptInfo(receipt);
    setBookingInfo(booking);
  }, []);

  const methodLabel = paymentMethod === "momo" ? "Mobile Money" : "Bank Transfer";
  const methodIcon = paymentMethod === "momo" ? 
    <Smartphone className="h-16 w-16 text-orange-500" /> : 
    <CreditCard className="h-16 w-16 text-blue-500" />;

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
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-yellow-50 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-yellow-600 animate-spin" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Payment Pending</h1>
            <p className="text-muted-foreground">Waiting for caregiver approval</p>
          </div>

          {/* Status Card */}
          <div className="card-elevated p-8 mb-6">
            {/* Payment Method */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 mb-6">
              <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                {methodIcon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-semibold text-foreground">{methodLabel}</p>
              </div>
            </div>

            {/* Receipt Details */}
            {receiptInfo?.fileName && (
              <div className="mb-6 p-4 rounded-lg border border-secondary bg-secondary/30">
                <p className="text-sm font-semibold text-foreground mb-3">Receipt Information</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Name</span>
                    <span className="text-foreground font-medium">{receiptInfo.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Size</span>
                    <span className="text-foreground font-medium">{(receiptInfo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded At</span>
                    <span className="text-foreground font-medium">
                      {new Date(receiptInfo.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Booking Details */}
            {bookingInfo?.caregiver && (
              <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm font-semibold text-foreground mb-3">Booking Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caregiver</span>
                    <span className="text-foreground font-medium">{bookingInfo.caregiver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-foreground font-bold">GH₵{bookingInfo.totalPrice}</span>
                  </div>
                  {bookingInfo.dates && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number of Days</span>
                      <span className="text-foreground font-medium">{bookingInfo.dates.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="space-y-1 text-xs list-disc list-inside">
                  <li>Your receipt is being reviewed by {bookingInfo?.caregiver || "the caregiver"}</li>
                  <li>You'll receive a notification once they approve the payment</li>
                  <li>Your booking will be confirmed after approval</li>
                  <li>Typically approved within a few hours</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card-elevated p-8 mb-6">
            <h3 className="font-semibold text-foreground mb-6">Payment Status</h3>
            <div className="space-y-4">
              {/* Step 1: Receipt Uploaded */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="w-1 h-12 bg-primary mt-2"></div>
                </div>
                <div className="pb-4">
                  <p className="font-semibold text-foreground">Receipt Uploaded</p>
                  <p className="text-sm text-muted-foreground">Your payment receipt has been submitted</p>
                </div>
              </div>

              {/* Step 2: Under Review */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-yellow-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="w-1 h-12 bg-secondary mt-2"></div>
                </div>
                <div className="pb-4">
                  <p className="font-semibold text-foreground">Under Review</p>
                  <p className="text-sm text-muted-foreground">Caregiver is reviewing your receipt</p>
                </div>
              </div>

              {/* Step 3: Approved (Disabled) */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center flex-shrink-0 opacity-50">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground opacity-50">Payment Approved</p>
                  <p className="text-sm text-muted-foreground">You'll be notified when approved</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/family-dashboard")}
              className="flex-1"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={() => navigate("/family-dashboard")}
              className="flex-1"
            >
              Continue
            </Button>
          </div>

          {/* Footer Note */}
          <div className="mt-8 p-4 rounded-lg bg-secondary/50 text-sm text-muted-foreground text-center">
            <p>You can check the status of your payments anytime in your dashboard.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PendingPayment;
