import DashboardLayout from "@/components/layout/DashboardLayout";
import ReceiptUpload from "@/components/pages/ReceiptUpload";

// Get sidebar items for family user
const getFamilyUserSidebarItems = () => [
  { label: "Dashboard", icon: "LayoutDashboard", onClick: () => {} },
  { label: "Find Caregiver", icon: "Search", onClick: () => {} },
  { label: "My Bookings", icon: "Calendar", onClick: () => {} },
  { label: "Payments", icon: "CreditCard", onClick: () => {} },
  { label: "Reviews", icon: "Star", onClick: () => {} },
];

// Wrapper component to provide DashboardLayout context for receipt upload
const ReceiptUploadPage = () => {
  const userType = localStorage.getItem("userType") || "family";
  const sidebarItems = userType === "family" ? getFamilyUserSidebarItems() : [];

  return (
    <DashboardLayout sidebarItems={sidebarItems} userType={userType}>
      <ReceiptUpload isEmbedded={true} />
    </DashboardLayout>
  );
};

export default ReceiptUploadPage;
