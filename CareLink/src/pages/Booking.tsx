// Import useState hook for managing booking step progression and form selections
import { useState, useEffect } from "react";
// Import Link component for navigation between pages
import { Link, useSearchParams, useNavigate } from "react-router-dom";
// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import Button UI component for form actions
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
// Import Calendar UI component for full calendar date selection
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
// Import toast notifications
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// Import icon components for visual elements (calendar, checkmarks, navigation)
import { 
  Calendar,      // Icon for date selection
  CheckCircle2,  // Icon for confirmation/completion
  ChevronLeft,   // Icon for previous month navigation
  ChevronRight,  // Icon for next month navigation
  Users,         // Icon for caregiver display
  AlertCircle,   // Icon for error messages
  Bell,          // Icon for notification
  CreditCard,    // Icon for payment method
  Smartphone,    // Icon for mobile money
  Upload,        // Icon for file upload
  Eye,           // Icon for view file
  X,             // Icon for remove file
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bookingAPI, userAPI } from "@/lib/api";
import { getFullImageUrl } from "@/utils/imageUrl";


interface BookingProps {
  isEmbedded?: boolean;
}

// Booking component - Multi-step booking form for selecting dates with caregiver
const Booking = ({ isEmbedded = false }: BookingProps = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const caregiverId = searchParams.get("caregiver");

  // step state - Tracks which step of booking process (1=date selection, 2=confirm, 3=payment)
  const [step, setStep] = useState(1);
  // selectedDates state - Stores the selected dates as an array of Date objects
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "bank">("momo");
  const [transactionId, setTransactionId] = useState("");
  // Card payment fields
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  // Receipt file state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState("");
  // Payment modal step state
  const [paymentModalStep, setPaymentModalStep] = useState<"method" | "receipt">("method");

  
  // Caregiver data
  const [caregiver, setCaregiver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch caregiver data on mount
  useEffect(() => {
    const fetchCaregiverData = async () => {
      try {
        setLoading(true);
        if (!caregiverId) {
          setError("Caregiver not specified");
          return;
        }
        const data = await userAPI.getPublicProfile(caregiverId);
        setCaregiver(data);
      } catch (err) {
        console.error("Failed to fetch caregiver:", err);
        setError("Failed to load caregiver information");
      } finally {
        setLoading(false);
      }
    };

    fetchCaregiverData();
  }, [caregiverId]);

  const handleSubmit = async () => {
    if (step < 3) {
      if (step === 1 && selectedDates.length === 0) {
        setError("Please select at least one date");
        return;
      }
      setError("");
      setStep(step + 1);
    } else {
      // Step 3: Open payment modal (payment modal handles its own validation)
      setError("");
      setPaymentModalStep("method");
    }
  };

  // Handle payment confirmation from modal
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setReceiptError("");
    
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setReceiptError("File size must be less than 5MB");
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setReceiptError("Only JPEG, PNG, or PDF files allowed");
        return;
      }

      setReceiptFile(file);
    }
  };

  // Remove receipt file
  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptError("");
  };

  // Handle payment method selection in modal
  const handlePaymentMethodSelect = (method: "momo" | "bank") => {
    setPaymentMethod(method);
    setPaymentModalStep("receipt");
  };

  // Close payment modal
  const closePaymentModal = () => {
    setStep(2); // Go back to confirm step
    setPaymentModalStep("method");
    setPaymentMethod("momo");
    setTransactionId("");
    setReceiptFile(null);
    setReceiptError("");
  };

  // Handle payment confirmation from modal
  const handleConfirmPaymentFromModal = async () => {
    // Validate receipt file
    if (!receiptFile) {
      setReceiptError("Please upload a receipt or proof of payment");
      return;
    }

    // Transaction ID is optional for momo
    // No validation needed - user can provide it or leave it blank

    // Process payment directly without confirmation dialog
    await submitBooking();
  };

  const submitBooking = async () => {
    if (!caregiverId || selectedDates.length === 0) {
      setError("Please select at least one date");
      return;
    }


    try {
      setSubmitting(true);
      setError("");

      // Get current user ID from localStorage
      const userStr = localStorage.getItem("user");
      const userId = userStr ? JSON.parse(userStr).id : null;

      // Convert dates to ISO strings
      const dateStrings = selectedDates.map(date => date.toISOString());

      // Create a single booking with all selected dates
      // Send BOTH bookingDate (for validation) and bookingDates (for multiple dates)
      const bookingData = {
        caregiverId,
        userId: userId || null,
        // Set bookingDate to first date (required by schema)
        bookingDate: dateStrings[0],
        // Send all dates as array for multi-date support
        bookingDates: dateStrings,
        status: "pending",
        totalPrice: selectedDates.length * (caregiver?.dailyRate || 500),
        numberOfDays: selectedDates.length,
        bookingType: "daily",
        paymentMethod: paymentMethod,
        transactionId: transactionId || undefined
      };

      // Log what we're sending for debugging
      console.log('Booking submission - sending data:', {
        caregiverId: bookingData.caregiverId,
        bookingDate: bookingData.bookingDate,
        bookingDatesLength: bookingData.bookingDates?.length || 0,
        firstDate: bookingData.bookingDates?.[0] || 'N/A',
        totalPrice: bookingData.totalPrice,
        hasUserId: !!bookingData.userId,
      });

      const booking = await bookingAPI.create(bookingData);
      
      // Upload receipt if provided
      if (receiptFile && booking) {
        try {
          await bookingAPI.uploadReceipt(booking._id, receiptFile);
          console.log("Receipt uploaded successfully");
        } catch (uploadErr: any) {
          console.error("Receipt upload error:", uploadErr);
          toast({
            title: "Warning",
            description: "Booking created but receipt upload failed. You can upload it later.",
            variant: "destructive",
          });
        }
      }
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store booking info for next steps
      if (booking) {
        sessionStorage.setItem("bookingInfo", JSON.stringify({
          bookingId: booking._id,
          caregiverId,
          caregiver: caregiver?.name,
          caregiverPhone: caregiver?.phone,
          totalPrice: bookingData.totalPrice,
          dates: selectedDates,
          numberOfDays: selectedDates.length,
          userId,
        }));
      }

      // Handle different payment methods
      navigate(`/complete-payment?method=${paymentMethod}&status=pending&receipt=false`);
    } catch (err: any) {
      console.error("Booking submission error:", err);
      setError(err?.message || "Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen bg-background"}>
      {!isEmbedded && <Header />}

      <section className={isEmbedded ? "w-full" : "section-padding"}>
        <div className={isEmbedded ? "w-full" : "container-main max-w-3xl"}>
          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <LoadingSpinner size="md" text="Loading caregiver information..." />
            </div>
          )}

          {!loading && caregiver && (
            <>
              {/* Progress */}
              <div className="flex items-center justify-center gap-4 mb-12">
                {["Select Dates", "Confirm", "Payment"].map((label, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        index + 1 <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                        {index + 1 < step ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                      </div>
                      <span className="text-xs text-muted-foreground mt-2 hidden md:block">{label}</span>
                    </div>
                    {index < 2 && (
                      <div className={`w-12 h-1 rounded ${index + 1 < step ? "bg-primary" : "bg-secondary"}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="card-elevated p-8">
                {/* Caregiver Info */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 mb-8">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {caregiver.profilePicture ? (
                      (() => {
                        const pic = getFullImageUrl(caregiver.profilePicture) || caregiver.profilePicture;
                        console.log('Booking page caregiver image:', { id: caregiver._id, profilePicture: caregiver.profilePicture, resolved: pic });
                        return (
                          <img
                            src={pic}
                            alt={caregiver.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              console.error('Booking image failed to load for', caregiver._id, 'src=', pic);
                              const t = e.currentTarget as HTMLImageElement;
                              t.onerror = null;
                              t.style.display = 'none';
                            }}
                            crossOrigin="anonymous"
                          />
                        );
                      })()
                    ) : (
                      <Users className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{caregiver.name}</p>
                    <p className="text-sm text-muted-foreground">{caregiver.specialization || "Care Provider"} • GH₵{caregiver.dailyRate || 500}/day</p>
                  </div>
                </div>

                {step === 1 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Select Dates for Daily Care
                    </h2>

                    <p className="text-sm text-muted-foreground mb-6">Click dates to select multiple days. The calendar below shows the next 30 days.</p>

                    <div className="flex justify-center mb-6 overflow-x-auto">
                      <CalendarComponent
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={(dates) => {
                          setSelectedDates(dates || []);
                        }}
                        disabled={(date) => {
                          // Disable past dates
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        className="border border-secondary rounded-lg p-4"
                      />
                    </div>

                    {selectedDates.length > 0 && (
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm font-semibold text-primary mb-3">{selectedDates.length} day(s) selected</p>
                        <div className="space-y-2">
                          {selectedDates
                            .sort((a, b) => a.getTime() - b.getTime())
                            .map((date, idx) => (
                              <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="w-2 h-2 bg-primary rounded-full"></span>
                                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Confirm Your Booking
                    </h2>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                        <span className="text-muted-foreground">Daily Rate</span>
                        <span className="font-medium text-foreground">GH₵{caregiver?.dailyRate || 500}/day</span>
                      </div>
                      <div className="border-t border-secondary pt-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Selected dates:</p>
                        <div className="space-y-2">
                          {selectedDates
                            .sort((a, b) => a.getTime() - b.getTime())
                            .map((date, idx) => (
                              <div key={idx} className="text-sm text-muted-foreground p-2 bg-secondary/50 rounded-lg flex items-center gap-2">
                                <span className="w-2 h-2 bg-primary rounded-full"></span>
                                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="flex justify-between p-3 rounded-lg bg-primary/10">
                        <span className="text-foreground font-medium">Total Cost</span>
                        <span className="font-bold text-primary">GH₵{selectedDates.length * (caregiver?.dailyRate || 500)}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6">
                      By confirming, you agree to our booking terms. <strong>{caregiver?.name}</strong> will be notified immediately and will confirm their availability.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Review & Process Payment
                    </h2>

                    <div className="space-y-4 mb-8 p-6 rounded-lg border border-primary/30 bg-primary/5">
                      <p className="text-foreground mb-4">
                        Click the button below to proceed with payment. A payment modal will open where you can select your preferred payment method and upload proof of payment.
                      </p>

                      {/* Payment Summary */}
                      <div className="p-4 rounded-lg bg-background border border-secondary">
                        <p className="text-sm text-muted-foreground mb-3">Payment Summary</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Daily Rate</span>
                            <span className="text-foreground">GH₵{caregiver?.dailyRate || 500}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Number of Days</span>
                            <span className="text-foreground">{selectedDates.length}</span>
                          </div>
                          <div className="border-t border-secondary pt-2 mt-2 flex justify-between">
                            <span className="font-semibold text-foreground">Total Amount</span>
                            <span className="font-bold text-primary text-lg">GH₵{selectedDates.length * (caregiver?.dailyRate || 500)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 mt-8">
                  {step > 1 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1" disabled={submitting}>
                      Back
                    </Button>
                  )}
                  <div className="flex-1">
                    <Button
                      onClick={handleSubmit}
                      className="w-full"
                      disabled={
                        (step === 1 && selectedDates.length === 0) ||
                        submitting
                      }
                    >
                      {submitting ? "Processing..." : step === 3 ? "Proceed to Payment" : "Continue"}
                    </Button>


                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Payment Modal Dialog */}
      <Dialog open={step === 3} onOpenChange={(open) => !open && closePaymentModal()}>
        <DialogContent className="sm:max-w-[450px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Method
            </DialogTitle>
            <DialogDescription>
              Total Amount: <span className="font-semibold text-foreground">GH₵{selectedDates.length * (caregiver?.dailyRate || 500)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {paymentModalStep === "method" && (
              <div className="grid gap-3">
                {/* Mobile Money */}
                <button
                  onClick={() => handlePaymentMethodSelect("momo")}
                  className="relative flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <Smartphone className="h-6 w-6 text-blue-600" />
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

            {paymentModalStep === "receipt" && (
              <div className="grid gap-4">
                {paymentMethod === "momo" && caregiver && caregiver.mobileMoneyNumber && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                    <p className="text-sm text-yellow-900 font-medium mb-2">Mobile Money Payment Details:</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Mobile Number:</span>
                        <span className="font-semibold text-foreground">{caregiver.mobileMoneyNumber}</span>
                      </div>
                      {caregiver.mobileMoneyName && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Account Name:</span>
                          <span className="font-semibold text-foreground">{caregiver.mobileMoneyName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === "bank" && caregiver && caregiver.accountNumber && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-2">
                    <p className="text-sm text-purple-900 font-medium mb-2">Bank Transfer Details:</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="font-semibold text-foreground">{caregiver.accountNumber}</span>
                      </div>
                      {caregiver.accountName && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Account Name:</span>
                          <span className="font-semibold text-foreground">{caregiver.accountName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Please upload a receipt or proof of payment for{" "}
                    <span className="font-semibold">{paymentMethod === "momo" ? "Mobile Money" : paymentMethod === "bank" ? "Bank Transfer" : "Bank Transfer"}</span>
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
                      onChange={handleReceiptFileChange}
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

                {receiptError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{receiptError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={closePaymentModal}>
              {paymentModalStep === "method" ? "Cancel" : "Back"}
            </Button>
            {paymentModalStep === "receipt" && (
              <Button
                onClick={handleConfirmPaymentFromModal}
                disabled={!receiptFile}
              >
                Confirm Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isEmbedded && <Footer />}
    </div>
  );
};

export default Booking;
