// Import useParams hook to extract URL parameters (caregiver id)
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import Button UI component for clickable actions
import { Button } from "@/components/ui/button";
// Import icon components for visual elements (ratings, location, availability, etc.)
import { 
  Shield,        // Icon for verified status
  Star,          // Icon for ratings/reviews
  MapPin,        // Icon for location
  Clock,         // Icon for time/availability
  Award,         // Icon for certifications
  Calendar,      // Icon for booking/scheduling
  MessageSquare, // Icon for messaging/contact
  CheckCircle2,  // Icon for verified/confirmed
  Users,         // Icon for people/reviews
  Loader,        // Icon for loading state
  Mail,          // Icon for email
  Phone,         // Icon for phone
  Briefcase,     // Icon for services/job titles
  AlertCircle    // Icon for important info
} from "lucide-react";
import { userAPI } from "@/lib/api";
import { getFullImageUrl } from "@/utils/imageUrl";

interface CaregiverProfileProps {
  isEmbedded?: boolean;
}

// CaregiverProfile component - Displays detailed profile of a caregiver with skills, reviews, availability
const CaregiverProfile = ({ isEmbedded = false }: CaregiverProfileProps = {}) => {
  // Extract the caregiver id from the URL path using useParams hook
  const { id } = useParams();
  
  // State for caregiver data
  const [caregiver, setCaregiver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch caregiver profile data from API
  useEffect(() => {
    const fetchCaregiverProfile = async () => {
      try {
        setLoading(true);
        setError("");
        if (!id) {
          setError("Caregiver ID not found");
          return;
        }
        const data = await userAPI.getProfile(id);
        setCaregiver(data);
      } catch (err) {
        console.error("Failed to fetch caregiver profile:", err);
        setError("Failed to load caregiver profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCaregiverProfile();
  }, [id]);

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen bg-background"}>
      {!isEmbedded && <Header />}

      <section className={isEmbedded ? "w-full" : "section-padding"}>
        <div className={isEmbedded ? "w-full" : "container-main"}>
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading caregiver profile...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="card-elevated p-6 text-center">
              <p className="text-foreground font-semibold mb-4">{error}</p>
              <Button asChild>
                <Link to="/search">Back to Search</Link>
              </Button>
            </div>
          )}

          {/* Content */}
          {caregiver && !loading && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Profile Header */}
                <div className="card-elevated p-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(() => {
                        const pic = getFullImageUrl(caregiver.profilePicture) || caregiver.profilePicture;
                        console.log('CaregiverProfile image:', { id: caregiver._id, profilePicture: caregiver.profilePicture, resolved: pic });
                        return pic ? (
                          <img
                            src={pic}
                            alt={caregiver.name}
                            className="h-full w-full object-cover"
                            onError={(e: any) => {
                              console.error('Profile image load failed for', caregiver._id, 'src=', pic);
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                            }}
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <Users className="h-12 w-12 text-primary" />
                        );
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-foreground">{caregiver.name}</h1>
                        {caregiver.verified && (
                          <span className="badge-verified">
                            <Shield className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-lg text-primary mb-3">{caregiver.specialization || "Care Provider"}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>{[caregiver.city, caregiver.state].filter(Boolean).join(' ')}</span>
                        {caregiver.experience && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {caregiver.experience}
                          </span>
                        )}
                      </div>

                      {/* Rating Display */}
                      {caregiver.rating !== undefined && caregiver.rating > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(caregiver.rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {caregiver.rating.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({caregiver.reviewCount || 0} {caregiver.reviewCount === 1 ? 'review' : 'reviews'})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ratings Summary */}
                {caregiver.rating !== undefined && caregiver.rating > 0 && (
                  <div className="card-elevated p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-400" />
                      Ratings & Reviews
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Average Rating</span>
                        <span className="text-2xl font-bold text-foreground">{caregiver.rating?.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Reviews</span>
                        <span className="font-semibold text-foreground">{caregiver.reviewCount || 0}</span>
                      </div>
                      {caregiver.reviewCount === 0 && (
                        <p className="text-sm text-muted-foreground italic">No reviews yet. Be the first to review this caregiver!</p>
                      )}
                    </div>
                  </div>
                )}

                {/* About */}
                {caregiver.bio && (
                  <div className="card-elevated p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">About</h2>
                    <p className="text-muted-foreground leading-relaxed">{caregiver.bio}</p>
                  </div>
                )}

                {/* Skills */}
                {caregiver.skills && caregiver.skills.length > 0 && (
                  <div className="card-elevated p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Skills & Expertise</h2>
                    <div className="flex flex-wrap gap-2">
                      {caregiver.skills.map((skill: string, index: number) => (
                        <span key={index} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {caregiver.certifications && caregiver.certifications.length > 0 && (
                  <div className="card-elevated p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Certifications
                    </h2>
                    <div className="space-y-3">
                      {caregiver.certifications.map((cert: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-foreground">{cert.name || cert}</span>
                          {cert.verified && (
                            <span className="flex items-center gap-1 text-success text-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              Credential Verified
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services Provided */}
                {caregiver.providedServices && caregiver.providedServices.length > 0 && (
                  <div className="card-elevated p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Services Provided
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {caregiver.providedServices.map((service: string, index: number) => (
                        <span key={index} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Availability */}
                {caregiver.availability && (
                  <div className="card-elevated p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Available Days
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(caregiver.availability).map(([day, available]: [string, any]) => (
                        <div 
                          key={day} 
                          className={`p-3 rounded-lg text-center font-medium text-sm transition-colors ${
                            available 
                              ? 'bg-success/10 text-success border border-success/20' 
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <span className="capitalize">{day}</span>
                          {available && <CheckCircle2 className="h-4 w-4 mx-auto mt-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="card-elevated p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Contact Information
                  </h2>
                  <div className="space-y-3">
                    {caregiver.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-foreground">{caregiver.email}</p>
                        </div>
                      </div>
                    )}
                    {caregiver.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-foreground">{caregiver.phone}</p>
                        </div>
                      </div>
                    )}
                      {caregiver.location && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-foreground">{caregiver.location}</p>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Professional Information */}
                <div className="card-elevated p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Professional Information
                  </h2>
                  <div className="space-y-4">
                    {caregiver.title && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Professional Title</p>
                        <p className="text-foreground">{caregiver.title}</p>
                      </div>
                    )}
                    {caregiver.yearsExperience && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Years of Experience</p>
                        <p className="text-foreground">{caregiver.yearsExperience} years</p>
                      </div>
                    )}
                    {caregiver.specialization && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Specialization</p>
                        <p className="text-foreground">{caregiver.specialization}</p>
                      </div>
                    )}
                    {caregiver.verified && (
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                        <span className="text-sm font-medium text-success">Profile Verified</span>
                      </div>
                    )}
                    {caregiver.approved && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-700">Approved Caregiver</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rates & Pricing */}
                <div className="card-elevated p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Rates & Pricing
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {caregiver.dailyRate && (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs text-muted-foreground mb-1">Daily Rate</p>
                        <p className="text-2xl font-bold text-primary">GH₵{caregiver.dailyRate}</p>
                        <p className="text-xs text-muted-foreground mt-1">per day</p>
                      </div>
                    )}
                    {caregiver.weeklyRate && (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs text-muted-foreground mb-1">Weekly Rate</p>
                        <p className="text-2xl font-bold text-primary">GH₵{caregiver.weeklyRate}</p>
                        <p className="text-xs text-muted-foreground mt-1">per week</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Since */}
                {caregiver.createdAt && (
                  <div className="card-elevated p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Member Information
                    </h2>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                      <p className="text-foreground font-medium">
                        {new Date(caregiver.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pending Payments Section - Only visible to caregiver viewing their own profile */}
                {currentUser?.userType === "caregiver" && currentUser?.id === id && (
                  <div className="card-elevated p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Pending Payment Receipts</h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-yellow-900">Mobile Money Receipt</p>
                            <p className="text-sm text-yellow-800 mt-1">Booking from John Doe</p>
                            <p className="text-xs text-yellow-700 mt-1">GH₵500 • Uploaded Jan 19, 2026</p>
                          </div>
                          <Button variant="outline" size="sm">View</Button>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-blue-900">Bank Transfer Receipt</p>
                            <p className="text-sm text-blue-800 mt-1">Booking from Jane Smith</p>
                            <p className="text-xs text-blue-700 mt-1">GH₵750 • Uploaded Jan 18, 2026</p>
                          </div>
                          <Button variant="outline" size="sm">View</Button>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full mt-4">Process All Payments</Button>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="card-elevated p-6 sticky top-24">
                  <div className="text-center mb-6">
                    <p className="text-3xl font-bold text-foreground">GH₵{caregiver.dailyRate || 500}</p>
                    <p className="text-muted-foreground">per day</p>
                  </div>

                  <Button className="w-full mb-4" size="lg" asChild>
                    <Link to={`/booking?caregiver=${caregiver._id}`}>
                      <Calendar className="h-4 w-4" />
                      Request Care
                    </Link>
                  </Button>

                  {caregiver.availability && caregiver.availability.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h3 className="font-medium text-foreground mb-3">Availability</h3>
                      <div className="flex flex-wrap gap-2">
                        {caregiver.availability.map((avail: string, index: number) => (
                          <span key={index} className="px-3 py-1 rounded-full bg-success/10 text-success text-xs">
                            {avail}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {!isEmbedded && <Footer />}
    </div>
  );
};

export default CaregiverProfile;
