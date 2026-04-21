// Import toast notification components for different notification styles
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
// Import provider that enables tooltip functionality throughout the app
import { TooltipProvider } from "@/components/ui/tooltip";
// Import React Query for server state management and data caching
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Import routing components from React Router for navigation
import { BrowserRouter, Routes, Route } from "react-router-dom";
// Import Google OAuth provider
import { GoogleOAuthProvider } from "@react-oauth/google";
// Import all page components
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import LoginSelection from "./pages/LoginSelection";
import FamilyLogin from "./pages/FamilyLogin";
import CaregiverLogin from "./pages/CaregiverLogin";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBookings from "./pages/AdminBookings";
import ForgotPassword from "./pages/ForgotPassword";
import CaregiverDocumentUpload from "./pages/CaregiverDocumentUpload";
import CaregiverOnboarding from "./pages/CaregiverOnboarding";
import FamilyDashboard from "./pages/FamilyDashboard";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import FindCaregiverPage from "./pages/FindCaregiverPage";
import CaregiverProfilePage from "./pages/CaregiverProfilePage";
import BookingPage from "./pages/BookingPage";
import BookingDetailsPage from "./pages/BookingDetailsPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ReceiptUploadPage from "./pages/ReceiptUploadPage";
import PendingPaymentPage from "./pages/PendingPaymentPage";
import CompletePaymentPage from "./pages/CompletePaymentPage";
import Reviews from "./pages/Reviews";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

// Initialize React Query client for managing server state and caching
const queryClient = new QueryClient();

// Main App component that sets up routing and global providers
const App = () => (
  // GoogleOAuthProvider: Enables Google OAuth functionality throughout the app
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
    {/* QueryClientProvider: Enables React Query functionality for data fetching */}
    <QueryClientProvider client={queryClient}>
      {/* TooltipProvider: Enables tooltip functionality across the entire app */}
      <TooltipProvider>
        {/* Toaster components: Displays notification messages to users */}
        <Toaster />
        <Sonner />
        {/* BrowserRouter: Enables client-side routing */}
        <BrowserRouter>
          {/* Routes: Container for all page routes */}
          <Routes>
            {/* Home page route */}
            <Route path="/" element={<Index />} />
            {/* About page route */}
            <Route path="/about" element={<About />} />
            {/* Contact page route */}
            <Route path="/contact" element={<Contact />} />
            {/* User sign up page route */}
            <Route path="/signup" element={<SignUp />} />
            {/* Family sign up page route */}
            <Route path="/signup/family" element={<SignUp />} />
            {/* Caregiver sign up page route */}
            <Route path="/signup/caregiver" element={<SignUp />} />
            {/* User login page route */}
            <Route path="/login" element={<Login />} />
            {/* Login selection page route */}
            <Route path="/login-selection" element={<LoginSelection />} />
            {/* Family login page route */}
            <Route path="/family-login" element={<FamilyLogin />} />
            {/* Caregiver login page route */}
            <Route path="/caregiver-login" element={<CaregiverLogin />} />
            {/* Admin login page route */}
            <Route path="/admin-login" element={<AdminLogin />} />
            {/* Forgot password page route */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* Reset password page route (with token from URL) */}
            <Route path="/reset-password" element={<ForgotPassword />} />
            {/* Caregiver document upload page route (after Google signup) */}
            <Route path="/caregiver-document-upload" element={<CaregiverDocumentUpload />} />
            {/* Caregiver registration/onboarding page route */}
            <Route path="/caregiver-onboarding" element={<CaregiverOnboarding />} />
            {/* Family user dashboard route */}
            <Route path="/family-dashboard" element={<FamilyDashboard />} />
            {/* Caregiver user dashboard route */}
            <Route path="/caregiver-dashboard" element={<CaregiverDashboard />} />
            {/* Find caregivers page route */}
            <Route path="/find-caregiver" element={<FindCaregiverPage />} />
            {/* Individual caregiver profile page route with dynamic ID parameter */}
            <Route path="/caregiver/:id" element={<CaregiverProfilePage />} />
            {/* Booking page for scheduling care route */}
            <Route path="/booking" element={<BookingPage />} />
            {/* Booking details page route to view booking information */}
            <Route path="/booking/:id" element={<BookingDetailsPage />} />
            {/* Payment page for processing payment route */}
            <Route path="/payment" element={<PaymentPage />} />
            {/* Payment status page showing success or pending route */}
            <Route path="/payment-status" element={<PaymentStatusPage />} />
            {/* Transitional page that redirects after clicking Complete Payment */}
            <Route path="/complete-payment" element={<CompletePaymentPage />} />
            {/* Payment success page after completing payment route */}
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            {/* Receipt upload page for mobile money and card payments route */}
            <Route path="/receipt-upload" element={<ReceiptUploadPage />} />
            {/* Pending payment page waiting for caregiver approval route */}
            <Route path="/pending-payment" element={<PendingPaymentPage />} />
            {/* Reviews and ratings page route */}
            <Route path="/reviews" element={<Reviews />} />
            {/* User activity history page route */}
            <Route path="/history" element={<History />} />
            {/* Admin dashboard for site management route */}
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            {/* Admin bookings page route */}
            <Route path="/admin-bookings" element={<AdminBookings />} />
            {/* Settings page for all user types route */}
            <Route path="/settings" element={<Settings />} />
            {/* Profile page for all user types route */}
            <Route path="/profile" element={<Profile />} />
            {/* Privacy policy page route */}
            <Route path="/privacy" element={<Privacy />} />
            {/* Terms of service page route */}
            <Route path="/terms" element={<Terms />} />
            {/* Fallback route for any undefined URLs */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

// Export App component as default for use in main.tsx
export default App;
