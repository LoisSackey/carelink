// Import DashboardLayout component that provides sidebar and common dashboard UI
import DashboardLayout from "@/components/layout/DashboardLayout";
// Import Button UI component for clickable actions
import { Button } from "@/components/ui/button";
// Import Dialog UI component for modal dialogs
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// Import Link component for navigation between pages
import { Link, useNavigate } from "react-router-dom";
// Import hooks for state management
import { useState, useEffect, useMemo } from "react";
// Import map components
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Import location autocomplete utilities
import { searchLocations, createDebounce } from '@/utils/locationAutocomplete';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Import icon components for sidebar menu items and dashboard sections
import {
  LayoutDashboard, // Icon for dashboard/overview
  Calendar,        // Icon for booking/scheduling
  History,         // Icon for past bookings
  Star,            // Icon for ratings/reviews
  Settings,        // Icon for user settings
  Bell,            // Icon for notifications
  Clock,           // Icon for active requests/time
  CheckCircle2,    // Icon for completed sessions
  ArrowRight,      // Icon for navigation/view more
  AlertCircle,     // Icon for alerts
  Search,          // Icon for search
  TrendingUp,      // Icon for trends
  Zap,             // Icon for energy/active
  X,               // Icon for close
  Filter,          // Icon for filter
  ChevronDown,     // Icon for dropdown
  ChevronLeft,     // Icon for previous step
  ChevronRight,    // Icon for next step
  CreditCard,      // Icon for payment
  Building2,       // Icon for bank
  Upload,          // Icon for file upload
  Clipboard,       // Icon for clipboard/checklist
  Gift,            // Icon for party/celebration
} from "lucide-react";
// Import API clients
import { userAPI, bookingAPI, notificationAPI } from "@/lib/api";
// Import toast notifications
import { useToast } from "@/hooks/use-toast";

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
    return first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  return `${first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} (+${dates.length - 1} more)`;
};

