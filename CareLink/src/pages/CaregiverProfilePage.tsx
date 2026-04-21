// Wrapper page for CaregiverProfile that includes DashboardLayout and sidebar
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CaregiverProfile from "./CaregiverProfile";
import {
  LayoutDashboard,
  Calendar,
  Search,
  History,
  Star,
  Settings as SettingsIcon,
} from "lucide-react";

// CaregiverProfilePage component - Wrapper that provides sidebar layout
const CaregiverProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [userType, setUserType] = useState<"family" | "caregiver" | "admin" | null>(null);

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
        { icon: <Calendar className="h-5 w-5" />, label: "Bookings", path: "#bookings", action: () => navigate("/family-dashboard") },
        { icon: <Search className="h-5 w-5" />, label: "Find Caregiver", path: "/find-caregiver", action: () => navigate("/find-caregiver") },
        { icon: <History className="h-5 w-5" />, label: "History", path: "#history", action: () => navigate("/family-dashboard") },
        { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "#reviews", action: () => navigate("/family-dashboard") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
      ];
    }
    return [];
  };

  return (
    <DashboardLayout sidebarItems={getSidebarItems()} userType={userType || "family"}>
      <CaregiverProfile isEmbedded={true} />
    </DashboardLayout>
  );
};

export default CaregiverProfilePage;
