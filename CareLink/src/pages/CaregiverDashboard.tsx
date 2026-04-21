// Import DashboardLayout component that provides sidebar and common dashboard UI
import DashboardLayout from "@/components/layout/DashboardLayout";
// Import Button UI component for clickable actions
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// Import hooks for state management and navigation
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
// Import icon components for sidebar navigation and dashboard sections
import { 
  LayoutDashboard,  // Icon for dashboard/overview
  Briefcase,        // Icon for job requests/work
  Calendar,         // Icon for schedule
  Star,             // Icon for ratings
  Settings,         // Icon for user settings
  Shield,           // Icon for verification status
  Clock,            // Icon for time/scheduled jobs
  CheckCircle2,     // Icon for confirmed/completed
  XCircle,          // Icon for rejected/cancelled
  DollarSign,       // Icon for earnings/rate
  TrendingUp,       // Icon for growth/statistics
  AlertCircle,      // Icon for alerts
  Filter,           // Icon for filter
  Search,           // Icon for search
  MapPin,           // Icon for location
  User,             // Icon for user
  Users,            // Icon for people
  ChevronDown,      // Icon for dropdown
  X,                // Icon for close
  ZapOff,           // Icon for inactive
  Loader,           // Icon for loading
  CreditCard,       // Icon for payment
  Eye,              // Icon for view
  Clipboard,        // Icon for clipboard/checklist
  Flame,            // Icon for urgent
  Lightbulb,        // Icon for tips
  Smartphone,       // Icon for mobile money
  PiggyBank,        // Icon for bank account
  Copy,             // Icon for copy
  Check,            // Icon for check
  Mail,             // Icon for email
} from "lucide-react";
// Import API clients
import { userAPI, bookingAPI, credentialAPI } from "@/lib/api";
// Import document upload modal
import DocumentUploadPromptModal from "@/components/DocumentUploadPromptModal";
// Import toast notifications
import { useToast } from "@/hooks/use-toast";
// Import image URL helper
import { getFullImageUrl } from "@/utils/imageUrl";

// helper utilities for booking date display
const getBookingDateArray = (booking: any): Date[] => {
  if (Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0) {
    return booking.bookingDates.map((d: any) => new Date(d));
  }
  const d = booking.bookingDate || booking.startDate;
  if (d) return [new Date(d)];
  return [];
};

const formatBookingPrimaryDate = (booking: any): string => {
  const dates = getBookingDateArray(booking);
  if (dates.length === 0) return "";
  const first = dates[0];
  if (dates.length === 1) {
    return first.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  return `${first.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} (+${dates.length - 1} more)`;
};

const getBookingDayCount = (booking: any): number => {
  // Prefer explicit numberOfDays
  if (booking.numberOfDays && Number(booking.numberOfDays) > 0) return Number(booking.numberOfDays);

  // If bookingDates array exists, use its length
  if (Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0) return booking.bookingDates.length;

  // If there is a start and end date, compute inclusive days
  const start = booking.startDate || booking.bookingDate;
  const end = booking.endDate || booking.bookingDate;
  if (start && end) {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffMs = Math.abs(e.getTime() - s.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, days);
    } catch (e) {
      return 1;
    }
  }

  // Fallback to 1
  return 1;
};

// Helper function to get full receipt URL
const getReceiptUrl = (receiptPath: string): string => {
  if (!receiptPath) return '';
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // Remove /api from the end of backend URL to get base URL
  const baseUrl = backendUrl.replace('/api', '');
  
  // If receiptPath already starts with http, return as is
  if (receiptPath.startsWith('http')) {
    return receiptPath;
  }
  
  // Construct full URL
  return `${baseUrl}${receiptPath}`;
};

// Helper function to copy text to clipboard
const copyToClipboard = (text: string, fieldName: string) => {
  navigator.clipboard.writeText(text);
  setCopiedField(fieldName);
  setTimeout(() => setCopiedField(null), 2000);
};

