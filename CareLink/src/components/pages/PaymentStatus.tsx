import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Download
} from "lucide-react";

interface PaymentStatusProps {
  isEmbedded?: boolean;
}

const PaymentStatus = ({ isEmbedded = false }: PaymentStatusProps = {}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const paymentMethod = searchParams.get("method") || "momo";
  const status = searchParams.get("status") || "success"; // success or pending

  useEffect(() => {
    // Get booking info from sessionStorage
    const booking = JSON.parse(sessionStorage.getItem("bookingInfo") || "{}");
    setBookingInfo(booking);

    // ensure the dashboard will accept us as coming from payment flow
    if (booking.userId) {
      localStorage.setItem("userId", booking.userId);
    }
    if (!localStorage.getItem("userType")) {
      localStorage.setItem("userType", "family");
    }
    sessionStorage.setItem("fromPaymentFlow", "true");
  }, []);

  const isSuccess = status === "success";

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

          {/* Success State */}
          {isSuccess && (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <div className="relative animate-bounce">
                    <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Payment Successful!</h1>
                <p className="text-muted-foreground">Your booking has been confirmed</p>
              </div>

              {/* Confirmation Card */}
              <div className="card-elevated p-8 mb-6">
                {/* Status Badge */}
                <div className="inline-block px-4 py-2 rounded-full bg-green-50 border border-green-200 mb-6">
                  <p className="text-sm font-semibold text-green-700">Booking Confirmed</p>
                </div>

                {/* Booking Details */}
                {bookingInfo?.caregiver && (
                  <div className="space-y-6">
                    <div className="pb-6 border-b border-secondary">
                      <p className="text-sm text-muted-foreground mb-2">Caregiver</p>
                      <p className="text-xl font-semibold text-foreground">{bookingInfo.caregiver}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Number of Days</p>
                        <p className="text-lg font-semibold text-foreground">{bookingInfo.dates?.length || 1} day(s)</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
                        <p className="text-lg font-semibold text-foreground">GH₵{bookingInfo.totalPrice}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Selected Dates</p>
                      <div className="space-y-2">
                        {bookingInfo.dates?.map((date: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-foreground">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            {new Date(date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="mt-8 p-4 rounded-lg bg-blue-50 border border-blue-200 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">What happens next?</p>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      <li>The caregiver will review your booking immediately</li>
                      <li>You'll receive a notification once they confirm</li>
                      <li>Payment was recorded using your chosen method and will be confirmed with the caregiver</li>
                      <li>Check your dashboard for updates</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    sessionStorage.setItem("fromPaymentFlow", "true");
                    navigate("/family-dashboard");
                  }}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    sessionStorage.setItem("fromPaymentFlow", "true");
                    navigate("/find-caregiver");
                  }}
                  className="flex-1"
                >
                  Find Another Caregiver
                </Button>
              </div>

              {/* Footer Note */}
              <div className="mt-8 p-4 rounded-lg bg-green-50 text-sm text-green-900 text-center border border-green-200">
                <p>A confirmation email has been sent to your registered email address.</p>
              </div>
            </>
          )}

          {/* Pending State - Mobile Money/Card Payment */}
          {!isSuccess && (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-yellow-50 flex items-center justify-center">
                      <Clock className="h-10 w-10 text-yellow-600 animate-spin" />
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Payment Under Review</h1>
                <p className="text-muted-foreground">Awaiting admin verification</p>
              </div>

              {/* Status Card */}
              <div className="card-elevated p-8 mb-6">
                {/* Status Badge */}
                <div className="inline-block px-4 py-2 rounded-full bg-yellow-50 border border-yellow-200 mb-6">
                  <p className="text-sm font-semibold text-yellow-700">Pending Approval</p>
                </div>

                {/* Booking Details */}
                {bookingInfo?.caregiver && (
                  <div className="space-y-6 mb-8">
                    <div className="pb-6 border-b border-secondary">
                      <p className="text-sm text-muted-foreground mb-2">Caregiver</p>
                      <p className="text-xl font-semibold text-foreground">{bookingInfo.caregiver}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
                        <p className="text-lg font-semibold text-foreground">
                          {paymentMethod === "momo" ? "Mobile Money" : "Bank Transfer"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
                        <p className="text-lg font-semibold text-foreground">GH₵{bookingInfo.totalPrice}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="mb-8">
                  <h3 className="font-semibold text-foreground mb-4">Verification Process</h3>
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
                        <p className="font-semibold text-foreground">Receipt Submitted</p>
                        <p className="text-sm text-muted-foreground">Your payment receipt has been uploaded</p>
                      </div>
                    </div>

                    {/* Step 2: Under Admin Review */}
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 rounded-full bg-yellow-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="w-1 h-12 bg-secondary mt-2"></div>
                      </div>
                      <div className="pb-4">
                        <p className="font-semibold text-foreground">Admin Verification</p>
                        <p className="text-sm text-muted-foreground">Admin is reviewing your payment receipt</p>
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

                {/* Info Box */}
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Typical approval time</p>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      <li>Mobile Money: Usually within 1-2 hours</li>
                      <li>Card Payment: Usually within 2-4 hours</li>
                      <li>Weekend: May take up to 24 hours</li>
                      <li>You'll receive an email notification</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    sessionStorage.setItem("fromPaymentFlow", "true");
                    navigate("/family-dashboard");
                  }}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    sessionStorage.setItem("fromPaymentFlow", "true");
                    navigate("/family-dashboard");
                  }}
                  className="flex-1"
                >
                  Check Status Later
                </Button>
              </div>

              {/* Footer Note */}
              <div className="mt-8 p-4 rounded-lg bg-yellow-50 text-sm text-yellow-900 text-center border border-yellow-200">
                <p>Your booking reference has been saved. Check your dashboard anytime to view the status.</p>
              </div>
            </>
          )}

          {/* Success State - Mobile Money/Card Payment Approved */}
          {isSuccess && (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <div className="relative animate-bounce">
                    <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Payment Approved!</h1>
                <p className="text-muted-foreground">Your booking has been confirmed</p>
              </div>

              {/* Confirmation Card */}
              <div className="card-elevated p-8 mb-6">
                {/* Status Badge */}
                <div className="inline-block px-4 py-2 rounded-full bg-green-50 border border-green-200 mb-6">
                  <p className="text-sm font-semibold text-green-700">Payment Verified</p>
                </div>

                {/* Booking Details */}
                {bookingInfo?.caregiver && (
                  <div className="space-y-6">
                    <div className="pb-6 border-b border-secondary">
                      <p className="text-sm text-muted-foreground mb-2">Caregiver</p>
                      <p className="text-xl font-semibold text-foreground">{bookingInfo.caregiver}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Number of Days</p>
                        <p className="text-lg font-semibold text-foreground">{bookingInfo.dates?.length || 1}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
                        <p className="text-lg font-semibold text-foreground">GH₵{bookingInfo.totalPrice}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Payment Status</p>
                        <p className="text-lg font-semibold text-green-600">Verified</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="mt-8 p-4 rounded-lg bg-green-50 border border-green-200 flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-semibold mb-1">Everything is set!</p>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      <li>Your payment has been verified by admin</li>
                      <li>The caregiver has been notified</li>
                      <li>Your booking is now confirmed</li>
                      <li>Check your dashboard for more details</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/family-dashboard")}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => navigate("/find-caregiver")}
                  className="flex-1"
                >
                  Book Another Caregiver
                </Button>
              </div>

              {/* Footer Note */}
              <div className="mt-8 p-4 rounded-lg bg-green-50 text-sm text-green-900 text-center border border-green-200">
                <p>A confirmation receipt has been sent to your email. Keep it for your records.</p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default PaymentStatus;
