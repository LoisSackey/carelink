import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const CompletePaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // First, retrieve userId from booking info if available
    const bookingInfo = JSON.parse(sessionStorage.getItem("bookingInfo") || "{}");
    console.log("CompletePaymentPage - bookingInfo:", bookingInfo);
    
    if (bookingInfo.userId) {
      localStorage.setItem("userId", bookingInfo.userId);
      console.log("CompletePaymentPage - Set userId from bookingInfo:", bookingInfo.userId);
    }
    
    // Ensure userType is set for family dashboard
    if (!localStorage.getItem("userType")) {
      localStorage.setItem("userType", "family");
      console.log("CompletePaymentPage - Set userType to family");
    }
    
    // Set a flag to indicate we're coming from payment flow
    sessionStorage.setItem("fromPaymentFlow", "true");

    // Preserve incoming query params and forward to the canonical payment status page
    const params = new URLSearchParams();
    for (const [key, value] of Array.from(searchParams.entries())) {
      params.set(key, value);
    }

    // Short delay to show a transitional page, then redirect to the family dashboard
    const t = setTimeout(() => {
      console.log("CompletePaymentPage - Navigating to family-dashboard");
      navigate('/family-dashboard', { replace: true });
    }, 700);

    return () => clearTimeout(t);
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="card-elevated p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Completing payment…</h1>
        <p className="text-sm text-muted-foreground">Redirecting to payment status. Do not close this window.</p>
      </div>
    </div>
  );
};

export default CompletePaymentPage;
