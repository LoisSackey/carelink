// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import Link component for navigation between pages
import { Link, useNavigate } from "react-router-dom";
// Import hooks for state management
import { useState, useEffect } from "react";
// Import icon components for visual elements in booking history display
import { 
  Clock,         // Icon for time/duration
  CheckCircle2,  // Icon for completed status
  Calendar,      // Icon for date
  Users,         // Icon for caregiver
  ExternalLink,  // Icon for opening details
  Star,          // Icon for ratings
  Loader,        // Icon for loading state
  Smartphone,    // Icon for phone
  Mail,          // Icon for email
  MapPin         // Icon for location
} from "lucide-react";
// Import API client
import { bookingAPI } from "@/lib/api";
// Import toast notifications
import { useToast } from "@/hooks/use-toast";
import { getFullImageUrl } from "@/utils/imageUrl";

// Helper function to get booking date array
const getBookingDateArray = (booking: any): Date[] => {
  if (Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0) {
    return booking.bookingDates.map((d: any) => new Date(d));
  }
  const d = booking.bookingDate || booking.startDate;
  if (d) return [new Date(d)];
  return [];
};

// Helper function to format booking date range (from date to date)
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

// History component - Displays past bookings and transactions (with caregivers for families, with families for caregivers)
const History = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState<"family" | "caregiver" | null>(null);

  // Load user bookings on component mount
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setIsLoading(true);
        
        // Get user type
        const storedUserType = localStorage.getItem("userType");
        setUserType(storedUserType as "family" | "caregiver");
        
        let storedUserId = localStorage.getItem("userId");
        if (!storedUserId) {
          const userStr = localStorage.getItem("user");
          storedUserId = userStr ? (JSON.parse(userStr).id as string) : null;
        }

        if (!storedUserId) {
          navigate("/login");
          return;
        }

        // Fetch all bookings for the user
        const data = await bookingAPI.getByUserId(storedUserId);
        const allBookings = Array.isArray(data) ? data : [];
        console.log("History loaded bookings:", allBookings);
        allBookings.forEach((b, idx) => {
          console.log(`Booking ${idx}:`, {
            id: b._id,
            bookingDatesLength: b.bookingDates?.length,
            bookingDates: b.bookingDates,
            numberOfDays: b.numberOfDays
          });
        });
        setBookings(allBookings);
      } catch (err: any) {
        console.error("Failed to load bookings:", err);
        setError(err.message || "Failed to load booking history");
        toast({
          title: "Error",
          description: "Failed to load your booking history",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, [navigate, toast]);

  // Calculate statistics from real data
  const stats = {
    totalBookings: bookings.length,
    totalDays: bookings.reduce((sum: number, b: any) => sum + (b.numberOfDays || b.duration || 1), 0),
    totalSpent: bookings.reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0),
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'pending') return b.status === 'pending' || b.status === 'payment-pending' || b.status === 'confirmed';
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="section-padding">
          <div className="container-main flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your booking history...</p>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="section-padding">
        <div className="container-main">
          <h1 className="text-3xl font-bold text-foreground mb-8">Activity History</h1>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Total Bookings</span>
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.totalBookings}</p>
            </div>
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Days of Care</span>
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.totalDays}</p>
            </div>
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Total Spent</span>
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <p className="text-3xl font-bold text-foreground">GH₵{stats.totalSpent.toFixed(2)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6">
            {['all', 'completed', 'pending'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          <div className="card-elevated">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Bookings</h2>
            </div>
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                {error}
              </div>
            )}
            {filteredBookings.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredBookings.map((booking) => (
                  <div key={booking._id || booking.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {userType === "caregiver" ? (
                          // Show family photo for caregivers (fallback to legacy familyId)
                          (() => {
                            const fam = booking.userId || booking.familyId || {};
                            return fam.profilePicture ? (
                              <img
                                src={getFullImageUrl(fam.profilePicture)}
                                alt={fam.name || "Family"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Users className="h-6 w-6 text-primary" />
                            );
                          })()
                        ) : (
                          // Show caregiver photo for families
                          booking.caregiverId?.profilePicture ? (
                            <img
                              src={getFullImageUrl(booking.caregiverId.profilePicture)}
                              alt={booking.caregiverId.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Users className="h-6 w-6 text-primary" />
                          )
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {userType === "caregiver" 
                            ? ((booking.userId || booking.familyId)?.name || "Family Member")
                            : (booking.caregiverId?.name || "Caregiver")
                          }
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatBookingDateRange(booking)}
                        </p>
                        {/* Contact info for families viewing caregivers */}
                        {userType === "family" && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {booking.caregiverId?.phone && (
                              <div className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                <span>{booking.caregiverId.phone}</span>
                              </div>
                            )}
                            {booking.caregiverId?.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{booking.caregiverId.email}</span>
                              </div>
                            )}
                            {booking.caregiverId?.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{booking.caregiverId.location}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Contact info for caregivers viewing families */}
                        {userType === "caregiver" && (
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
                        )}
                        {booking.neededServices && booking.neededServices.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {booking.neededServices.slice(0, 2).map((service: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-medium">
                                {service}
                              </span>
                            ))}
                            {booking.neededServices.length > 2 && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-medium">
                                +{booking.neededServices.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === "completed" 
                            ? "bg-success/10 text-success" 
                            : "bg-destructive/10 text-destructive"
                        }`}>
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || "Unknown"}
                        </span>
                        <span className="font-semibold text-foreground">GH₵{booking.totalPrice?.toFixed(2) || "GH₵0.00"}</span>
                      </div>
                      {booking.notes && (
                        <p className="text-xs text-muted-foreground italic">{booking.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground">No bookings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Your bookings will appear here once you make a booking</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default History;
