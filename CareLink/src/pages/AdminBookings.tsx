import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ArrowLeft,
  Trash2,
  FileText,
  Mail,
  Settings,
} from "lucide-react";
import { bookingAPI, userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const AdminBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<any>(null);

  const sidebarItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => navigate("/admin-dashboard") },
    { icon: <Users className="h-5 w-5" />, label: "All Users", path: "#users", action: () => navigate("/admin-dashboard") },
    { icon: <Briefcase className="h-5 w-5" />, label: "Pending Caregivers", path: "#caregivers", action: () => navigate("/admin-dashboard") },
    { icon: <FileText className="h-5 w-5" />, label: "Bookings", path: "/admin-bookings", action: () => navigate("/admin-bookings") },
    { icon: <Trash2 className="h-5 w-5" />, label: "Deletion Requests", path: "#deletion-requests", action: () => navigate("/admin-dashboard") },
    { icon: <FileText className="h-5 w-5" />, label: "Credential Review", path: "#credential-review", action: () => navigate("/admin-dashboard#credential-review") },
    { icon: <FileText className="h-5 w-5" />, label: "Credential Browser", path: "#credential-browser", action: () => navigate("/admin-dashboard#credential-browser") },
    { icon: <Mail className="h-5 w-5" />, label: "Messages", path: "#messages", action: () => navigate("/admin-dashboard") },
    { icon: <Settings className="h-5 w-5" />, label: "Account Management", path: "#account-management", action: () => navigate("/admin-dashboard") },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
  ];

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      const userType = localStorage.getItem("userType");

      if (!userId || userType !== "admin") {
        navigate("/admin-login");
        return;
      }

      const bookings = await bookingAPI.getAll();
      const sortedBookings = Array.isArray(bookings)
        ? bookings.sort((a: any, b: any) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
        : [];
      setAllBookings(sortedBookings);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = (booking: any) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      await bookingAPI.delete(bookingToDelete._id);
      setAllBookings(allBookings.filter((booking) => booking._id !== bookingToDelete._id));
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
      toast({
        title: "Success",
        description: `Booking for ${new Date(bookingToDelete.bookingDate).toLocaleDateString()} has been deleted successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} userType="admin">
        <LoadingSpinner size="md" text="Loading bookings..." fullScreen />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} userType="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/admin-dashboard")} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground">All Bookings</h1>
            <p className="text-muted-foreground">Manage and monitor all system bookings</p>
          </div>
        </div>

        <div className="card-elevated overflow-x-auto">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Bookings ({allBookings.length})</h2>
          </div>
          {allBookings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Briefcase className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No bookings yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Family</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Caregiver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Booking Date(s)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {booking.userId?.name || "Guest User"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {booking.caregiverId?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {booking.bookingDates && Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0
                        ? booking.bookingDates.length === 1
                          ? new Date(booking.bookingDates[0]).toLocaleDateString()
                          : `${new Date(booking.bookingDates[0]).toLocaleDateString()} (${booking.bookingDates.length} days)`
                        : new Date(booking.bookingDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      GH₵{booking.totalPrice?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === "completed"
                          ? "bg-success/10 text-success"
                          : booking.status === "cancelled"
                          ? "bg-destructive/10 text-destructive"
                          : booking.status === "confirmed"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.paymentStatus === "completed"
                          ? "bg-success/10 text-success"
                          : booking.paymentStatus === "failed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {booking.paymentStatus?.charAt(0).toUpperCase() + booking.paymentStatus?.slice(1) || "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteBooking(booking)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
                        aria-label={`Delete booking ${booking._id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Delete Booking Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this booking?
                <br />
                <strong>Family:</strong> {bookingToDelete?.userId?.name || "Guest User"}
                <br />
                <strong>Caregiver:</strong> {bookingToDelete?.caregiverId?.name || "N/A"}
                <br />
                <strong>Date:</strong> {bookingToDelete ? new Date(bookingToDelete.bookingDate).toLocaleDateString() : ""}
                <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteBooking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminBookings;