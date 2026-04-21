import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  CheckCircle2,
  ArrowLeft,
  Mail,
  Calendar,
  User,
  DollarSign,
} from "lucide-react";
import { bookingAPI, messageAPI, notificationAPI, userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PaymentSuccessProps {
  isEmbedded?: boolean;
}

const PaymentSuccess = ({ isEmbedded = false }: PaymentSuccessProps = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationSent, setNotificationSent] = useState(false);
  const [caregiverPaymentInfo, setCaregiverPaymentInfo] = useState<any>(null);

  // mark that we're in payment flow and ensure minimal auth data available
  useEffect(() => {
    const booking = JSON.parse(sessionStorage.getItem("bookingInfo") || "{}");
    if (booking.userId) {
      localStorage.setItem("userId", booking.userId);
    }
    if (!localStorage.getItem("userType")) {
      localStorage.setItem("userType", "family");
    }
    sessionStorage.setItem("fromPaymentFlow", "true");
  }, []);

  // option: auto redirect after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/family-dashboard", { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  useEffect(() => {
    const initializeSuccess = async () => {
      try {
        // Get booking info from sessionStorage or URL params
        const booking = JSON.parse(sessionStorage.getItem("bookingInfo") || "{}");
        const bookingId = sessionStorage.getItem("lastBookingId");

        let currentBookingInfo = null;

        if (bookingId && !booking.id) {
          // Fetch full booking details from API
          const bookingDetails = await bookingAPI.getById(bookingId);
          currentBookingInfo = bookingDetails;
          setBookingInfo(bookingDetails);
        } else if (booking.id) {
          currentBookingInfo = booking;
          setBookingInfo(booking);
        }

        // Fetch caregiver payment info if we have booking info
        if (currentBookingInfo) {
          const caregiverId = currentBookingInfo.caregiverId || currentBookingInfo.caregiver?.id;
          if (caregiverId) {
            try {
              const caregiverProfile = await userAPI.getProfile(caregiverId);
              setCaregiverPaymentInfo({
                mobileMoneyNumber: caregiverProfile.mobileMoneyNumber,
                mobileMoneyName: caregiverProfile.mobileMoneyName,
                accountNumber: caregiverProfile.accountNumber,
                accountName: caregiverProfile.accountName,
              });
            } catch (error) {
              console.error("Error fetching caregiver payment info:", error);
            }
          }

          // Send notification to caregiver
          await sendCaregiverNotification(currentBookingInfo);
        }
      } catch (error) {
        console.error("Error loading booking information:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeSuccess();
  }, []);

  const sendCaregiverNotification = async (booking: any) => {
    try {
      if (!booking.caregiverId && !booking.caregiver?.id) {
        console.warn("No caregiver ID found in booking");
        return;
      }

      const caregiverId = booking.caregiverId || booking.caregiver?.id;
      const familyName = booking.familyName || localStorage.getItem("userName") || "Family";
      
      // Create notification message
      const notificationData = {
        recipientId: caregiverId,
        type: "booking_payment",
        title: "New Booking Payment Received",
        message: `Payment received for booking from ${familyName}. Amount: GH₵${booking.totalPrice || booking.amount}`,
        bookingId: booking.id,
        data: {
          bookingId: booking.id,
          familyName: familyName,
          amount: booking.totalPrice || booking.amount,
          paymentMethod: booking.paymentMethod || "momo",
          dates: booking.dates,
        },
      };

      // Send notification
      await notificationAPI.create(notificationData);

      // Also send a message to the caregiver
      const messageContent = `Payment received for your booking! ${familyName} has completed payment of GH₵${booking.totalPrice || booking.amount}. Booking ID: ${booking.id}`;
      await messageAPI.sendMessage(caregiverId, messageContent, booking.id);

      setNotificationSent(true);
      
      toast({
        title: "Success",
        description: "Caregiver has been notified about the payment",
      });
    } catch (error) {
      console.error("Error sending caregiver notification:", error);
      // Don't fail the success page if notification fails
      toast({
        title: "Note",
        description: "Payment successful. Caregiver notification may have been delayed.",
        variant: "default",
      });
    }
  };

  const handleDownloadReceipt = () => {
    // This would trigger a receipt download
    toast({
      title: "Receipt",
      description: "Receipt download feature coming soon",
    });
  };

  const handleViewBooking = () => {
    sessionStorage.setItem("fromPaymentFlow", "true");
    navigate("/family-dashboard");
  };

  const handleFindMoreCaregivers = () => {
    sessionStorage.setItem("fromPaymentFlow", "true");
    navigate("/find-caregiver");
  };

  if (loading) {
    return (
      <div className={isEmbedded ? "w-full" : "min-h-screen bg-background"}>
        <div className={isEmbedded ? "w-full" : "section-padding"}>
          <div className={isEmbedded ? "w-full" : "container-main max-w-2xl"}>
            <LoadingSpinner size="md" text="Loading booking information..." fullScreen={!isEmbedded} />
          </div>
        </div>
      </div>
    );
  }

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

          {/* Success Header */}
          <div className="text-center mb-12 px-4 sm:px-0">
            <div className="flex justify-center mb-6">
              <div className="relative animate-bounce">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Payment Successful!</h1>
            <p className="text-lg text-muted-foreground">
              Your booking payment has been confirmed
            </p>
            {notificationSent && (
              <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                Caregiver has been notified
              </p>
            )}
          </div>

          {/* Success Card */}
          <div className="card-elevated p-6 sm:p-8 mb-8 overflow-x-auto">
            {/* Status Badge */}
            <div className="inline-block px-4 py-2 rounded-full bg-green-50 border border-green-200 mb-6">
              <p className="text-sm font-semibold text-green-700">Payment Confirmed</p>
            </div>

            {/* Booking Details */}
            {bookingInfo && (
              <div className="space-y-6">
                {/* Caregiver Info */}
                {(bookingInfo.caregiver || bookingInfo.caregiverName) && (
                  <div className="pb-6 border-b border-secondary">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Caregiver</p>
                    </div>
                    <p className="text-xl font-semibold text-foreground break-words">
                      {typeof bookingInfo.caregiver === "string"
                        ? bookingInfo.caregiver
                        : bookingInfo.caregiver?.name || bookingInfo.caregiverName}
                    </p>
                  </div>
                )}

                {/* Booking Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Booking Dates</p>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {bookingInfo.dates?.length || 1} day(s)
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                    </div>
                    <p className="text-lg font-semibold text-green-600">
                      GH₵{(bookingInfo.totalPrice || bookingInfo.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Date List */}
                {bookingInfo.dates && bookingInfo.dates.length > 0 && (
                  <div className="pt-6 border-t border-secondary">
                    <p className="text-sm text-muted-foreground mb-3">Selected Dates</p>
                    <div className="space-y-2">
                      {bookingInfo.dates.map((date: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                        >
                          <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                          <span className="text-foreground break-words">
                            {new Date(date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                {bookingInfo.paymentMethod && (
                  <div className="pt-6 border-t border-secondary">
                    <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
                    <p className="text-foreground capitalize font-medium">
                      {bookingInfo.paymentMethod === "momo"
                        ? "Mobile Money"
                        : bookingInfo.paymentMethod === "bank"
                          ? "Card (Paystack)"
                          : bookingInfo.paymentMethod}
                    </p>
                  </div>
                )}

                {/* Caregiver Payment Details */}
                {caregiverPaymentInfo && (caregiverPaymentInfo.mobileMoneyNumber || caregiverPaymentInfo.accountNumber) && (
                  <div className="pt-6 border-t border-secondary">
                    <p className="text-sm text-muted-foreground mb-4">Caregiver Payment Details</p>
                    <div className="space-y-4">
                      {caregiverPaymentInfo.mobileMoneyNumber && (
                        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Mobile Money Payment Details:</h4>
                          <div className="space-y-1 text-sm">
                            <p className="text-green-800 dark:text-green-200">
                              <span className="font-medium">Number:</span> {caregiverPaymentInfo.mobileMoneyNumber}
                            </p>
                            {caregiverPaymentInfo.mobileMoneyName && (
                              <p className="text-green-800 dark:text-green-200">
                                <span className="font-medium">Name:</span> {caregiverPaymentInfo.mobileMoneyName}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {caregiverPaymentInfo.accountNumber && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Bank Account Details:</h4>
                          <div className="space-y-1 text-sm">
                            <p className="text-blue-800 dark:text-blue-200">
                              <span className="font-medium">Account Number:</span> {caregiverPaymentInfo.accountNumber}
                            </p>
                            {caregiverPaymentInfo.accountName && (
                              <p className="text-blue-800 dark:text-blue-200">
                                <span className="font-medium">Account Name:</span> {caregiverPaymentInfo.accountName}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Please use these details to complete your payment to the caregiver.
                    </p>
                  </div>
                )}

                {/* Booking ID */}
                <div className="pt-6 border-t border-secondary">
                  <p className="text-sm text-muted-foreground mb-2">Booking Reference</p>
                  <p className="font-mono text-foreground bg-secondary/30 p-3 rounded break-words max-w-full whitespace-normal">
                    {bookingInfo.id}
                  </p>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                The caregiver has been notified of your payment. You will receive a confirmation
                message shortly. Check your dashboard for booking updates.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={handleDownloadReceipt}
              className="gap-2"
            >
              Download Receipt
            </Button>
            <Button
              onClick={handleViewBooking}
              className="gap-2"
            >
              View My Bookings
            </Button>
          </div>

          {/* Additional Action */}
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={handleFindMoreCaregivers}
              className="w-full"
            >
              Find More Caregivers
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PaymentSuccess;
