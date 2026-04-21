import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { bookingAPI } from "@/lib/api";
import { CreditCard, DollarSign, Upload, AlertCircle } from "lucide-react";

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (paymentData: any) => void;
  bookingId: string;
  amount: number;
  familyName?: string;
}

export const PaymentForm = ({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  amount,
  familyName = "Family",
}: PaymentFormProps) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "momo" | "bank">("cash");
  const [transactionId, setTransactionId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"method" | "receipt">("method");

  const handlePaymentMethodSelect = (method: "cash" | "momo" | "bank") => {
    setPaymentMethod(method);
    if (method === "cash") {
      // For cash, proceed directly
      handlePaymentSubmit();
    } else {
      // For online payments, move to receipt step
      setStep("receipt");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only JPEG, PNG, or PDF files allowed",
          variant: "destructive",
        });
        return;
      }

      setReceiptFile(file);
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      setIsLoading(true);

      // double-check booking status before submitting
      const bookingDetails = await bookingAPI.getById(bookingId);
      if (bookingDetails.status === 'pending') {
        toast({
          title: 'Cannot Pay Yet',
          description: 'The caregiver has not accepted the booking. Please wait until they confirm.',
          variant: 'destructive',
        });
        return;
      }
      if (bookingDetails.status === 'cancelled') {
        toast({
          title: 'Booking Cancelled',
          description: 'This booking has been cancelled.',
          variant: 'destructive',
        });
        return;
      }

      // Update payment status
      await bookingAPI.updatePayment(bookingId, {
        paymentMethod,
        transactionId: transactionId || null,
        paymentStatus: paymentMethod === "cash" ? "pending" : "pending",
      });

      // Upload receipt if provided
      if (receiptFile && paymentMethod !== "cash") {
        await bookingAPI.uploadReceipt(bookingId, receiptFile);
      }

      toast({
        title: "Success",
        description: `Payment method ${paymentMethod} has been recorded. ${
          paymentMethod === "cash"
            ? "Please arrange cash payment with the caregiver."
            : "Receipt uploaded successfully."
        }`,
      });

      onSuccess?.({
        paymentMethod,
        transactionId,
        receiptUrl: receiptFile ? true : false,
      });

      // Reset form
      setStep("method");
      setPaymentMethod("cash");
      setTransactionId("");
      setReceiptFile(null);
      onClose();
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Method
          </DialogTitle>
          <DialogDescription>
            Total Amount: <span className="font-semibold text-foreground">GH₵{amount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {step === "method" && (
            <div className="grid gap-3">
              {/* Cash Payment */}
              <button
                onClick={() => handlePaymentMethodSelect("cash")}
                disabled={isLoading}
                className="relative flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <DollarSign className="h-6 w-6 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Cash Payment</div>
                  <div className="text-sm text-muted-foreground">Pay directly to the caregiver</div>
                </div>
                <input
                  type="radio"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                  className="w-4 h-4"
                />
              </button>

              {/* MoMo Payment */}
              <button
                onClick={() => handlePaymentMethodSelect("momo")}
                disabled={isLoading}
                className="relative flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <CreditCard className="h-6 w-6 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Mobile Money (MoMo)</div>
                  <div className="text-sm text-muted-foreground">MTN MoMo or other mobile money providers</div>
                </div>
                <input
                  type="radio"
                  checked={paymentMethod === "momo"}
                  onChange={() => setPaymentMethod("momo")}
                  className="w-4 h-4"
                />
              </button>

              {/* Bank Transfer */}
              <button
                onClick={() => handlePaymentMethodSelect("bank")}
                disabled={isLoading}
                className="relative flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <CreditCard className="h-6 w-6 text-purple-600" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Bank Transfer</div>
                  <div className="text-sm text-muted-foreground">Direct bank account transfer</div>
                </div>
                <input
                  type="radio"
                  checked={paymentMethod === "bank"}
                  onChange={() => setPaymentMethod("bank")}
                  className="w-4 h-4"
                />
              </button>
            </div>
          )}

          {step === "receipt" && (
            <div className="grid gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Please upload a receipt or proof of payment for{" "}
                  <span className="font-semibold">{paymentMethod === "momo" ? "Mobile Money" : 'Bank Transfer'}</span>
                </p>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g., MTN123456789"
                  className="input-base w-full"
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Upload Receipt <span className="text-destructive">*</span>
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      {receiptFile ? (
                        <>
                          <p className="text-sm font-medium text-foreground">{receiptFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(receiptFile.size / 1024).toFixed(2)} KB</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground">Click to upload</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG or PDF (max 5MB)</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "receipt" && (
            <Button variant="outline" onClick={() => setStep("method")} disabled={isLoading}>
              Back
            </Button>
          )}
          {step === "receipt" && (
            <Button
              onClick={handlePaymentSubmit}
              disabled={isLoading || !receiptFile}
              className="gap-2"
            >
              {isLoading ? "Processing..." : "Confirm Payment"}
            </Button>
          )}
          {step === "method" && (
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentForm;
