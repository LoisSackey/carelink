import { useState, useEffect } from "react";
import MessagingModal from "@/components/MessagingModal";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  LayoutDashboard,
  Calendar,
  Search,
  History,
  Star,
  Settings as SettingsIcon,
  ArrowLeft,
  User,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  CreditCard,
  Smartphone,
  Mail,
} from "lucide-react";
import { bookingAPI, userAPI } from "@/lib/api";
import { getFullImageUrl } from "@/utils/imageUrl";
import { useToast } from "@/hooks/use-toast";

// BookingDetailsPage component - Displays full booking details
const BookingDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<"family" | "caregiver" | "admin" | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  // Get user type from localStorage
  useEffect(() => {
    const storedUserType = localStorage.getItem("userType");
    if (storedUserType) {
      setUserType(storedUserType as "family" | "caregiver" | "admin");
    }
  }, []);

  // Get sidebar items based on user type
  const getSidebarItems = () => {
    if (userType === "family") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => navigate("/family-dashboard") },
        { icon: <Search className="h-5 w-5" />, label: "Find Caregiver", path: "/find-caregiver", action: () => navigate("/find-caregiver") },
        { icon: <History className="h-5 w-5" />, label: "History", path: "#history", action: () => navigate("/family-dashboard") },
        { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "#reviews", action: () => navigate("/family-dashboard") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
      ];
    } else if (userType === "caregiver") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => navigate("/caregiver-dashboard") },
        { icon: <Briefcase className="h-5 w-5" />, label: "Job Requests", path: "#requests", action: () => navigate("/caregiver-dashboard") },
        { icon: <Calendar className="h-5 w-5" />, label: "Schedule", path: "#schedule", action: () => navigate("/caregiver-dashboard") },
        { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "#reviews", action: () => navigate("/caregiver-dashboard") },
        { icon: <CreditCard className="h-5 w-5" />, label: "Payments", path: "#payments", action: () => navigate("/caregiver-dashboard#payments") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
      ];
    }
    return [];
  };

  // Load booking details
  useEffect(() => {
    const loadBookingDetails = async () => {
      try {
        if (!id) {
          setError("No booking ID provided");
          setLoading(false);
          return;
        }

        const bookingData = await bookingAPI.getById(id);
        setBooking(bookingData);
        setError(null);
      } catch (err: any) {
        console.error("Error loading booking details:", err);
        setError(err?.message || "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    loadBookingDetails();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout sidebarItems={getSidebarItems()} userType={userType || "family"}>
        <LoadingSpinner size="md" text="Loading booking details..." fullScreen />
      </DashboardLayout>
    );
  }

  if (error || !booking) {
    return (
      <DashboardLayout sidebarItems={getSidebarItems()} userType={userType || "family"}>
        <div className="max-w-4xl mx-auto p-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-semibold">{error || "Booking not found"}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Prepare messaging props
  const otherParty = userType === 'caregiver' ? (booking.userId || booking.familyId) : (booking.caregiver || booking.caregiverId);
  const currentUserId = localStorage.getItem('userId') || '';
  const currentUserName = userType === 'family' ? (booking.userId?.name || '') : (booking.caregiver?.name || booking.caregiverId?.name || '');
  const bookingRefId = booking._id || id;

  const bookingDate = new Date(booking.bookingDate || booking.startDate);
  const statusColor = {
    pending: "bg-warning/10 text-warning border-warning/20",
    confirmed: "bg-info/10 text-info border-info/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <DashboardLayout sidebarItems={getSidebarItems()} userType={userType || "family"}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Booking Details</h1>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${statusColor[booking.status as keyof typeof statusColor] || "bg-secondary/10"}`}>
            <p className="text-sm font-semibold capitalize">{booking.status}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Info */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Booking Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Date</p>
                  <p className="text-lg font-medium text-foreground">
                    {bookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  {booking.bookingDates && booking.bookingDates.length > 1 && (
                    <div className="mt-2 space-y-1">
                      {booking.bookingDates.map((d: string, idx: number) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Booking Type</p>
                  <p className="text-lg font-medium text-foreground capitalize">{booking.bookingType || 'daily'}</p>
                </div>
              </div>
              {booking.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notes</p>
                  <p className="text-foreground">{booking.notes}</p>
                </div>
              )}
            </div>

            {/* Family/Caregiver Info */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {userType === "caregiver" ? "Family Information" : "Caregiver Information"}
              </h2>
              {userType === "caregiver" ? (
                // Family info for caregiver (supports legacy familyId)
                (() => {
                  const family = booking.userId || booking.familyId || {};
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
                          {family.profilePicture ? (
                            <img
                              src={getFullImageUrl(family.profilePicture)}
                              alt={family.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-8 w-8" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Family Name</p>
                          <p className="text-lg font-semibold text-foreground">{family.name || "Unknown"}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 pt-2 border-t border-border">
                        {family.phone && (
                          <div className="flex items-start gap-3">
                            <Smartphone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">Phone</p>
                              <p className="text-sm text-foreground">{family.phone}</p>
                            </div>
                          </div>
                        )}
                        {family.email && (
                          <div className="flex items-start gap-3">
                            <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                              <p className="text-sm text-foreground">{family.email}</p>
                            </div>
                          </div>
                        )}
                        {family.location && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
                              <p className="text-sm text-foreground">{family.location}</p>
                            </div>
                          </div>
                        )}
                        {!family.location && (family.address || family.city || family.state) && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
                              <p className="text-sm text-foreground">{[family.address, family.city, family.state].filter(Boolean).join(', ')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <Button onClick={() => setIsMessagingOpen(true)}>Message Family</Button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                // Caregiver info for family
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0 overflow-hidden">
                    {booking.caregiverId?.profilePicture ? (
                      <img
                        src={getFullImageUrl(booking.caregiverId.profilePicture)}
                        alt={booking.caregiverId.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Caregiver Name</p>
                    <p className="text-lg font-semibold text-foreground">{booking.caregiver?.name || booking.caregiverId?.name || "Not Assigned"}</p>
                    {booking.caregiver?.rating || booking.caregiverId?.rating ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        ⭐ {booking.caregiver?.rating || booking.caregiverId?.rating} rating
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <Button onClick={() => setIsMessagingOpen(true)}>Message Caregiver</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Info */}
            {booking.totalPrice || booking.amount ? (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Payment Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Service Amount</p>
                    <p className="font-semibold text-foreground">GH₵{booking.totalPrice || booking.amount}</p>
                  </div>
                  {booking.paymentMethod && (
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-semibold text-foreground capitalize">{booking.paymentMethod === 'momo' ? 'Mobile Money' : booking.paymentMethod}</p>
                    </div>
                  )}
                  {booking.paymentStatus && (
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <p className="text-muted-foreground">Payment Status</p>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        booking.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {booking.paymentStatus || 'Pending'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Timeline */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Status</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      ['pending', 'confirmed', 'completed'].includes(booking.status) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    {booking.status !== 'completed' && (
                      <div className="w-0.5 h-12 bg-secondary mt-2"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Booking Confirmed</p>
                    <p className="text-sm text-muted-foreground">Your booking is ready</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      booking.status === 'completed' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <p className={`font-semibold ${booking.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Service Completed
                    </p>
                    <p className="text-sm text-muted-foreground">Awaiting completion</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <MessagingModal
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
        caregiver={otherParty}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        bookingId={bookingRefId}
      />
    </DashboardLayout>
  );
};

export default BookingDetailsPage;
