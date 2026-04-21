// Import React hooks for state management and effects
import { useState, useEffect } from "react";
// Import navigation hook
import { useNavigate } from "react-router-dom";
// Import UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// Import icons
import { 
  Search as SearchIcon, 
  Star, 
  Heart, 
  Loader2, 
  AlertCircle,
  Filter,
  X,
  Award,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
} from "lucide-react";
// Import API client
import { userAPI } from "@/lib/api";
// Import toast notifications
import { useToast } from "@/hooks/use-toast";
// Import image URL helper
import { getFullImageUrl } from "@/utils/imageUrl";
// Import ProximityBasedSearch component
import ProximityBasedSearch from "@/components/ProximityBasedSearch";

interface Caregiver {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  location?: string;
  dailyRate?: number;
  weeklyRate?: number;
  specialization?: string;
  serviceType?: string;
  yearsExperience?: number;
  rating?: number;
  reviewCount?: number;
  totalReviews?: number;
  profilePicture?: string;
  bio?: string;
  status?: string;
  isApproved?: boolean;
  certifications?: string[];
  providedServices?: string[];
  availability?: {
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
  };
}

interface FindCaregiverProps {
  isEmbedded?: boolean;
}

// FindCaregiver component - Display list of all registered caregivers with search and filter functionality
// Can be used standalone or embedded within dashboard
const FindCaregiver = ({ isEmbedded = false }: FindCaregiverProps = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [filteredCaregivers, setFilteredCaregivers] = useState<Caregiver[]>([]);
  const [familyNeededServices, setFamilyNeededServices] = useState<string[] | null>(null);
  const [familyLocation, setFamilyLocation] = useState<string | null>(null);
  const [familyCoords, setFamilyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [recommendedCaregivers, setRecommendedCaregivers] = useState<(Caregiver & { matchScore: number; matchedServices: string[] })[]>([]);
  const [recommendedExpanded, setRecommendedExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [searchMode, setSearchMode] = useState<"general" | "proximity">("general");
  const [serviceFilters, setServiceFilters] = useState<string[]>([]); // multiple selected services

  // Fetch caregivers on component mount
  useEffect(() => {
    fetchCaregivers();
  }, []);

  // Fetch caregivers from API
  const fetchCaregivers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await userAPI.getCaregivers();

      // If logged-in user is a family, fetch their profile and filter caregivers
      const userId = localStorage.getItem('userId');
      const userType = localStorage.getItem('userType');

      let initialFiltered = response;

      if (userId && userType === 'family') {
        try {
          const profile = await userAPI.getProfile(userId);
          const needed = profile?.neededServices || profile?.neededServicesNeeded || [];
          const loc = profile?.location || null;
          const lat = typeof profile?.latitude === 'number' ? profile.latitude : 0;
          const lng = typeof profile?.longitude === 'number' ? profile.longitude : 0;
          setFamilyNeededServices(needed || []);
          setFamilyLocation(loc);
          setFamilyCoords(lat !== 0 && lng !== 0 ? { lat, lng } : null);

          if (Array.isArray(needed) && needed.length > 0) {
            initialFiltered = response.filter((cg: Caregiver) => {
              const provided = cg.providedServices || [];
              return provided.some((p) => needed.includes(p));
            });
          }
        } catch (err) {
          console.warn('Failed to fetch family profile for needed services filter', err);
        }
      }

      // Display caregivers (filtered for families, otherwise all)
      setCaregivers(response);
      setFilteredCaregivers(initialFiltered);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch caregivers';
      setError(errorMessage);
      console.error('Error fetching caregivers:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search caregivers
  useEffect(() => {
    let filtered = caregivers;

    // Apply search term filter: only location and provided services
    if (searchTerm) {
      filtered = filtered.filter((caregiver) => {
        const location = (caregiver.location || "").toLowerCase();
        const providedServicesString = (caregiver.providedServices || []).join(' ').toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        return (
          location.includes(searchLower) ||
          providedServicesString.includes(searchLower)
        );
      });
    }

    // Apply rating filter
    if (filterRating !== "all") {
      const minRating = parseFloat(filterRating);
      filtered = filtered.filter(
        (caregiver) => (caregiver.rating || 0) >= minRating
      );
    }

    // Apply service filters (if any selected, show caregivers that provide any of the selected services)
    if (serviceFilters.length > 0) {
      filtered = filtered.filter((caregiver) => (caregiver.providedServices || []).some((s) => serviceFilters.includes(s)));
    }

    setFilteredCaregivers(filtered);
  }, [searchTerm, filterRating, caregivers, serviceFilters]);

  // Haversine formula — returns distance in km between two GPS coordinates
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Compute "Recommended for You" whenever caregivers, services, or location changes
  useEffect(() => {
    const hasServices = Array.isArray(familyNeededServices) && familyNeededServices.length > 0;
    const hasCoords = familyCoords !== null;
    const hasLocation = typeof familyLocation === 'string' && familyLocation.trim().length > 0;

    if (!hasServices && !hasCoords && !hasLocation) {
      setRecommendedCaregivers([]);
      return;
    }

    // Tokenize location string — used only as fallback when GPS coords are missing
    const locationTokens = hasLocation
      ? familyLocation!.toLowerCase().split(/[\s,]+/).filter(Boolean)
      : [];

    // Max radius for scoring: caregivers beyond this distance score 0 for location
    const MAX_RADIUS_KM = 50;

    const scored = caregivers
      .map((cg) => {
        // Services score: fraction of family's needed services this caregiver provides
        let servicesScore = 0;
        let matchedServices: string[] = [];
        if (hasServices) {
          const provided = cg.providedServices || [];
          matchedServices = familyNeededServices!.filter((s) => provided.includes(s));
          servicesScore = matchedServices.length / familyNeededServices!.length;
        }

        // Location score: Haversine distance when GPS available, word-overlap as fallback
        let locationScore = 0;
        const cgLat = (cg as any).latitude;
        const cgLng = (cg as any).longitude;
        const cgHasCoords = typeof cgLat === 'number' && cgLat !== 0 && typeof cgLng === 'number' && cgLng !== 0;

        if (hasCoords && cgHasCoords) {
          // GPS path — linear decay: 0 km → 1.0, MAX_RADIUS_KM → 0.0
          const distKm = haversineKm(familyCoords!.lat, familyCoords!.lng, cgLat, cgLng);
          locationScore = Math.max(0, 1 - distKm / MAX_RADIUS_KM);
        } else if (hasLocation && cg.location) {
          // Fallback: word-overlap on location strings
          const cgTokens = cg.location.toLowerCase().split(/[\s,]+/).filter(Boolean);
          const matched = locationTokens.filter((t) => cgTokens.includes(t)).length;
          locationScore = locationTokens.length > 0 ? matched / locationTokens.length : 0;
        }

        // Combined score — weight services heavier than location
        const totalScore = hasServices
          ? servicesScore * 0.65 + locationScore * 0.35
          : locationScore;

        return { ...cg, matchScore: Math.round(totalScore * 100), matchedServices };
      })
      .filter((cg) => cg.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);

    setRecommendedCaregivers(scored);
  }, [caregivers, familyNeededServices, familyLocation, familyCoords]);

  // Toggle favorite caregiver
  const toggleFavorite = (caregiverId: string) => {
    setFavoriteIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(caregiverId)) {
        newSet.delete(caregiverId);
      } else {
        newSet.add(caregiverId);
      }
      return newSet;
    });
  };

  // Toggle expanded card details
  const toggleCardExpanded = (caregiverId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(caregiverId)) {
        newSet.delete(caregiverId);
      } else {
        newSet.add(caregiverId);
      }
      return newSet;
    });
  };

  // Navigate to caregiver profile
  const goToProfile = (caregiverId: string) => {
    navigate(`/caregiver/${caregiverId}`);
  };

  const bookNow = (caregiverId: string) => {
    navigate(`/booking?caregiver=${caregiverId}`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterRating("all");
    setServiceFilters([]);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={isEmbedded ? "w-full" : "min-h-screen bg-gradient-to-b from-slate-50 to-slate-100"}>
        <div className={isEmbedded ? "w-full" : "max-w-7xl mx-auto px-4 py-8"}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Find a Caregiver</h1>
            <p className="text-slate-600">Browse our network of qualified caregivers</p>
          </div>

          {/* Loading skeleton grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="pt-4">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={isEmbedded ? "w-full" : "min-h-screen bg-gradient-to-b from-slate-50 to-slate-100"}>
        <div className={isEmbedded ? "w-full" : "max-w-7xl mx-auto px-4 py-8"}>
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-900">Error Loading Caregivers</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-red-800">
              {error}
              <Button
                onClick={fetchCaregivers}
                className="mt-4 bg-red-600 hover:bg-red-700"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen bg-gradient-to-b from-slate-50 to-slate-100"}>
      <div className={isEmbedded ? "w-full" : "max-w-7xl mx-auto px-4 py-8"}>
        {/* Header - Only show on standalone */}
        {!isEmbedded && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Find a Caregiver</h1>
            <p className="text-slate-600">Browse our network of {caregivers.length} qualified caregivers</p>
          </div>
        )}

        {/* Search Mode Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchMode("general")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                searchMode === "general"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Browse All Caregivers
            </button>
            <button
              onClick={() => setSearchMode("proximity")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                searchMode === "proximity"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Find by Location
            </button>
          </div>
        </div>

        {/* Content based on search mode */}
        {searchMode === "proximity" ? (
          <ProximityBasedSearch />
        ) : (
          <>
            {/* Recommended for You Section */}
            {recommendedCaregivers.length > 0 && (
              <div className="mb-8">
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      Recommended for you
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Based on your location{familyNeededServices && familyNeededServices.length > 0 ? ' and care needs' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setRecommendedExpanded((prev) => !prev)}
                    className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    {recommendedExpanded ? (
                      <><ChevronUp className="h-4 w-4" /> Hide</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> Show</>
                    )}
                  </button>
                </div>

                {recommendedExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendedCaregivers.map((cg) => {
                      const fullName = cg.name || `${cg.firstName || ''} ${cg.lastName || ''}`.trim();
                      const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                      const rating = typeof cg.rating === 'number' ? cg.rating : 0;
                      const fullStars = Math.floor(rating);
                      const hasHalf = rating - fullStars >= 0.5;
                      const scoreColor =
                        cg.matchScore >= 60
                          ? 'text-emerald-500'
                          : cg.matchScore >= 35
                          ? 'text-amber-500'
                          : 'text-slate-400';

                      return (
                        <div
                          key={`rec-${cg._id}`}
                          className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col"
                        >
                          <div className="flex flex-col gap-3 p-4 flex-1 min-w-0">
                            {/* Top row: avatar + name/location + match score */}
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              {cg.profilePicture ? (
                                <img
                                  src={getFullImageUrl(cg.profilePicture) || cg.profilePicture}
                                  alt={fullName}
                                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-base">
                                  {initials}
                                </div>
                              )}

                              {/* Name + subtitle + location */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 leading-tight truncate">{fullName}</p>
                                {(cg.specialization || cg.serviceType) && (
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{cg.specialization || cg.serviceType}</p>
                                )}
                                {cg.location && (
                                  <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-1 truncate">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {cg.location}
                                  </p>
                                )}
                              </div>

                              {/* Match score — the most important number, made visible */}
                              <div className="flex-shrink-0 text-right">
                                <p className={`text-2xl font-extrabold leading-none ${scoreColor}`}>{cg.matchScore}%</p>
                                <p className="text-xs text-slate-400 mt-0.5">match</p>
                              </div>
                            </div>

                            {/* Bio snippet */}
                            {cg.bio && (
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{cg.bio}</p>
                            )}

                            {/* Rating row */}
                            <div className="flex items-center gap-1.5">
                              {rating > 0 ? (
                                <>
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <span key={i} className={`text-sm ${i < fullStars ? 'text-amber-400' : (i === fullStars && hasHalf ? 'text-amber-300' : 'text-slate-200')}`}>★</span>
                                    ))}
                                  </div>
                                  <span className="text-xs font-medium text-slate-600">{rating.toFixed(1)}</span>
                                  {cg.totalReviews > 0 && (
                                    <span className="text-xs text-slate-400">({cg.totalReviews})</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-slate-300">No reviews yet</span>
                              )}
                            </div>

                            {/* Matched services as dot-separated text — cleaner than pills */}
                            {cg.matchedServices.length > 0 && (
                              <p className="text-xs text-slate-400 truncate">
                                {cg.matchedServices.join(' · ')}
                              </p>
                            )}

                            {/* Footer: price (prominent) + action buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                              <div>
                                {cg.dailyRate ? (
                                  <>
                                    <span className="text-lg font-bold text-slate-900">GH₵{cg.dailyRate}</span>
                                    <span className="text-xs text-slate-400 ml-0.5">/ day</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">Rate not listed</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                  onClick={() => goToProfile(cg._id)}
                                >
                                  Profile
                                </button>
                                <button
                                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                                  onClick={() => bookNow(cg._id)}
                                >
                                  Book
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-b border-slate-100 mt-6 mb-2" />
              </div>
            )}

            {/* Search and Filter Section */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
              {/* Search row */}
              <div className="relative mb-4">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, location or service…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent transition"
                />
              </div>

              {/* Second row: service pills + rating select + clear */}
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Service filter pills */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Service</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setServiceFilters([])}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        serviceFilters.length === 0
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      All
                    </button>
                    {Array.from(new Set(caregivers.flatMap((c) => c.providedServices || []))).map((svc: any) => (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => setServiceFilters((prev) =>
                          prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
                        )}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          serviceFilters.includes(svc)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {svc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating + clear row */}
                <div className="flex items-end gap-3 flex-shrink-0">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Min rating</p>
                    <select
                      value={filterRating}
                      onChange={(e) => setFilterRating(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent transition"
                    >
                      <option value="all">Any</option>
                      <option value="4.5">4.5 ★+</option>
                      <option value="4">4 ★+</option>
                      <option value="3.5">3.5 ★+</option>
                      <option value="3">3 ★+</option>
                    </select>
                  </div>

                  {(searchTerm || filterRating !== "all" || serviceFilters.length > 0) && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Active filter chips */}
              {(searchTerm || filterRating !== "all" || serviceFilters.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="hover:text-slate-900"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {filterRating !== "all" && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {filterRating}★+
                      <button onClick={() => setFilterRating('all')} className="hover:text-slate-900"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {serviceFilters.map((svc) => (
                    <span key={svc} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary text-white">
                      {svc}
                      <button onClick={() => setServiceFilters((prev) => prev.filter((s) => s !== svc))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{filteredCaregivers.length}</span> of{" "}
                <span className="font-semibold text-slate-900">{caregivers.length}</span> caregivers
              </p>
            </div>

        {/* No Results */}
        {filteredCaregivers.length === 0 ? (
          <Card className="text-center py-12 border-slate-200">
            <CardContent>
              <SearchIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No caregivers found</h3>
              <p className="text-slate-600 mb-4">
                Try adjusting your search filters
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Caregivers Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCaregivers.map((caregiver) => {
              const isExpanded = expandedCards.has(caregiver._id);
              const fullName = caregiver.name || `${caregiver.firstName} ${caregiver.lastName}`;
              const availableDays = caregiver.availability ? Object.entries(caregiver.availability)
                .filter(([_, available]) => available)
                .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
                .slice(0, 5) : [];

              const rating = typeof caregiver.rating === 'number' ? caregiver.rating : 0;
              const fullStars = Math.floor(rating);
              const hasHalf = rating - fullStars >= 0.5;
              const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <div
                  key={caregiver._id}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col"
                >
                  <div className="flex flex-col gap-3 p-4 flex-1 min-w-0">
                    {/* Top row: avatar + name + location */}
                    <div className="flex items-start gap-3">
                      {caregiver.profilePicture ? (
                        <img
                          src={getFullImageUrl(caregiver.profilePicture) || caregiver.profilePicture}
                          alt={fullName}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          onError={(e) => {
                            const t = e.currentTarget as HTMLImageElement;
                            t.onerror = null;
                            t.style.display = 'none';
                          }}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-base">
                          {initials}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 leading-tight truncate">{fullName}</p>
                        {(caregiver.specialization || caregiver.serviceType) && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{caregiver.specialization || caregiver.serviceType}</p>
                        )}
                        {caregiver.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {caregiver.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {caregiver.bio && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{caregiver.bio}</p>
                    )}

                    {/* Rating row */}
                    <div className="flex items-center gap-1.5">
                      {rating > 0 ? (
                        <>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-sm ${i < fullStars ? 'text-amber-400' : (i === fullStars && hasHalf ? 'text-amber-300' : 'text-slate-200')}`}>★</span>
                            ))}
                          </div>
                          <span className="text-xs font-medium text-slate-600">{rating.toFixed(1)}</span>
                          {(caregiver.reviewCount || caregiver.totalReviews) ? (
                            <span className="text-xs text-slate-400">({caregiver.reviewCount || caregiver.totalReviews})</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">No reviews yet</span>
                      )}
                      {caregiver.yearsExperience ? (
                        <span className="text-xs text-slate-400 ml-auto">{caregiver.yearsExperience} yrs exp</span>
                      ) : null}
                    </div>

                    {/* Services as dot-separated text */}
                    {caregiver.providedServices && caregiver.providedServices.length > 0 && (
                      <p className="text-xs text-slate-400 truncate">
                        {caregiver.providedServices.slice(0, 4).join(' · ')}
                      </p>
                    )}

                    {/* Expandable details */}
                    {(caregiver.certifications?.length || availableDays.length) ? (
                      <div className="border-t border-slate-100 pt-2">
                        <button
                          onClick={() => toggleCardExpanded(caregiver._id)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? 'Less info' : 'More info'}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3 animate-in fade-in-50 duration-200">
                            {caregiver.certifications && caregiver.certifications.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                  <Award className="h-3.5 w-3.5" /> Certifications
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {caregiver.certifications.map((cert, idx) => (
                                    <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />{cert}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {availableDays.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" /> Available
                                </p>
                                <p className="text-xs text-slate-400">{availableDays.join(' · ')}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Footer: price + actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                      <div>
                        {caregiver.dailyRate ? (
                          <>
                            <span className="text-lg font-bold text-slate-900">GH₵{caregiver.dailyRate}</span>
                            <span className="text-xs text-slate-400 ml-0.5">/ day</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Rate not listed</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                          onClick={(e) => { e.stopPropagation(); goToProfile(caregiver._id); }}
                        >
                          Profile
                        </button>
                        <button
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                          onClick={(e) => { e.stopPropagation(); bookNow(caregiver._id); }}
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default FindCaregiver;