// CaregiverDashboard component - Main dashboard for caregiver users showing job requests and schedule
const CaregiverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [caregiverName, setCaregiverName] = useState("Caregiver");
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [caregiverData, setCaregiverData] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<"overview" | "requests" | "schedule" | "reviews" | "payments" | "history">("overview");
  const [showPendingApprovalModal, setShowPendingApprovalModal] = useState(false);

  // Real data state
  const [bookings, setBookings] = useState<any[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<any[]>([]);
  const [showDocumentPrompt, setShowDocumentPrompt] = useState(false);
  const [hasUploadedDocuments, setHasUploadedDocuments] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);

  // UI state
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [acceptedFilter, setAcceptedFilter] = useState<string>("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);

  console.log("CaregiverDashboard: Component rendering, isLoading =", isLoading);

  // sidebarItems array - Navigation menu items displayed in left sidebar with icons and paths
  const sidebarItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => setCurrentPage("overview") },
    { icon: <Briefcase className="h-5 w-5" />, label: "Job Requests", path: "#requests", action: () => setCurrentPage("requests") },
    { icon: <Clock className="h-5 w-5" />, label: "History", path: "#history", action: () => setCurrentPage("history") },
    { icon: <Calendar className="h-5 w-5" />, label: "Schedule", path: "#schedule", action: () => setCurrentPage("schedule") },
    { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "#reviews", action: () => setCurrentPage("reviews") },
    { icon: <CreditCard className="h-5 w-5 text-primary" />, label: "Payments", path: "#payments", action: () => setCurrentPage("payments") },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
  ];

  // Filter job requests
  const filteredRequests = useMemo(() => {
    let filtered = bookings.filter((b: any) => b && b.status === "pending");
    
    if (searchTerm) {
      filtered = filtered.filter((b: any) =>
        b.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.serviceType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [bookings, searchTerm]);

  // Filter accepted bookings (schedule)
  const filteredSchedule = useMemo(() => {
    let filtered = acceptedBookings;
    
    if (acceptedFilter === "upcoming") {
      filtered = filtered.filter((b: any) => b && new Date(b.bookingDate || b.startDate) > new Date());
    } else if (acceptedFilter === "completed") {
      filtered = filtered.filter((b: any) => b && b.status === "completed");
    }
    
    return filtered.sort((a: any, b: any) => {
      return new Date(a.bookingDate || a.startDate).getTime() - new Date(b.bookingDate || b.startDate).getTime();
    });
  }, [acceptedBookings, acceptedFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const pending = bookings.filter((b: any) => b && b.status === "pending").length;
    const completed = acceptedBookings.filter((b: any) => b && b.status === "completed").length;
    const avgRating = caregiverData?.rating || 0;
    const earnings = acceptedBookings
      .filter((b: any) => b && b.status === "completed")
      .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);
    
    return { pending, completed, avgRating, earnings };
  }, [bookings, acceptedBookings, caregiverData]);

  // Load caregiver data on mount
  useEffect(() => {
    console.log("CaregiverDashboard: Component mounted, loading data...");
    loadCaregiverData();
  }, []);

  const loadCaregiverData = async () => {
    try {
      console.log("CaregiverDashboard: Starting loadCaregiverData");
      const userId = localStorage.getItem("userId");
      const userType = localStorage.getItem("userType");
      
      console.log("CaregiverDashboard: userId =", userId, "userType =", userType);
      
      if (!userId || userType !== "caregiver") {
        console.log("CaregiverDashboard: Invalid userId or userType, navigating to login");
        navigate("/login");
        return;
      }

      setCaregiverId(userId);

      // Load caregiver profile
      console.log("CaregiverDashboard: Calling userAPI.getProfile");
      const careData = await userAPI.getProfile(userId);
      console.log("CaregiverDashboard: Profile data received:", careData);
      setCaregiverName(careData.name || "Caregiver");
      setCaregiverData(careData);
      
      // Check if caregiver has location set
      if (!careData.location) {
        setShowLocationPrompt(true);
      }
      
      // Check if caregiver is approved
      if (!careData.approved) {
        setShowPendingApprovalModal(true);
      }

      // Check if caregiver has uploaded documents
      try {
        const credentials = await credentialAPI.getCaregiverCredentials(userId);
        const hasDocuments = credentials.credentials && credentials.credentials.length > 0;
        setHasUploadedDocuments(hasDocuments);
        
        // Show prompt if no documents uploaded
        if (!hasDocuments) {
          setShowDocumentPrompt(true);
        }
      } catch (err) {
        console.log("Could not check credentials, showing prompt anyway");
        setShowDocumentPrompt(true);
      }

      // Load all bookings where caregiver is assigned
      const allBookings = await bookingAPI.getAll();
      const caregiverBookings = Array.isArray(allBookings)
        ? allBookings.filter((b: any) => b && (b.caregiverId === userId || b.caregiverId?._id === userId))
        : [];

      // Normalize bookings: ensure bookingDates array exists and numberOfDays is set when possible
      const normalizedBookings = caregiverBookings.map((b: any) => {
        const booking = { ...b };
        if (!Array.isArray(booking.bookingDates) || booking.bookingDates.length === 0) {
          const dateVal = booking.bookingDate || booking.startDate || null;
          booking.bookingDates = dateVal ? [dateVal] : [];
        }
        if (!booking.numberOfDays) {
          booking.numberOfDays = Array.isArray(booking.bookingDates) ? booking.bookingDates.length : 1;
        }
        return booking;
      });

      // Separate pending and accepted bookings
      const pending = normalizedBookings.filter((b: any) => b && b.status === "pending");
      // bookings that have been accepted by the caregiver (waiting payment or already confirmed/completed)
      const accepted = normalizedBookings.filter((b: any) => b && (b.status === "payment-pending" || b.status === "confirmed" || b.status === "completed"));

      setBookings(pending);
      setAcceptedBookings(accepted);
    } catch (err: any) {
      console.error("CaregiverDashboard: Failed to load caregiver data:", err);
      
      // Check if it's an unauthorized error
      if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
        console.log("CaregiverDashboard: Unauthorized error, clearing localStorage and navigating to login");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userType");
        navigate("/login");
        toast({
          title: "Session expired",
          description: "Please log in again.",
          variant: "destructive",
        });
      } else {
        console.log("CaregiverDashboard: Other error, showing toast");
        toast({
          title: "Error loading dashboard",
          description: err.message || "Unable to load your bookings. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      console.log("CaregiverDashboard: Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!locationInput.trim()) {
      toast({
        title: "Location required",
        description: "Please enter a location",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingLocation(true);
      if (caregiverId) {
        await userAPI.updateProfile(caregiverId, { location: locationInput });
        setCaregiverData({ ...caregiverData, location: locationInput });
        toast({
          title: "Success",
          description: "Location added successfully",
        });
        setShowLocationPrompt(false);
        setLocationInput("");
      }
    } catch (err: any) {
      console.error("Failed to add location:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add location",
        variant: "destructive",
      });
    } finally {
      setAddingLocation(false);
    }
  };

  const handleAcceptJob = async (bookingId: string) => {
    try {
      // move status to payment-pending so family knows to pay next
      await bookingAPI.update(bookingId, { status: "payment-pending" });
      toast({
        title: "Success",
        description: "Job request accepted! waiting for family payment.",
      });
      loadCaregiverData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to accept job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineJob = async (bookingId: string) => {
    try {
      await bookingAPI.update(bookingId, { status: "cancelled" });
      toast({
        title: "Success",
        description: "Job request declined.",
      });
      loadCaregiverData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to decline job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteJob = async (bookingId: string) => {
    try {
      await bookingAPI.update(bookingId, { status: "completed" });
      toast({
        title: "Success",
        description: "Session marked as completed!",
      });
      loadCaregiverData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to mark session as completed. Please try again.",
        variant: "destructive",
      });
    }
  };





  if (isLoading) {
    console.log("CaregiverDashboard: Rendering loading state");
    return (
      <DashboardLayout sidebarItems={sidebarItems} userType="caregiver">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  console.log("CaregiverDashboard: Rendering main content");

  try {
    return (
      <DashboardLayout sidebarItems={sidebarItems} userType="caregiver">
        <div className="space-y-8 animate-in fade-in-50 duration-500">
        {/* Pending Approval Modal */}
        {showPendingApprovalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg shadow-lg max-w-md w-full p-8 text-center space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Account Under Review</h2>
                <p className="text-muted-foreground">Your caregiver account is pending admin approval</p>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm font-medium text-foreground flex items-center gap-2"><Clipboard className="h-4 w-4" /> What's Next:</p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>Upload your professional documents and credentials</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>Our admin team will review your qualifications</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>You'll be notified via email when approved</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-left">
                <p className="text-sm text-foreground">
                  <strong>Expected Timeline:</strong> Most approvals are completed within 24-48 hours. Your documents are important to us!
                </p>
              </div>
              
              <Button 
                onClick={() => setShowPendingApprovalModal(false)}
                variant="outline"
                className="w-full"
              >
                I Understand
              </Button>
            </div>
          </div>
        )}

        {/* Document Upload Prompt Modal */}
        {caregiverId && (
          <DocumentUploadPromptModal
            isOpen={showDocumentPrompt}
            caregiverId={caregiverId}
            onClose={() => setShowDocumentPrompt(false)}
            onSuccess={() => {
              setHasUploadedDocuments(true);
              toast({
                title: "Documents submitted",
                description: "Your documents have been submitted for admin review.",
              });
            }}
          />
        )}

        {/* Location Prompt Modal */}
        <Dialog open={showLocationPrompt} onOpenChange={setShowLocationPrompt}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Add Your Location
              </DialogTitle>
              <DialogDescription>
                Families need to know your location to find you. Please add your city or area.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <label htmlFor="location" className="text-sm font-medium text-foreground">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g., Accra, Kumasi, Tema"
                  className="input-base w-full"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddLocation();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationPrompt(false)}
              >
                Skip for now
              </Button>
              <Button
                type="button"
                onClick={handleAddLocation}
                disabled={addingLocation || !locationInput.trim()}
              >
                {addingLocation ? "Adding..." : "Add Location"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {currentPage === "overview" && `Welcome, ${caregiverName}! `}<span role="img" aria-label="welcome"></span>
              {currentPage === "requests" && "Job Requests"}
              {currentPage === "schedule" && "Your Schedule"}
              {currentPage === "reviews" && "My Reviews"}
              {currentPage === "payments" && "Payment History"}
              {currentPage === "history" && "Booking History"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {currentPage === "overview" && "Manage your caregiving requests and earnings"}
              {currentPage === "requests" && "Review and manage pending job requests"}
              {currentPage === "schedule" && "View your upcoming and completed bookings"}
              {currentPage === "reviews" && "See what families are saying about you"}
              {currentPage === "payments" && "View and confirm family payments"}
              {currentPage === "history" && "View your past and completed bookings with families"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success border border-success/30 text-sm font-medium">
              <Shield className="h-4 w-4" />
              Verified
            </span>
          </div>
        </div>

        {/* OVERVIEW PAGE */}
        {currentPage === "overview" && (
          <>
            {/* Stats Grid - Enhanced with real data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-elevated p-5 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending</span>
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="h-4 w-4 text-warning" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">Job requests</p>
              </div>
              <div className="card-elevated p-5 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</span>
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.completed}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="card-elevated p-5 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rating</span>
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Star className="h-4 w-4 text-warning" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.avgRating?.toFixed(1) || "N/A"}</p>
                <p className="text-xs text-muted-foreground mt-1">Average</p>
              </div>
              <div className="card-elevated p-5 hover:shadow-lg transition-shadow duration-300 overflow-hidden min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earnings</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-success">GH₵</span>
                    <div className="p-2 rounded-lg bg-success/10">
                      <DollarSign className="h-4 w-4 text-success" aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <p className="text-3xl font-bold text-foreground whitespace-nowrap">{stats.earnings.toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success" aria-hidden="true" />
                  From completed jobs
                </p>
              </div>
            </div>

            {/* Profile Section */}
            <div className="card-elevated p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Profile
              </h2>
              <div className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-foreground">{caregiverData?.location || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Daily Rate</label>
                    <p className="text-foreground">GH₵{caregiverData?.dailyRate || 0}</p>
                  </div>
                </div>
                
                {caregiverData?.bio && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bio</label>
                    <p className="text-foreground text-sm">{caregiverData.bio}</p>
                  </div>
                )}
                
                {caregiverData?.providedServices && caregiverData.providedServices.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Services Provided</label>
                    <div className="flex flex-wrap gap-2">
                      {caregiverData.providedServices.map((service: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {caregiverData?.certifications && caregiverData.certifications.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Certifications & Qualifications</label>
                    <div className="flex flex-wrap gap-2">
                      {caregiverData.certifications.map((cert: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-secondary/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/settings")}
                    className="w-full sm:w-auto"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Update Profile & Services
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-5 gap-6">
            {/* Job Requests - Enhanced */}
            <div className="lg:col-span-3 space-y-4">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Pending Job Requests</h2>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-warning text-warning-foreground text-xs font-bold">
                  {filteredRequests.length}
                </span>
              </div>

              {/* Search and Filter */}
              <div className="mb-6 pb-6 border-b border-secondary/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by family name or service type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-base pl-10 text-sm w-full"
                  />
                </div>
              </div>

              {/* Job Requests List */}
              {filteredRequests.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredRequests.map((job: any) => (
                    <div
                      key={job._id || job.id}
                      className="p-4 rounded-lg border border-secondary/30 bg-gradient-to-r from-secondary/50 to-secondary/25 hover:from-secondary hover:to-secondary/50 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground">{job.userId?.name || "Family"}</p>
                            {job.urgent && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-1">
                                <Flame className="h-3 w-3" /> Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{(job.serviceType === 'hourly' ? 'Daily Care' : job.serviceType) || "Care Service"}</p>
                          {/* show requested dates */}
                          <p className="text-xs text-muted-foreground">{formatBookingPrimaryDate(job)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-lg">GH₵{(job.totalPrice || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{getBookingDayCount(job)} day{getBookingDayCount(job) !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {job.notes && (
                        <p className="text-sm text-muted-foreground mb-4 italic border-l-2 border-primary/30 pl-3">
                          {job.notes}
                        </p>
                      )}

                      {/* Detail toggle */}
                      <div className="mb-2">
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setExpandedRequests(prev =>
                              prev.includes(job._id)
                                ? prev.filter(id => id !== job._id)
                                : [...prev, job._id]
                            );
                          }}
                        >
                          {expandedRequests.includes(job._id) ? "Hide details" : "View details"}
                        </button>
                      </div>

                      {expandedRequests.includes(job._id) && (
                        <div className="text-xs text-muted-foreground mb-4 space-y-3">
                          <div>
                            <p className="font-semibold mb-2">Requested dates:</p>
                            <ul className="list-disc list-inside">
                              {getBookingDateArray(job).map((d: Date, idx: number) => (
                                <li key={idx}>{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-2 border-t border-secondary/50">
                            <p className="font-semibold mb-2">Family Information:</p>
                            <div className="space-y-1 ml-2">
                              {job.userId?.phone && (
                                <div className="flex items-center gap-2">
                                  <Smartphone className="h-3 w-3 flex-shrink-0" />
                                  <span>{job.userId.phone}</span>
                                </div>
                              )}
                              {job.userId?.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{job.userId.email}</span>
                                </div>
                              )}
                              {job.userId?.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span>{job.userId.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-3 border-t border-secondary/50">
                        <Button
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => handleAcceptJob(job._id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleDeclineJob(job._id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No pending job requests</p>
                  <p className="text-xs text-muted-foreground">Check back soon for new opportunities!</p>
                </div>
              )}
            </div>
          </div>

          {/* Schedule - Enhanced */}
          <div className="lg:col-span-2">
            <div className="card-elevated p-6 h-fit sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">Your Schedule</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={acceptedFilter}
                    onChange={(e) => setAcceptedFilter(e.target.value)}
                    className="input-base text-xs cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Schedule List */}
              {filteredSchedule.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredSchedule
                    .filter((b:any)=>b)
                    .map((booking: any, index: number) => {
                    const datesArr = getBookingDateArray(booking);
                    const firstDate = datesArr[0] || new Date();
                    const isToday = datesArr.some(d => d.toDateString() === new Date().toDateString());
                    
                    return (
                      <div
                        key={booking?._id || booking?.id || index}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isToday
                            ? "bg-primary/8 border-primary/30"
                            : "bg-secondary/30 border-secondary/50 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-bold text-primary uppercase tracking-wide">
                            {formatBookingPrimaryDate(booking)}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              booking.status === "completed"
                                ? "bg-success/15 text-success"
                                : "bg-info/15 text-info"
                            }`}
                          >
                            {booking.status === "completed" ? "Done" : "Scheduled"}
                          </span>
                        </div>

                        <p className="font-semibold text-foreground mb-1">{booking.userId?.name || "Family"}</p>
                        <p className="text-sm text-muted-foreground mb-2">{(booking.serviceType === 'hourly' ? 'Daily Care' : booking.serviceType) || "Care Service"}</p>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {getBookingDayCount(booking) > 1 ? `${getBookingDayCount(booking)} day(s)` : 'All day'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No scheduled bookings yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Accept job requests to see them here</p>
                </div>
              )}
            </div>
          </div>
          </div>
          </>
        )}

        {/* JOB REQUESTS PAGE */}
        {currentPage === "requests" && (
          <div className="card-elevated p-6 space-y-6">
            {/* Search and Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by family name or service type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-base pl-10 text-sm w-full"
              />
            </div>

            {/* Job Requests List */}
            {filteredRequests.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredRequests.map((job: any) => (
                  <div
                    key={job._id || job.id}
                    className="p-6 rounded-lg border border-secondary/30 bg-gradient-to-r from-secondary/50 to-secondary/25 hover:from-secondary hover:to-secondary/50 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-lg text-foreground">{job.userId?.name || "Family Member"}</p>
                          {job.urgent && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-1">
                              <Flame className="h-3 w-3" /> Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{(job.serviceType === 'hourly' ? 'Daily Care' : job.serviceType) || "Care Service"}</p>
                        
                        {/* Contact Information */}
                        <div className="mt-3 space-y-1 text-xs">
                          {job.userId?.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Smartphone className="h-3 w-3" />
                              <span>{job.userId.phone}</span>
                            </div>
                          )}
                          {job.userId?.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{job.userId.email}</span>
                            </div>
                          )}
                          {job.userId?.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{job.userId.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-2xl">GH₵{(job.totalPrice || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{job.numberOfDays || job.duration || 1} day{(job.numberOfDays || job.duration || 1) !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {job.notes && (
                      <p className="text-muted-foreground mb-4 italic border-l-2 border-primary/30 pl-3 py-2">
                        "{job.notes}"
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-secondary/50">
                      <Button
                        size="lg"
                        className="gap-2"
                        onClick={() => handleAcceptJob(job._id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleDeclineJob(job._id)}
                      >
                        <XCircle className="h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Briefcase className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground font-medium">No pending job requests</p>
                <p className="text-muted-foreground mt-2">Check back soon for new opportunities!</p>
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE PAGE */}
        {currentPage === "schedule" && (
          <div className="card-elevated p-6 space-y-6">
            {/* Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground">Filter:</label>
              <select
                value={acceptedFilter}
                onChange={(e) => setAcceptedFilter(e.target.value)}
                className="input-base text-sm"
              >
                <option value="all">All Bookings</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Schedule List */}
            {filteredSchedule.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredSchedule
                  .filter((b:any)=>b)
                  .map((booking: any, index: number) => {
                  const datesArr = getBookingDateArray(booking);
                  const firstDate = datesArr[0] || new Date();
                  const isToday = datesArr.some(d => d.toDateString() === new Date().toDateString());
                  
                  return (
                    <div
                      key={booking?._id || booking?.id || index}
                      className={`p-6 rounded-lg border transition-all duration-200 ${
                        isToday
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/30 border-secondary/50 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm font-bold text-primary uppercase tracking-wide">
                            {formatBookingPrimaryDate(booking)}
                          </p>
                          {isToday && <span className="text-xs text-primary font-semibold mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> TODAY</span>}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                            booking.status === "completed"
                              ? "bg-success/15 text-success"
                              : "bg-info/15 text-info"
                          }`}
                        >
                          {booking.status === "completed" ? <><CheckCircle2 className="h-4 w-4" /> Completed</> : <><Calendar className="h-4 w-4" /> Scheduled</>}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Family</p>
                          <p className="font-bold text-lg text-foreground">{booking.userId?.name || "Family"}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {getBookingDayCount(booking) > 1 ? `${getBookingDayCount(booking)} day(s)` : 'All day'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-4 border-t border-border flex gap-2">
                        {booking.status !== "completed" && (
                          <Button
                            size="sm"
                            className="flex-1 bg-success hover:bg-success/90"
                            onClick={() => handleCompleteJob(booking._id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Calendar className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground font-medium">No scheduled bookings</p>
                <p className="text-muted-foreground mt-2">Accept job requests to add them to your schedule</p>
              </div>
            )}
          </div>
        )}

        {/* REVIEWS PAGE */}
        {currentPage === "reviews" && (
          <div className="card-elevated p-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Rating Summary */}
              <div className="md:col-span-1 space-y-4">
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {caregiverData?.rating?.toFixed(1) || "N/A"}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(caregiverData?.rating || 0)
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {acceptedBookings.filter((b: any) => b && b.rating).length} reviews
                  </p>
                </div>
              </div>

              {/* Reviews List */}
              <div className="md:col-span-2 space-y-4">
                {acceptedBookings.filter((b: any) => b && b.status === "completed" && b.rating).length > 0 ? (
                  acceptedBookings
                    .filter((b: any) => b && b.status === "completed" && b.rating)
                    .slice(0, 5)
                    .map((booking: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border border-secondary/30 bg-secondary/20">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-foreground">{booking.userId?.name || "Family"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(booking.bookingDate || booking.startDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < booking.rating
                                    ? "fill-warning text-warning"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {booking.reviewNotes && (
                          <p className="text-sm text-muted-foreground italic">"{booking.reviewNotes}"</p>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center">
                    <Star className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground">No reviews yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Complete bookings to receive reviews from families</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS PAGE */}
        {currentPage === "payments" && (
          <div className="card-elevated p-6 space-y-6">
            {/* Payment Details Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Your Payment Methods
              </h2>
              
              {caregiverData?.mobileMoneyNumber || caregiverData?.accountNumber ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Mobile Money Card */}
                  {caregiverData?.mobileMoneyNumber && (
                    <div className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Mobile Money</p>
                            <p className="font-semibold text-foreground">Payment Method</p>
                          </div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-white dark:bg-background/50 p-3 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Mobile Money Number</p>
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-sm font-semibold text-foreground">{caregiverData.mobileMoneyNumber}</p>
                            <button
                              onClick={() => copyToClipboard(caregiverData.mobileMoneyNumber, 'mobileMoneyNumber')}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedField === 'mobileMoneyNumber' ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {caregiverData.mobileMoneyName && (
                          <div className="bg-white dark:bg-background/50 p-3 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Account Name</p>
                            <p className="text-sm font-semibold text-foreground">{caregiverData.mobileMoneyName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Bank Account Card */}
                  {caregiverData?.accountNumber && (
                    <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                            <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Bank Account</p>
                            <p className="font-semibold text-foreground">Payment Method</p>
                          </div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-white dark:bg-background/50 p-3 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-sm font-semibold text-foreground">{caregiverData.accountNumber}</p>
                            <button
                              onClick={() => copyToClipboard(caregiverData.accountNumber, 'accountNumber')}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedField === 'accountNumber' ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {caregiverData.accountName && (
                          <div className="bg-white dark:bg-background/50 p-3 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Account Name</p>
                            <p className="text-sm font-semibold text-foreground">{caregiverData.accountName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground mb-2">No Payment Methods Added</p>
                      <p className="text-sm text-muted-foreground mb-4">Families cannot pay you without payment details. Please add your Mobile Money or Bank Account information.</p>
                      <Button
                        onClick={() => navigate("/settings")}
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Go to Settings
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            {(caregiverData?.mobileMoneyNumber || caregiverData?.accountNumber) && acceptedBookings.filter((b: any) => b && (b.status === "confirmed" || b.status === "payment-pending") && b.paymentStatus !== "completed").length > 0 && (
              <div className="border-t border-border pt-6" />
            )}

            {/* Pending Payments Section */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Pending Payments</h2>
            </div>

            {acceptedBookings.filter((b: any) => b && (b.status === "confirmed" || b.status === "payment-pending") && b.paymentStatus !== "completed").length > 0 ? (
              <div className="grid gap-4">
                {acceptedBookings
                  .filter((b: any) => b && (b.status === "confirmed" || b.status === "payment-pending") && b.paymentStatus !== "completed")
                  .map((booking: any) => (
                    <div
                      key={booking?._id || booking?.id || Math.random()}
                      className="p-5 rounded-lg border border-warning/30 bg-warning/5 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-foreground">
                              {booking.userId?.name || "Family"}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                              booking.paymentStatus === "completed"
                                ? "bg-success/15 text-success"
                                : booking.paymentStatus === "failed"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-warning/15 text-warning"
                            }`}>
                              {booking.paymentStatus || "Pending"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {new Date(booking.bookingDate || booking.startDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Amount Due:</span>
                              <span className="font-semibold text-foreground">GH₵{(booking.totalPrice || 0).toFixed(2)}</span>
                            </div>
                            {booking.paymentMethod && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Payment Method:</span>
                                <span className="font-semibold text-foreground capitalize">{booking.paymentMethod}</span>
                              </div>
                            )}
                            {booking.transactionId && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Transaction ID:</span>
                                <span className="font-mono text-xs text-foreground">{booking.transactionId}</span>
                              </div>
                            )}
                            {booking.receiptUrl && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Receipt:</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1 text-primary hover:text-primary/80 gap-1"
                                  onClick={() => {
                                    const fullUrl = getReceiptUrl(booking.receiptUrl);
                                    window.open(fullUrl, '_blank');
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            className="gap-2 bg-success hover:bg-success/90"
                            onClick={async () => {
                              try {
                                if (!booking) {
                                  console.error('Confirm payment clicked but booking is undefined');
                                  toast({ title: 'Error', description: 'Booking data is missing', variant: 'destructive' });
                                  return;
                                }

                                const bookingId = booking._id || booking.id;
                                if (!bookingId) {
                                  console.error('Booking has no id:', booking);
                                  toast({ title: 'Error', description: 'Booking id is missing', variant: 'destructive' });
                                  return;
                                }

                                await bookingAPI.confirmPayment(bookingId);
                                toast({
                                  title: "Success",
                                  description: "Payment confirmed successfully",
                                });
                                loadCaregiverData();
                              } catch (err: any) {
                                console.error('Confirm payment error:', err);
                                toast({
                                  title: "Error",
                                  description: err.message || "Failed to confirm payment",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Confirm Payment
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <CreditCard className="h-5 w-5 text-primary mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No pending payments</p>
                <p className="text-sm text-muted-foreground">Once families pay, payments will appear here</p>
              </div>
            )}

            {acceptedBookings.filter((b: any) => b && b.paymentStatus === "completed").length > 0 && (
              <div className="mt-8 pt-8 border-t border-border space-y-4">
                <h3 className="text-lg font-bold text-foreground">Completed Payments</h3>
                <div className="grid gap-3">
                  {acceptedBookings
                    .filter((b: any) => b && b.paymentStatus === "completed")
                    .map((booking: any) => (
                      <div
                        key={booking?._id || booking?.id || Math.random()}
                        className="p-4 rounded-lg border border-success/30 bg-success/5 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{booking.userId?.name || "Family"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.bookingDate || booking.startDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-success">GH₵{(booking.totalPrice || 0).toFixed(2)}</p>
                          <p className="text-xs text-success flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY PAGE */}
        {currentPage === "history" && (
          <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Total Bookings</span>
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground">{acceptedBookings.length}</p>
              </div>
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Completed</span>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <p className="text-3xl font-bold text-foreground">{acceptedBookings.filter((b: any) => b.status === 'completed').length}</p>
              </div>
            </div>

            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Completed Bookings</h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 mb-6">
                {['all', 'completed', 'confirmed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAcceptedFilter(f as any)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      acceptedFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : 'Upcoming'}
                  </button>
                ))}
              </div>

              {/* History List */}
              {acceptedBookings.length > 0 ? (
                <div className="divide-y divide-border">
                  {acceptedBookings
                    .filter((b: any) => {
                      if (acceptedFilter === 'all') return true;
                      if (acceptedFilter === 'completed') return b.status === 'completed';
                      if (acceptedFilter === 'confirmed') return b.status === 'confirmed' || b.status === 'pending';
                      return true;
                    })
                    .sort((a: any, b: any) => new Date(b.bookingDate || b.startDate).getTime() - new Date(a.bookingDate || a.startDate).getTime())
                    .map((booking: any) => (
                      <div key={booking._id || booking.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-secondary/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {booking.userId?.profilePicture ? (
                              <img
                                src={getFullImageUrl(booking.userId.profilePicture)}
                                alt={booking.userId?.name || "Family"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Users className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground mb-1">
                              {booking.userId?.name || "Family Member"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">
                              {new Date(booking.bookingDate || booking.startDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit'
                              })}
                            </p>
                            {/* Family Contact Info */}
                            <div className="text-xs text-muted-foreground space-y-1">
                              {booking.userId?.phone && (
                                <div className="flex items-center gap-1">
                                  <Smartphone className="h-3 w-3" />
                                  <span>{booking.userId.phone}</span>
                                </div>
                              )}
                              {booking.userId?.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{booking.userId.email}</span>
                                </div>
                              )}
                              {(booking.userId?.address || booking.userId?.city || booking.userId?.state) && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{[booking.userId?.address, booking.userId?.city, booking.userId?.state].filter(Boolean).join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === "completed" 
                                ? "bg-success/10 text-success" 
                                : booking.status === "confirmed"
                                ? "bg-primary/10 text-primary"
                                : "bg-warning/10 text-warning"
                            }`}>
                              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || "Unknown"}
                            </span>
                            <span className="font-semibold text-foreground">GH₵{(booking.totalPrice || 0).toFixed(2)}</span>
                          </div>
                          {booking.rating && (
                            <div className="text-sm flex items-center gap-1 text-warning">
                              <Star className="h-3 w-3 fill-current" />
                              {booking.rating}/5 
                              {booking.reviewNotes && <span className="text-muted-foreground">- {booking.reviewNotes.substring(0, 30)}...</span>}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/booking/${booking._id}`)}
                            className="mt-2"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-1">No bookings yet</p>
                  <p className="text-sm text-muted-foreground">Your completed and upcoming bookings will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
  } catch (error: any) {
    console.error("CaregiverDashboard: Render error:", error);
    return (
      <DashboardLayout sidebarItems={sidebarItems} userType="caregiver">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-destructive/30 border-t-destructive animate-spin" />
            <p className="text-destructive font-semibold">Error loading dashboard</p>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              {error.message || "An unexpected error occurred while loading your dashboard."}
            </p>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-w-md">
              <p><strong>Debug Info:</strong></p>
              <p>User ID: {localStorage.getItem("userId") || "Not found"}</p>
              <p>User Type: {localStorage.getItem("userType") || "Not found"}</p>
              <p>Token: {localStorage.getItem("token") ? "Present" : "Missing"}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("userId");
                  localStorage.removeItem("userType");
                  window.location.href = "/login";
                }} 
                variant="outline"
              >
                Log Out & Re-login
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }
};

export default CaregiverDashboard;
