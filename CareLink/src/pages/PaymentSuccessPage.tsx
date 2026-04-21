import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  LayoutDashboard,
  Calendar,
  Search,
  History,
  Star,
  Settings as SettingsIcon,
  Download,
  MessageSquare,
  Clock,
  DollarSign,
  Lightbulb,
} from "lucide-react";
import { bookingAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const paymentMethod = searchParams.get("method") || "unknown";

  // ensure dashboard guard knows we came from a payment flow and has minimum user info
  useEffect(() => {
    // replicate logic from CompletePaymentPage
    const bookingInfo = JSON.parse(sessionStorage.getItem("bookingInfo") || "{}");
    if (bookingInfo.userId) {
      localStorage.setItem("userId", bookingInfo.userId);
    }
    if (!localStorage.getItem("userType")) {
      localStorage.setItem("userType", "family");
    }
    sessionStorage.setItem("fromPaymentFlow", "true");
  }, []);

  // optional: automatically redirect to dashboard after showing success details
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/family-dashboard", { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const [bookingData, setBookingData] = useState<any>(null);
  const [caregiverData, setCaregiverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"family" | "caregiver" | "admin" | null>(null);

  useEffect(() => {
    const storedUserType = localStorage.getItem("userType");
    if (storedUserType) {
      setUserType(storedUserType as "family" | "caregiver" | "admin");
    }
  }, []);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        if (!bookingId) {
          setLoading(false);
          return;
        }

        // Fetch booking details
        const response = await bookingAPI.getById(bookingId);
        setBookingData(response.data || response);

        // Fetch caregiver details
        if (response.data?.caregiverId || response.caregiverId) {
          const rawCaregiver = response.data?.caregiverId || response.caregiverId;
          // caregiver may be an object or an id string
          const caregiverId = typeof rawCaregiver === "string" ? rawCaregiver : rawCaregiver?._id || rawCaregiver?.id;
          // Get caregiver name and contact info from booking data
          setCaregiverData({
            id: caregiverId,
            name: rawCaregiver?.name || rawCaregiver?.firstName || response.data?.caregiver?.name || "Caregiver",
            email: rawCaregiver?.email,
          });
        }
      } catch (error) {
        console.error("Error fetching booking details:", error);
        toast({
          title: "Warning",
          description: "Some booking details could not be loaded",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, toast]);

  const getSidebarItems = () => {
    if (userType === "family") {
      return [
        {
          icon: <LayoutDashboard className="h-5 w-5" />,
          label: "Overview",
          path: "#overview",
          action: () => navigate("/family-dashboard"),
        },
        {
          icon: <Calendar className="h-5 w-5" />,
          label: "Bookings",
          path: "#bookings",
          action: () => navigate("/family-dashboard"),
        },
        {
          icon: <Search className="h-5 w-5" />,
          label: "Find Caregiver",
          path: "/find-caregiver",
          action: () => {
            if (caregiverData?.id) {
              navigate(`/caregiver/${caregiverData.id}`);
            } else {
              navigate("/find-caregiver");
            }
          },
        },
        {
          icon: <History className="h-5 w-5" />,
          label: "History",
          path: "#history",
          action: () => navigate("/family-dashboard"),
        },
        {
          icon: <Star className="h-5 w-5" />,
          label: "Reviews",
          path: "#reviews",
          action: () => navigate("/family-dashboard"),
        },
        {
          icon: <SettingsIcon className="h-5 w-5" />,
          label: "Settings",
          path: "/settings",
          action: () => navigate("/settings"),
        },
      ];
    }
    return [];
  };

  if (loading) {
    return (
      <DashboardLayout sidebarItems={getSidebarItems()} userType={userType || "family"}>
        <div className="flex items-center justify-center py-12">
          <span className="text-muted-foreground">Loading payment confirmation...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={getSidebarItems()} userType={userType || "family"}>
      <div className="w-full max-w-4xl mx-auto py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
              <CheckCircle2 className="h-16 w-16 text-green-600 relative z-10" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Payment Successful!</h1>
          <p className="text-lg text-muted-foreground">
            Your payment has been processed successfully
          </p>
        </div>

        {/* Success Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Payment Confirmation Card */}
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Payment Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold capitalize">{paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-lg">
                    GH₵{bookingData?.totalPrice?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-semibold">
                    {new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-semibold">
                      {bookingData?.bookingDate
                        ? new Date(bookingData.bookingDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                      {bookingData?.startTime && ` at ${bookingData.startTime}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">
                      {bookingData?.numberOfDays || bookingData?.duration || 1} day{(bookingData?.numberOfDays || bookingData?.duration || 1) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Caregiver Notification Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Caregiver Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  ✓ <span className="font-semibold">{caregiverData?.name || "Your caregiver"}</span> has been notified about your
                  booking and payment. They will review the booking details and confirm their
                  availability.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                You will receive a notification once the caregiver confirms the booking. Keep your
                phone and email available for updates.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span><span className="font-semibold">Next Step:</span> Review the booking
                  confirmation message from your caregiver in your Messages section.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => {
              // make sure dashboard sees us as coming from a payment flow
              sessionStorage.setItem("fromPaymentFlow", "true");
              navigate("/family-dashboard");
            }}
            className="gap-2"
            size="lg"
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/history")}
            className="gap-2"
            size="lg"
          >
            <History className="h-4 w-4" />
            View Bookings
          </Button>
        </div>

        {/* Additional Info */}
        <Card className="mt-8 bg-slate-50/50 dark:bg-slate-900/20">
          <CardHeader>
            <CardTitle className="text-base">Important Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="text-primary font-semibold">•</div>
              <p>
                A confirmation email has been sent to your registered email address with all booking
                details.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="text-primary font-semibold">•</div>
              <p>
                The caregiver will confirm availability within 24 hours. Check your notifications
                regularly.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="text-primary font-semibold">•</div>
              <p>
                Please ensure the caregiver confirms receipt of your payment on the booking date.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="text-primary font-semibold">•</div>
              <p>
                You can view payment details and receipt in the Bookings section of your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSuccessPage;