// Format booking date range (from date to date)
const formatBookingDateRange = (booking: any): string => {
  const dates = getBookingDateArray(booking);
  if (dates.length === 0) return "";
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  
  if (dates.length === 1) {
    return first.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }
  
  // If same month, use format: "Jan 5-10, 24"
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${last.getDate()}, ${last.getFullYear() % 100}`;
  }
  
  // If same year but different months, use "Jan 28 - Feb 5, 24"
  if (first.getFullYear() === last.getFullYear()) {
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${last.getFullYear() % 100}`;
  }
  
  // Different years
  return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })} - ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`;
};

const getBookingDayCount = (booking: any): number => {
  if (booking.numberOfDays) return booking.numberOfDays;
  if (Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0) return booking.bookingDates.length;
  return 1;
};
// Import payment form
import PaymentForm from "@/components/PaymentForm";
// Import payment status badge
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
// Import FindCaregiver component
import FindCaregiver from "@/pages/FindCaregiver";


// FamilyDashboard component - Main dashboard for family users showing requests, notifications, and past bookings
const FamilyDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState("User");
  const [userId, setUserId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<"overview" | "find" | "history" | "reviews" | "settings" | "bookings">("overview");
  
  // Location prompt modal state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationLatitude, setLocationLatitude] = useState(0);
  const [locationLongitude, setLocationLongitude] = useState(0);
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [neededServices, setNeededServices] = useState<string[]>([]);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const debounceLocationSearch = createDebounce(300);
  
  // services that family can choose when requesting care
  const availableServices = [
    "Basic life needs",
    "Companionship",
    "Physiotherapy",
    "Feeding assistance",
    "Mobility support"
  ];
  
  // Real data state
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // UI state
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationFilter, setNotificationFilter] = useState<string>("all");
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'pending' | 'approved'>('all');

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Payment method state for step 3
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "bank">("momo");
  const [transactionId, setTransactionId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentStep, setPaymentStep] = useState<"method" | "receipt">("method");
  const [bookingIdForPayment, setBookingIdForPayment] = useState<string | null>(null);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successBookingData, setSuccessBookingData] = useState<any>(null);

  // Payment state (for standalone payment form)
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<any>(null);

  // Review state
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  const [reviewFormData, setReviewFormData] = useState({ rating: 0, text: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    setLocationInput(address);
    setLocationLatitude(lat);
    setLocationLongitude(lng);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    
    debounceLocationSearch(async () => {
      if (value.trim().length >= 2) {
        const suggestions = await searchLocations(value);
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    });
  };

  const handleSelectLocation = (suggestion: any) => {
    setLocationInput(suggestion.displayName);
    setLocationLatitude(suggestion.lat);
    setLocationLongitude(suggestion.lng);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  // Component to handle map clicks
  function LocationMarker() {
    useMapEvents({
      click(e) {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      },
    });
    return locationLatitude && locationLongitude ? <Marker position={[locationLatitude, locationLongitude]} /> : null;
  }

  // sidebarItems array - Navigation menu items displayed in left sidebar with icons and paths
  const sidebarItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => setCurrentPage("overview") },
    { icon: <Search className="h-5 w-5" />, label: "Find Caregiver", path: "#find", action: () => setCurrentPage("find") },
    { icon: <History className="h-5 w-5" />, label: "History", path: "#history", action: () => setCurrentPage("history") },
    { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "#reviews", action: () => setCurrentPage("reviews") },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
  ];

  // Generate notifications based on bookings only
  const generateNotifications = (bookings: any[]) => {
    const notifs = bookings
      .filter((b: any) => b && b.status === "confirmed")
      .slice(0, 3)
      .map((b: any, idx: number) => ({
        id: `booking-${b._id}`,
        message: `Your booking on ${new Date(b.bookingDate || b.startDate).toLocaleDateString()} has been confirmed`,
        time: "Just now",
        unread: idx === 0,
        type: "booking"
      }));
    return notifs;
  };

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    
    if (filterStatus !== "all") {
      filtered = filtered.filter((b: any) => b && b.status === filterStatus);
    }
    
    if (searchTerm) {
      filtered = filtered.filter((b: any) => 
        (b && b.serviceType?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b && b.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered.sort((a: any, b: any) => {
      return new Date(b.bookingDate || b.startDate).getTime() - new Date(a.bookingDate || a.startDate).getTime();
    });
  }, [bookings, filterStatus, searchTerm]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications.filter(n => !dismissedNotifications.has(n.id));
    
    if (notificationFilter !== "all") {
      filtered = filtered.filter((n: any) => n.type === notificationFilter);
    }
    
    return filtered;
  }, [notifications, notificationFilter, dismissedNotifications]);

  // Calculate statistics
  const stats = useMemo(() => {
    const active = bookings.filter((b: any) => b && (b.status === "confirmed" || b.status === "pending")).length;
    const completed = bookings.filter((b: any) => b && b.status === "completed").length;
    
    return { active, completed };
  }, [bookings]);

  // Debug mode when URL contains ?debug=1
  const debugMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";

  // Load all data on mount
  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBookings = async () => {
    try {
      let storedUserId = localStorage.getItem("userId");
      if (!storedUserId) {
        const userStr = localStorage.getItem("user");
        storedUserId = userStr ? (JSON.parse(userStr).id as string) : null;
      }
      if (storedUserId) {
        const bookingsData = await bookingAPI.getByUserId(storedUserId);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }
    } catch (err: any) {
      console.error("Failed to refresh bookings:", err);
      // Silently fail for refresh operations
    }
  };

  const loadUserData = async () => {
    try {
      let storedUserId = localStorage.getItem("userId");
      const storedToken = localStorage.getItem("token");
      const userType = localStorage.getItem("userType");
      const fromPaymentFlow = sessionStorage.getItem("fromPaymentFlow");

      console.log("FamilyDashboard - Auth check - userId:", storedUserId, "token:", !!storedToken, "userType:", userType, "fromPaymentFlow:", fromPaymentFlow);

      if (!storedUserId) {
        const userStr = localStorage.getItem("user");
        storedUserId = userStr ? (JSON.parse(userStr).id as string) : null;
      }

      // Require either a userId OR a token to be present
      // Don't redirect just because one is missing if we're coming from payment flow
      if (!storedUserId && !storedToken && !fromPaymentFlow) {
        console.log("No userId or token found, redirecting to login");
        navigate("/login");
        return;
      }

      // If we have a token or userId, allow access regardless of userType
      // userType might not be set when coming from payment flow
      if (userType && userType !== "family") {
        console.log("User type is not family:", userType);
        navigate("/login");
        return;
      }
      
      // If we arrived here via the payment flow, show a quick success toast
      if (fromPaymentFlow) {
        toast({
          title: "Payment Completed",
          description: "Your payment was recorded. Check your bookings for details.",
        });
        sessionStorage.removeItem("fromPaymentFlow");
      }

      setUserId(storedUserId);

      // Load user profile
      const userData = await userAPI.getProfile(storedUserId);
      setUserName(userData.name || "User");
      setUserLocation(userData.location || null);

      // Check if user has location, phone, or services needed; if any missing, show prompt
      if (!userData.location || !userData.phone || !userData.neededServices || userData.neededServices.length === 0) {
        // prefill fields if present
        setLocationInput(userData.location || "");
        setPhoneInput(userData.phone || "");
        setNeededServices(userData.neededServices || []);
        setShowLocationPrompt(true);
      }

      // Load bookings
      const bookingsData = await bookingAPI.getByUserId(storedUserId);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);

      // Load notifications from backend
      try {
        const notificationsData = await notificationAPI.getByUserId(storedUserId);
        const formattedNotifications = Array.isArray(notificationsData)
          ? notificationsData.map((n: any) => ({
              id: n._id,
              message: n.message,
              time: new Date(n.createdAt).toLocaleDateString(),
              unread: !n.read,
              type: n.type,
            }))
          : [];
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter((n: any) => n.unread).length);
      } catch (err) {
        // If notifications fail to load, generate from bookings as fallback
        const notifs = generateNotifications(Array.isArray(bookingsData) ? bookingsData : []);
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => n.unread).length);
      }
    } catch (err: any) {
      console.error("Failed to load user data:", err);
      setLoadError(err?.message || String(err));
      
      // Only redirect if it's a true 401 Unauthorized error during login check
      // Don't logout on API errors that happen during data fetching
      if (err.message?.includes("401") || (err.message?.includes("Not authorized") && !err.message?.includes("location"))) {
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
        // For other errors (network, server errors), don't logout - user can still use dashboard
        console.warn("Dashboard data loading error (non-fatal):", err.message);
        // Silently fail for non-critical data loading operations
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding/updating family location
  const handleAddLocation = async () => {
    // validation for all required fields
    if (!locationInput.trim() || !phoneInput.trim() || neededServices.length === 0) {
      toast({
        title: "Information required",
        description: "Please provide location, phone number, and at least one service needed.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingLocation(true);

      // prepare update payload
      const updateData: any = {
        location: locationInput,
        latitude: locationLatitude,
        longitude: locationLongitude,
        phone: phoneInput,
        neededServices
      };

      // Update user profile
      if (userId) {
        await userAPI.updateProfile(userId, updateData);
        setUserLocation(locationInput);

        toast({
          title: "Success",
          description: `Profile information saved.`,
        });

        setShowLocationPrompt(false);
        setLocationInput("");
        setPhoneInput("");
        setNeededServices([]);
      }
    } catch (err: any) {
      console.error("Failed to update location:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingLocation(false);
    }
  };

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => new Set(prev).add(id));
  };

  // Handle submitting a review for a completed booking
  const handleSubmitReview = async (bookingId: string) => {
    try {
      if (reviewFormData.rating === 0) {
        toast({
          title: "Error",
          description: "Please select a rating",
          variant: "destructive",
        });
        return;
      }

      if (!reviewFormData.text.trim()) {
        toast({
          title: "Error",
          description: "Please write a review",
          variant: "destructive",
        });
        return;
      }

      setSubmittingReview(true);

      // Update booking with review data
      const updateResult = await bookingAPI.update(bookingId, {
        rating: reviewFormData.rating,
        reviewNotes: reviewFormData.text,
      });

      console.log("Review submitted successfully:", updateResult);

      // Update local state to reflect the change immediately
      setBookings(bookings.map(b => 
        b._id === bookingId 
          ? { ...b, rating: reviewFormData.rating, reviewNotes: reviewFormData.text }
          : b
      ));

      toast({
        title: "Success",
        description: "Review submitted successfully! It will appear on the caregiver's profile.",
      });

      // Reset form
      setReviewFormData({ rating: 0, text: "" });
      setSelectedBookingForReview(null);
    } catch (err: any) {
      console.error("Error submitting review:", {
        error: err,
        message: err?.message,
        bookingId,
        reviewData: { rating: reviewFormData.rating, text: reviewFormData.text }
      });
      toast({
        title: "Error",
        description: err?.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handler after user logs in from modal
  const handleAfterLogin = () => {
    setShowLoginModal(false);
    // User is now logged in, can proceed with bookings
  };

  // Handle payment method selection in step 3
  const handlePaymentMethodSelect = (method: "momo" | "bank") => {
    setPaymentMethod(method);
    // move to receipt step for non-cash methods
    setPaymentStep("receipt");
  };

  // Submit payment in step 3
  const submitPayment = async () => {
    try {
      setBookingSubmitting(true);
      setBookingError("");

      if (!bookingIdForPayment) {
        setBookingError("Booking ID not found");
        return;
      }

      // Update booking with payment info
      const paymentData = {
        paymentMethod,
        transactionId: transactionId || null,
        paymentStatus: "pending",
      };

      await bookingAPI.updatePayment(bookingIdForPayment, paymentData);

      // Upload receipt if provided
      if (receiptFile) {
        await bookingAPI.uploadReceipt(bookingIdForPayment, receiptFile);
      }

      // Show success and close modal
      setShowBookingModal(false);
      setBookingStep(1);
      
      toast({
        title: "✓ Payment Recorded!",
        description: `Payment method: ${paymentMethod.toUpperCase()}. Receipt uploaded successfully.`,
      });

      // Reload bookings
      loadUserData();

      // Reset all booking state
      setSelectedDates([]);
      setPaymentMethod("momo");
      setTransactionId("");
      setReceiptFile(null);
      setPaymentStep("method");
      setBookingIdForPayment(null);
    } catch (err: any) {
      console.error("Payment error:", err);
      setBookingError(err.message || "Failed to process payment");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Submit booking
  const submitBooking = async () => {
    if (selectedDates.length === 0) {
      setBookingError("Please select at least one date");
      return;
    }

    // Verify token is still valid before submitting
    const token = localStorage.getItem("token");
    if (!token) {
      setBookingError("You must be logged in to make a booking");
      setShowBookingModal(false);
      setShowLoginModal(true);
      return;
    }

    try {
      setBookingSubmitting(true);
      setBookingError("");

      const userStr = localStorage.getItem("user");
      const currentUserId = userStr ? JSON.parse(userStr).id : null;

      if (!currentUserId) {
        setBookingError("You must be logged in to make a booking");
        setShowBookingModal(false);
        setShowLoginModal(true);
        return;
      }

      // Create single booking with all selected dates
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      console.log("selectedDates count:", selectedDates.length);
      console.log("selectedDates:", selectedDates);
      console.log("sortedDates:", sortedDates);
      
      const bookingData = {
        userId: currentUserId,
        bookingDate: sortedDates[0].toISOString(),
        bookingDates: sortedDates.map(date => date.toISOString()),
        numberOfDays: selectedDates.length,
        status: "pending",
        totalPrice: selectedDates.length * 500,
        bookingType: "daily",
        serviceType: "daily",
      };
      console.log("FamilyDashboard creating booking", bookingData);
      console.log("bookingDates array in bookingData:", bookingData.bookingDates);
      console.log("bookingDates length:", bookingData.bookingDates?.length);
      const bookingResult = await bookingAPI.create(bookingData);
      console.log("Booking result:", bookingResult);
      console.log("Booking result bookingDates:", bookingResult?.bookingDates);
      const bookingId = bookingResult?._id;
      console.log("Booking ID:", bookingId);
      
      // Store booking ID for payment operations later and prepare success modal data
      setBookingIdForPayment(bookingId);
      const formattedDates = selectedDates
        .sort((a, b) => a.getTime() - b.getTime())
        .map(d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
        .join(', ');
      setSuccessBookingData({
        bookingId,
        caregiverName: bookingResult?.caregiverName || bookingResult?.caregiver?.name || 'Caregiver',
        formattedDates,
        totalDays: selectedDates.length,
        totalPrice: selectedDates.length * 500,
      });
      setShowSuccessModal(true);

      // Reset booking flow state (close modal later)
      setSelectedDates([]);
      setBookingStep(1);
      
      // Reset payment form state too just in case
      setPaymentMethod("momo");
      setTransactionId("");
      setReceiptFile(null);
      setPaymentStep("method");
      
      // Create notification for the family
      const totalDaysCount = selectedDates.length;
      const totalPriceAmount = selectedDates.length * 500;
      const newNotification = {
        id: `booking-${Date.now()}`,
        message: `✓ Booking confirmed for ${totalDaysCount} day(s)`,
        time: "Just now",
        unread: true,
        type: "booking"
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show enhanced toast with more details
      toast({
        title: "✓ Booking Confirmed!",
        description: `${totalDaysCount} day(s) has been booked successfully. Total: GH₵${totalPriceAmount.toFixed(2)}`,
      });

      // Reload bookings
      if (userId) {
        const bookingsData = await bookingAPI.getByUserId(userId);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }
    } catch (err: any) {
      console.error("Booking submission error:", err);
      
      // Check if it's an authentication error
      if (err.message?.includes("Not authorized") || err.message?.includes("401")) {
        // Session expired during booking - show login modal instead of logout
        setShowBookingModal(false);
        setShowLoginModal(true);
        setBookingError("Your session expired. Please log in again and try booking.");
        toast({
          title: "Session expired",
          description: "Please log in again to complete your booking.",
          variant: "destructive",
        });
      } else {
        // Show error in modal for user to see
        setBookingError(err.message || "Failed to create booking. Please try again.");
      }
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Get available dates for booking
  const getAvailableDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      dates.push({
        day: dayOfWeek,
        date: date.getDate(),
        fullDate: new Date(date),
        available: date.getDay() !== 4
      });
    }
    return dates;
  };

  const bookingTimes = [
    "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
    "4:00 PM", "5:00 PM"
  ];



  if (isLoading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} userType="family">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} userType="family">
      <div className="space-y-8 animate-in fade-in-50 duration-500 max-w-[1200px] mx-auto">
        {debugMode && (
          <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10 text-sm text-foreground">
            <div className="font-semibold mb-2">Debug Info</div>
            <div className="grid grid-cols-2 gap-2">
              <div>isLoading:</div><div>{String(isLoading)}</div>
              <div>userId:</div><div>{userId || "-"}</div>
              <div>userName:</div><div>{userName}</div>
              <div>userLocation:</div><div>{userLocation || "-"}</div>
              <div>bookings:</div><div>{bookings?.length ?? 0}</div>
              <div>notifications:</div><div>{notifications?.length ?? 0}</div>
              <div>loadError:</div><div className="text-destructive">{loadError || "-"}</div>
            </div>
          </div>
        )}
        {/* Page header */}
        <div className="mb-2">
          {currentPage === "overview" && (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.35em] mb-1">Overview</p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-950">Good to see you, {userName}</h1>
            </>
          )}
          {currentPage === "find" && (
            <>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Find Caregiver</p>
              <h1 className="text-2xl font-bold text-slate-900">Browse Caregivers</h1>
            </>
          )}
          {currentPage === "history" && (
            <>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">History</p>
              <h1 className="text-2xl font-bold text-slate-900">Booking History</h1>
            </>
          )}
          {currentPage === "reviews" && (
            <>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Reviews</p>
              <h1 className="text-2xl font-bold text-slate-900">My Reviews</h1>
            </>
          )}
        </div>

        {/* OVERVIEW PAGE */}
        {currentPage === "overview" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Active bookings */}
              <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)]">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.3em] mb-3">Active</p>
                <p className="text-[56px] font-extrabold text-slate-950 leading-none">{stats.active}</p>
                <p className="text-sm text-slate-500 mt-2">
                  {stats.active > 0 ? "booking(s) in progress" : "no active bookings"}
                </p>
              </div>

              {/* Completed sessions */}
              <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)]">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.3em] mb-3">Completed</p>
                <p className="text-[56px] font-extrabold text-slate-950 leading-none">{stats.completed}</p>
                <p className="text-sm text-slate-500 mt-2">care sessions</p>
              </div>

              {/* Quick actions */}
              <div className="bg-primary rounded-[20px] p-6 col-span-2 md:col-span-1 flex flex-col justify-between shadow-[0_24px_56px_-32px_rgba(196,90,65,0.6)]">
                <p className="text-xs font-semibold text-white/80 uppercase tracking-[0.3em] mb-6">Quick actions</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setCurrentPage("find")}
                    className="flex items-center justify-between text-sm font-medium text-white hover:text-white/80 transition-colors"
                  >
                    Find a caregiver <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage("history")}
                    className="flex items-center justify-between text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    View history <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage("reviews")}
                    className="flex items-center justify-between text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Write a review <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid lg:grid-cols-3 gap-5">
              {/* Recent bookings — 2/3 width */}
              <div className="lg:col-span-2 bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-slate-950">Recent Bookings</h2>
                  <button
                    onClick={() => setCurrentPage("history")}
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    See all <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {bookings
                  .filter((b: any) => ["pending", "confirmed", "in-progress"].includes(b.status))
                  .sort((a: any, b: any) => new Date(b.bookingDate || b.startDate || 0).getTime() - new Date(a.bookingDate || a.startDate || 0).getTime())
                  .slice(0, 5).length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {bookings
                      .filter((b: any) => ["pending", "confirmed", "in-progress"].includes(b.status))
                      .sort((a: any, b: any) => new Date(b.bookingDate || b.startDate || 0).getTime() - new Date(a.bookingDate || a.startDate || 0).getTime())
                      .slice(0, 5)
                      .map((booking: any) => {
                        const caregiverName = booking.caregiver?.name || booking.caregiverId?.name || "Caregiver";
                        const initials = caregiverName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                        const date = new Date(booking.bookingDate || booking.startDate);
                        const statusLabel =
                          booking.status === "in-progress" ? "Active" :
                          booking.status === "confirmed" ? "Confirmed" :
                          booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1);
                        const statusClass =
                          booking.status === "confirmed" ? "bg-[#C45A41]/10 text-[#C45A41]" :
                          booking.status === "in-progress" ? "bg-[#C45A41]/10 text-[#C45A41]" :
                          "bg-slate-100 text-slate-500";

                        return (
                          <div key={booking._id || booking.id} className="flex items-center gap-3 py-3 group">
                            <div className="w-10 h-10 rounded-2xl bg-[#F8E6DE] flex items-center justify-center text-[#C45A41] font-semibold text-sm flex-shrink-0">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-950 truncate">{caregiverName}</p>
                              <p className="text-xs text-slate-400">
                                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 mb-1">No active bookings yet</p>
                    <button
                      onClick={() => setCurrentPage("find")}
                      className="text-xs text-slate-900 underline underline-offset-2 hover:no-underline mt-1"
                    >
                      Find a caregiver
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications — 1/3 width */}
              <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] h-fit sticky top-4">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-slate-950 flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#C45A41] text-white text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </h2>
                  <Bell className="h-4 w-4 text-slate-400" />
                </div>

                {filteredNotifications.length > 0 ? (
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {filteredNotifications.map((notif: any) => (
                      <div
                        key={notif.id}
                        className="flex items-start gap-2.5 py-2.5 group"
                      >
                        {/* Unread dot */}
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${notif.unread ? 'bg-[#C45A41]' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${notif.unread ? 'text-slate-950 font-medium' : 'text-slate-500'}`}>
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{notif.time}</p>
                        </div>
                        <button
                          onClick={() => dismissNotification(notif.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 hover:text-slate-700 text-slate-300"
                          aria-label="Dismiss"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">All caught up</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* BOOKING MODAL */}
        <Dialog open={showBookingModal} onOpenChange={(open) => {
          setShowBookingModal(open);
          if (!open) {
            setBookingStep(1);
            setSelectedDates([]);
            setBookingError("");
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {bookingStep === 1 && "Select Dates for Daily Care"}
                {bookingStep === 2 && "Confirm Your Booking"}
                {bookingStep === 3 && "Select Payment Method"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Step 1: Date Selection */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Book Care Services</p>
                      <p className="text-sm text-muted-foreground">GH₵500/day</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">Select dates for daily care</label>
                    <p className="text-xs text-muted-foreground mb-4">Click dates to select multiple days</p>
                    <div className="grid grid-cols-7 gap-2">
                      {getAvailableDates().map((date, idx) => {
                        const isSelected = selectedDates.some(
                          (d) => d.getDate() === date.date && d.getMonth() === date.fullDate.getMonth()
                        );
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedDates(selectedDates.filter(d => !(d.getDate() === date.date && d.getMonth() === date.fullDate.getMonth())));
                              } else {
                                setSelectedDates([...selectedDates, date.fullDate]);
                              }
                            }}
                            disabled={!date.available}
                            className={`p-3 rounded-lg text-center transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-2 border-primary"
                                : date.available
                                ? "border border-secondary hover:bg-secondary/50 cursor-pointer"
                                : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <div className="text-xs font-semibold">{date.day}</div>
                            <div className="text-sm font-bold">{date.date}</div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedDates.length > 0 && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm font-semibold text-primary">{selectedDates.length} day(s) selected</p>
                      </div>
                    )}
                  </div>

                  {bookingError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {bookingError}
                    </div>
                  )}
                </div>
              )}



              {/* Step 2: Confirmation */}
              {bookingStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Daily Rate:</span>
                      <span className="font-semibold">GH₵500/day</span>
                    </div>
                    <div className="border-t border-secondary pt-3">
                      <p className="text-sm font-semibold mb-2">Selected dates:</p>
                      <div className="space-y-1">
                        {selectedDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((date, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-2 h-2 bg-primary rounded-full"></span>
                              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="border-t border-secondary pt-3 flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Total Price:</span>
                      <span className="font-bold text-lg text-primary">
                        GH₵{(selectedDates.length * 500).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {bookingError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {bookingError}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Payment Method Selection */}
              {bookingStep === 3 && (
                <div className="space-y-4">
                  {/* We no longer accept payment during the booking wizard. */}
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg space-y-2 border border-yellow-200 dark:border-yellow-800">
                    <p className="font-semibold text-foreground">Payment not available yet</p>
                    <p className="text-sm text-muted-foreground">
                      Your booking has been created, but payment can only be made once the caregiver has accepted the request. You will be notified when you may proceed.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (bookingStep > 1) {
                    if (bookingStep === 3 && paymentStep === "receipt") {
                      setPaymentStep("method");
                    } else {
                      setBookingStep(bookingStep - 1);
                    }
                  } else {
                    setShowBookingModal(false);
                  }
                }}
                disabled={bookingSubmitting}
              >
                {bookingStep === 1 ? "Cancel" : "Back"}
              </Button>
              <Button
                onClick={() => {
                  if (bookingStep === 1) {
                    if (selectedDates.length === 0) {
                      setBookingError("Please select at least one date");
                      return;
                    }
                    setBookingError("");
                    setBookingStep(2);
                  } else if (bookingStep === 2) {
                    submitBooking();
                  } else {
                    // any other step simply close the modal
                    setShowBookingModal(false);
                  }
                }}
                disabled={bookingSubmitting}
              >
                {bookingSubmitting ? "Processing..." : (
                  bookingStep === 1 ? "Next" : "Book"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* BOOKINGS PAGE */}
        {currentPage === "bookings" && (
          <div className="card-elevated p-6 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">My Bookings</h2>
                <div className="text-sm text-muted-foreground">
                  {bookings.filter(b => ['pending', 'payment-pending', 'confirmed'].includes(b.status)).length} active bookings
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${historyFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setHistoryFilter('pending')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${historyFilter === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setHistoryFilter('approved')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${historyFilter === 'approved' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}
                >
                  Approved
                </button>
              </div>
            </div>

            {bookings.filter((b) => {
              if (historyFilter === 'all') return ['pending', 'payment-pending', 'confirmed'].includes(b.status);
              if (historyFilter === 'pending') return b.status === 'pending';
              if (historyFilter === 'approved') return b.status === 'payment-pending' || b.status === 'confirmed';
              return ['pending', 'payment-pending', 'confirmed'].includes(b.status);
            }).length > 0 ? (
              <div className="grid gap-4">
                {bookings
                  .filter((b) => {
                    if (historyFilter === 'all') return ['pending', 'payment-pending', 'confirmed'].includes(b.status);
                    if (historyFilter === 'pending') return b.status === 'pending';
                    if (historyFilter === 'approved') return b.status === 'payment-pending' || b.status === 'confirmed';
                    return ['pending', 'payment-pending', 'confirmed'].includes(b.status);
                  })
                  .sort((a, b) => new Date(b.bookingDate || b.startDate).getTime() - new Date(a.bookingDate || a.startDate).getTime())
                  .map((booking: any) => {
                  const primaryDateStr = formatBookingPrimaryDate(booking);
                  const dayCount = getBookingDayCount(booking);
                  return (
                  <div
                    key={booking._id || booking.id}
                    className="p-5 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {/* Caregiver Name */}
                        <p className="font-semibold text-foreground text-lg mb-2">
                          {booking.caregiverId?.name || "Caregiver"}
                        </p>
                        {/* Date Range */}
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatBookingDateRange(booking)}
                        </p>
                        {/* Services Needed */}
                        {booking.neededServices && booking.neededServices.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {booking.neededServices.slice(0, 2).map((service, idx) => (
                              <span key={idx} className="px-2 py-1 rounded-full text-xs bg-primary/20 text-primary font-medium">
                                {service}
                              </span>
                            ))}
                            {booking.neededServices.length > 2 && (
                              <span className="px-2 py-1 rounded-full text-xs bg-primary/20 text-primary font-medium">
                                +{booking.neededServices.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        booking.status === "confirmed" ? "bg-success/15 text-success border border-success/30" :
                        booking.status === "payment-pending" ? "bg-warning/15 text-warning border border-warning/30" :
                        "bg-secondary/10 text-muted-foreground"
                      }`}>
                        {booking.status === "payment-pending" ? "Approved - Ready to Pay" :
                         booking.status === "confirmed" ? "Confirmed" :
                         booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || "Unknown"}
                      </span>
                    </div>

                    {booking.notes && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {booking.notes}
                      </p>
                    )}

                    <div className="flex gap-3 pt-3 border-t border-primary/20">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/booking/${booking._id}`)}
                      >
                        View Details
                      </Button>
                      {(booking.status === 'payment-pending' || booking.status === 'confirmed') && (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 bg-success hover:bg-success/90"
                          onClick={() => {
                            setBookingIdForPayment(booking._id);
                            navigate('/payment');
                          }}
                        >
                          Pay Now
                        </Button>
                      )}
                      {booking.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled
                        >
                          Waiting for Approval
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">No active bookings</p>
                <p className="text-sm text-muted-foreground mb-4">Book a caregiver to get started</p>
                <Button onClick={() => setCurrentPage("find")}>
                  Find a Caregiver
                </Button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY PAGE */}
        {currentPage === "history" && (
          <div className="card-elevated p-6 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Booking History</h2>
                <div className="text-sm text-muted-foreground">{bookings.length} sessions</div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${historyFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setHistoryFilter('completed')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${historyFilter === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setHistoryFilter('pending')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${historyFilter === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}
                >
                  Pending
                </button>
              </div>
            </div>

            {bookings.filter((b) => {
              if (historyFilter === 'all') return true;
              if (historyFilter === 'completed') return b.status === 'completed';
              if (historyFilter === 'pending') return b.status === 'pending' || b.status === 'payment-pending' || b.status === 'confirmed';
              return true;
            }).length > 0 ? (
              <div className="grid gap-4">
                {bookings
                  .filter((b) => {
                    if (historyFilter === 'all') return true;
                    if (historyFilter === 'completed') return b.status === 'completed';
                    if (historyFilter === 'pending') return b.status === 'pending' || b.status === 'payment-pending' || b.status === 'confirmed';
                    return true;
                  })
                  .sort((a, b) => new Date(b.bookingDate || b.startDate).getTime() - new Date(a.bookingDate || a.startDate).getTime())
                  .map((booking: any) => {
                  const primaryDateStr = formatBookingPrimaryDate(booking);
                  const dayCount = getBookingDayCount(booking);
                  return (
                  <div
                    key={booking._id || booking.id}
                    className="p-5 rounded-lg border border-success/30 bg-gradient-to-r from-success/10 to-success/5 hover:from-success/15 hover:to-success/10 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {/* Caregiver Name */}
                        <p className="font-semibold text-foreground text-lg mb-2">
                          {booking.caregiverId?.name || "Caregiver"}
                        </p>
                        {/* Date Range */}
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatBookingDateRange(booking)}
                        </p>
                        {/* Services Needed */}
                        {booking.neededServices && booking.neededServices.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {booking.neededServices.slice(0, 2).map((service, idx) => (
                              <span key={idx} className="px-2 py-1 rounded-full text-xs bg-primary/20 text-primary font-medium">
                                {service}
                              </span>
                            ))}
                            {booking.neededServices.length > 2 && (
                              <span className="px-2 py-1 rounded-full text-xs bg-primary/20 text-primary font-medium">
                                +{booking.neededServices.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        booking.status === "completed" ? "bg-success/15 text-success border border-success/30" : "bg-secondary/10 text-muted-foreground"
                      }`}>
                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || "Unknown"}
                      </span>
                    </div>

                    {booking.notes && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {booking.notes}
                      </p>
                    )}

                    <div className="flex gap-3 pt-3 border-t border-success/20">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/booking/${booking._id}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCurrentPage("reviews")}
                      >
                        Write Review
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">No bookings yet</p>
              </div>
            )}
          </div>
        )}

        {/* REVIEWS PAGE */}
        {currentPage === "reviews" && (
          <div className="card-elevated p-6 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">My Reviews</h2>
              <div className="text-sm text-muted-foreground">
                {bookings.filter(b => b.status === "completed").length} bookings completed
              </div>
            </div>

            {/* Write New Review Form */}
            {bookings.filter(b => b.status === "completed").length > 0 && (
              <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 to-primary/2 p-6 mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning" />
                  Write a Review
                </h3>
                
                <div className="space-y-4">
                  {/* Select Booking */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Caregiver to Review
                    </label>
                    <select
                      value={selectedBookingForReview?.id || ""}
                      onChange={(e) => {
                        const selected = bookings.find(b => b._id === e.target.value);
                        setSelectedBookingForReview(selected);
                      }}
                      className="input-base w-full"
                    >
                      <option value="">Choose a completed booking...</option>
                      {bookings
                        .filter(b => b.status === "completed" && !b.reviewNotes)
                        .map((booking) => (
                          <option key={booking._id} value={booking._id}>
                            {booking.caregiver?.name || booking.caregiverId?.name || "Caregiver"} - {(() => {
                          const dates = booking.bookingDates && booking.bookingDates.length > 0 ? booking.bookingDates : [booking.bookingDate];
                          const first = new Date(dates[0]).toLocaleDateString();
                          return dates.length > 1 ? `${first} (+${dates.length - 1} more)` : first;
                        })()}
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedBookingForReview && (
                    <>
                      {/* Rating */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Your Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewFormData({...reviewFormData, rating: star})}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`h-7 w-7 ${
                                  star <= reviewFormData.rating
                                    ? "fill-warning text-warning"
                                    : "text-muted-foreground hover:text-warning"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Review Text */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Your Review</label>
                        <textarea
                          value={reviewFormData.text}
                          onChange={(e) => setReviewFormData({...reviewFormData, text: e.target.value})}
                          placeholder="Share your experience with this caregiver..."
                          className="input-base w-full min-h-[100px] resize-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        onClick={() => handleSubmitReview(selectedBookingForReview._id)}
                        disabled={reviewFormData.rating === 0 || !reviewFormData.text.trim() || submittingReview}
                        className="w-full"
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {bookings.filter(b => b.status === "completed").length > 0 ? (
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold text-foreground mt-4">Your Submitted Reviews</h3>
                {bookings
                  .filter(b => b.status === "completed" && b.reviewNotes)
                  .length > 0 ? (
                  bookings
                    .filter(b => b.status === "completed" && b.reviewNotes)
                    .map((booking: any, index: number) => (
                      <div
                        key={index}
                        className="p-5 rounded-lg border border-secondary/30 bg-gradient-to-r from-secondary/50 to-secondary/25 hover:from-secondary hover:to-secondary/50 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground text-lg">{booking.caregiver?.name || booking.caregiverId?.name || "Caregiver"}</p>
                            <p className="text-sm text-muted-foreground">{booking.serviceType || "Care Service"}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= (booking.rating || 0)
                                    ? "fill-warning text-warning"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground text-xs font-semibold mb-1">Rating</p>
                            <p className="text-foreground font-semibold">{booking.rating || 0}/5 Stars</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs font-semibold mb-1">Date</p>
                            <p className="text-foreground">
                              {new Date(booking.bookingDate || booking.completedDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs font-semibold mb-1">Service</p>
                            <p className="text-foreground">Daily Care</p>
                          </div>
                        </div>

                        {booking.reviewNotes && (
                          <div className="mb-4 p-3 bg-background rounded-lg border border-secondary/20">
                            <p className="text-sm text-foreground italic">"{booking.reviewNotes}"</p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              setSelectedBookingForReview(booking);
                              setReviewFormData({
                                rating: booking.rating || 0,
                                text: booking.reviewNotes || ""
                              });
                            }}
                          >
                            Edit Review
                          </Button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No reviews submitted yet. Write one above!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Star className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">No reviews yet</p>
                <p className="text-sm text-muted-foreground mb-4">Complete a booking to leave a review</p>
              </div>
            )}
          </div>
        )}

        {/* FIND CAREGIVER PAGE */}
        {currentPage === "find" && (
          <FindCaregiver isEmbedded={true} />
        )}


        {/* LOGIN REQUIRED MODAL */}
        <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sign In Required</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-muted-foreground">
                You need to sign in to make a booking. Sign in to your account or create a new one.
              </p>

              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="font-semibold mb-2">Daily Care Services</p>
                <p className="text-sm text-muted-foreground">GH₵500/day</p>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLoginModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  navigate("/login");
                }}
                className="gap-2"
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/signup");
                }}
                className="gap-2"
              >
                Register
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSuccessModal && !showPaymentForm} onOpenChange={setShowSuccessModal}>
          <DialogContent className="max-w-md sm:rounded-lg">
            <div className="text-center space-y-6 py-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>

              {/* Success Title */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">Booking Confirmed! <Gift className="h-6 w-6" /></h2>
                <p className="text-muted-foreground">Your booking has been successfully submitted</p>
              </div>

              {/* Booking Details */}
              {successBookingData && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-left space-y-3 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Caregiver</span>
                    <span className="text-sm font-semibold text-foreground">{successBookingData.caregiverName}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Dates</span>
                    <span className="text-sm font-semibold text-foreground text-right">{successBookingData.formattedDates}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Duration</span>
                    <span className="text-sm font-semibold text-foreground">{successBookingData.totalDays} day{successBookingData.totalDays > 1 ? 's' : ''}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between items-start">
                    <span className="font-medium text-muted-foreground">Total Price</span>
                    <span className="text-lg font-bold text-green-600">GH₵{successBookingData.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-left space-y-2 border border-blue-200 dark:border-blue-900">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clipboard className="h-4 w-4" /> What's Next?
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>The caregiver has been notified of your request</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>You'll receive a notification once they confirm</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>Check "My Bookings" to track your booking status</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full bg-success hover:bg-success/90 gap-2"
                  onClick={async () => {
                    console.log("Opening payment form manually");
                    if (successBookingData?.bookingId) {
                      try {
                        // Fetch full booking details to get caregiver information
                        const bookingDetails = await bookingAPI.getById(successBookingData.bookingId);

                        // make sure caregiver has accepted before proceeding
                        if (bookingDetails.status === 'pending') {
                          toast({
                            title: 'Cannot Pay Yet',
                            description: 'The caregiver has not accepted your request. Please wait until they confirm.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        if (bookingDetails.status === 'cancelled') {
                          toast({
                            title: 'Booking Cancelled',
                            description: 'This booking has been cancelled, you cannot make a payment.',
                            variant: 'destructive',
                          });
                          return;
                        }

                        // Fetch caregiver payment information
                        let caregiverPaymentInfo = null;
                        if (bookingDetails.caregiverId || bookingDetails.caregiver?.id) {
                          const caregiverId = bookingDetails.caregiverId || bookingDetails.caregiver?.id;
                          const caregiverProfile = await userAPI.getProfile(caregiverId);
                          caregiverPaymentInfo = {
                            mobileMoneyNumber: caregiverProfile.mobileMoneyNumber,
                            mobileMoneyName: caregiverProfile.mobileMoneyName,
                            accountNumber: caregiverProfile.accountNumber,
                            accountName: caregiverProfile.accountName,
                          };
                        }
                        
                        setSelectedBookingForPayment({
                          ...bookingDetails,
                          caregiverPaymentInfo
                        });
                        setShowPaymentForm(true);
                        setShowSuccessModal(false);
                      } catch (error) {
                        console.error("Error fetching booking details:", error);
                        toast({
                          title: "Error",
                          description: "Failed to load payment details. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  Proceed to Payment
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCurrentPage("bookings");
                  }}
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Location Prompt Modal */}
        <Dialog open={showLocationPrompt} onOpenChange={(open) => {
            // prevent closing until required fields provided
            if (!open) return;
            setShowLocationPrompt(open);
          }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Welcome! Let's finish your profile</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                To help us find caregivers in your area, please complete the details below.
              </p>
              
              <div>
                <label htmlFor="location-input" className="block text-sm font-medium text-foreground mb-2">
                  Your Location
                </label>
                <div className="relative">
                  <input
                    id="location-input"
                    type="text"
                    value={locationInput}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddLocation();
                      }
                    }}
                    placeholder="e.g., Accra, Greater Accra Region"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={addingLocation}
                    autoFocus
                    autoComplete="off"
                  />
                  {/* Location suggestions dropdown */}
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-input rounded-md shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {locationSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectLocation(suggestion)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-foreground">{suggestion.name}</div>
                          <div className="text-xs text-muted-foreground">{suggestion.displayName}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Or select your location on the map below
                </p>
              </div>

              {/* Map for location selection with toggle */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowLocationMap(!showLocationMap)}
                  className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1 mb-2"
                  disabled={addingLocation}
                >
                  {showLocationMap ? "Hide Map" : "Show Map"}
                </button>
                {showLocationMap && (
                  <>
                    <div className="h-64 rounded-md overflow-hidden border">
                      <MapContainer
                        center={[5.6037, -0.1870]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <LocationMarker />
                      </MapContainer>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click on the map to select your location
                    </p>
                  </>
                )}
              </div>

              <div>
                <label htmlFor="phone-input" className="block text-sm font-medium text-foreground mb-2">
                  Phone Number
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="10 digits, e.g. 0241234567"
                  disabled={addingLocation}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Services Needed</label>
                <p className="text-sm text-muted-foreground mb-2">Select all services you need</p>
                <div className="grid grid-cols-1 gap-2">
                  {availableServices.map((service) => (
                    <label key={service} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={neededServices.includes(service)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNeededServices([...neededServices, service]);
                          } else {
                            setNeededServices(neededServices.filter((s) => s !== service));
                          }
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{service}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleAddLocation}
                disabled={addingLocation || !(locationInput.trim() && phoneInput.trim() && neededServices.length > 0)}
              >
                {addingLocation ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedBookingForPayment && (
          <PaymentForm
            isOpen={showPaymentForm}
            onClose={() => {
              setShowPaymentForm(false);
              setSelectedBookingForPayment(null);
            }}
            bookingId={selectedBookingForPayment._id}
            amount={selectedBookingForPayment.totalPrice}
            familyName={userName}
            onSuccess={(paymentData) => {
              // Refresh bookings after payment
              refreshBookings();
              toast({
                title: "Payment Completed!",
                description: `Payment method: ${paymentData.paymentMethod}`,
              });
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default FamilyDashboard;
