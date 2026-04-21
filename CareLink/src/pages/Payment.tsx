// Import React hooks
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
// Import UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner";
// Import icons
import { 
  CreditCard,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Loader,
  AlertCircle
} from "lucide-react";
// Import API
import { bookingAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface PaymentProps {
  isEmbedded?: boolean;
}

// Payment component - Display payment options and process payment
const Payment = ({ isEmbedded = false }: PaymentProps = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "bank">("momo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactionId, setTransactionId] = useState("");

  // Get booking data
  useEffect(() => {
    const loadBookingData = async () => {
      if (bookingId) {
        try {
          // Fetch current booking data from API to get latest status
          const booking = await bookingAPI.getById(bookingId);
          setBookingData(booking);
        } catch (error) {
          console.error("Failed to load booking data:", error);
          // Fallback to sessionStorage if API fails
          const bookingInfo = JSON.parse(sessionStorage.getItem("bookingInfo") || "{}");
          setBookingData(bookingInfo);
        }
      }
      setLoading(false);
    };

    loadBookingData();
  }, [bookingId]);

  const paymentOptions = [
    {
      id: "momo",
      name: "Mobile Money",
      description: `Pay via MTN Mobile Money or Vodafone Cash${bookingData?.caregiverPhone ? ` (send to ${bookingData.caregiverPhone})` : ""}`,
      icon: <Smartphone className="h-8 w-8" />,
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    },
    {
      id: "bank",
      name: "Bank Transfer",
      description: "Transfer directly to the caregiver's bank account",
      icon: <CreditCard className="h-5 w-5 text-primary" />,
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
  ];

  const handlePaymentSubmit = async () => {
    if (paymentMethod === "bank") {
      if (!transactionId.trim()) {
        toast({
          title: "Error",
          description: "Please enter transaction ID or reference number",
          variant: "destructive",
        });
        return;
      }
    } else if (paymentMethod === "momo") {
      if (!transactionId.trim()) {
        toast({
          title: "Error",
          description: "Please enter transaction ID or reference number",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsProcessing(true);

      // ensure booking has been accepted before proceeding
      if (bookingData?.status === 'pending') {
        toast({
          title: 'Cannot Pay Yet',
          description: 'The caregiver has not accepted the booking request.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Create payment record
      const paymentData = {
        bookingId,
        method: paymentMethod,
        amount: bookingData?.totalPrice || 500,
        transactionId: transactionId,
        status: "completed",
        timestamp: new Date(),
      };

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "✓ Payment Processed",
        description: `Your ${paymentMethod === "bank" ? "bank transfer" : "mobile money"} payment has been recorded. The caregiver will confirm receipt.`,
      });

      // mark that we're in the payment flow so the dashboard won't kick us to login
      sessionStorage.setItem("fromPaymentFlow", "true");

      // Redirect to payment success confirmation page with booking details
      navigate(`/payment-success?booking=${bookingId || ""}&method=${paymentMethod}`);
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteClick = async () => {
    // open styled confirm dialog instead
    setConfirmOpen(true);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  if (loading) {
    return (
      <div className={isEmbedded ? "w-full" : "min-h-screen bg-background"}>
        <div className={isEmbedded ? "w-full" : "container-main"} style={{ padding: isEmbedded ? "24px" : "32px 16px" }}>
          <LoadingSpinner size="md" text="Loading payment options..." />
        </div>
      </div>
    );
  }

  // Check if booking is approved for payment
  if (bookingData && bookingData.status === 'pending') {
    return (
      <div className={isEmbedded ? "w-full" : "min-h-screen bg-background"}>
        <div className={isEmbedded ? "w-full" : "container-main"} style={{ padding: isEmbedded ? "24px" : "32px 16px" }}>
          <div className="max-w-md mx-auto text-center py-12">
            <AlertCircle className="h-16 w-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Payment Not Available Yet</h2>
            <p className="text-muted-foreground mb-6">
              The caregiver has not accepted your booking request. You will be notified when payment becomes available.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen bg-background"}>
      <div className={isEmbedded ? "w-full" : "container-main"} style={{ padding: isEmbedded ? "24px" : "32px 16px" }}>
        {/* Header - Only show on standalone */}
        {!isEmbedded && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment</h1>
            <p className="text-slate-600">Choose your payment method</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Payment Options */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Select Payment Method</h2>
            
            {paymentOptions.map((option) => (
              <Card
                key={option.id}
                className={`cursor-pointer border-2 transition-all ${
                  paymentMethod === option.id
                    ? "border-primary bg-primary/5"
                    : "border-slate-200"
                }`}
                onClick={() => setPaymentMethod(option.id as "momo" | "bank")}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg text-primary ${option.color}`}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{option.name}</h3>
                      <p className="text-sm text-slate-600">{option.description}</p>
                    </div>
                    {paymentMethod === option.id && (
                      <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Mobile Money Form */}
            {paymentMethod === "momo" && (
              <Card className="border-slate-200 bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Mobile Money Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transaction ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Transaction ID / Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter mobile money transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700">
                      After sending money via mobile money, enter the transaction ID from your SMS confirmation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bank Transfer Form */}
            {paymentMethod === "bank" && (
              <Card className="border-slate-200 bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Bank Transfer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transaction ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Transaction ID / Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter bank transaction reference"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      After making the bank transfer, enter the transaction reference number from your bank statement.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobile Money Reference */}
            {paymentMethod === "momo" && bookingData?.caregiverPhone && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-900">
                  Please send mobile money to: <strong>{bookingData.caregiverPhone}</strong>
                </p>
              </div>
            )}
            {paymentMethod === "momo" && (
              <Card className="border-slate-200 bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base">Mobile Money Reference</CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    type="text"
                    placeholder="Enter Mobile Money reference..."
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-slate-600 mt-2">
                    You will receive a prompt on your phone. Enter the reference number here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 pb-4 border-b border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Service Fee</span>
                    <span className="font-semibold">GH₵{bookingData?.totalPrice || 500}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Platform Fee</span>
                    <span className="font-semibold">GH₵0</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-primary">GH₵{bookingData?.totalPrice || 500}</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    {/* Note removed as requested */}
                  </p>
                </div>

                <Button
                  onClick={handleCompleteClick}
                  disabled={
                    isProcessing ||
                    !transactionId.trim()
                  }
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>Complete Payment</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Styled confirmation dialog for completing payment */}
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to complete this payment of <strong>GH₵{bookingData?.totalPrice || 500}</strong>? This will record your payment and notify the caregiver.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center justify-end gap-2">
                      <AlertDialogCancel className="mr-2">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          setConfirmOpen(false);
                          await handlePaymentSubmit();
                        }}
                      >
                        Yes, complete payment
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>

                <p className="text-xs text-slate-600 text-center">
                  Your payment information is secure and encrypted.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
