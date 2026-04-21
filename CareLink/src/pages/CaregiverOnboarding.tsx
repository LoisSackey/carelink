// Import useState hook for managing multi-step form state
import { useState } from "react";
// Import Link and useNavigate components for navigation
import { Link, useNavigate } from "react-router-dom";
// Import Button UI component for form navigation
import { Button } from "@/components/ui/button";
// Import icon components for visual elements
import { Heart, Upload, CheckCircle2, Building, Award, MapPin, Briefcase, AlertCircle } from "lucide-react";
// Import API client
import { userAPI } from "@/lib/api";
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

// CaregiverOnboarding component - Multi-step form for new caregiver registration and profile setup
const CaregiverOnboarding = () => {
  const navigate = useNavigate();

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
    setFormData(prev => ({
      ...prev,
      location: address,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleLocationInputChange = (value: string) => {
    setFormData(prev => ({ ...prev, location: value }));
    
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
    setFormData(prev => ({
      ...prev,
      location: suggestion.displayName,
      latitude: suggestion.lat,
      longitude: suggestion.lng
    }));
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
    return formData.latitude && formData.longitude ? <Marker position={[formData.latitude, formData.longitude]} /> : null;
  }

  // step state - Tracks which step of the onboarding process (1, 2, or 3)
  const [step, setStep] = useState(1);
  // formData state - Stores caregiver profile information
  const [formData, setFormData] = useState({
    specialization: "",        // Type of care they provide
    providedServices: [] as string[], // Services they provide
    experience: "",            // Years or description of experience
    location: "",              // Service location
    latitude: 0,               // Latitude coordinate
    longitude: 0,              // Longitude coordinate
    institution: "",           // Training institution or certification issuer
    bio: "",                   // Professional biography/description
    certifications: [] as File[], // Uploaded certification documents
    skills: [] as string[],    // Selected skills
    dailyRate: "",             // Daily rate for services
    availability: {            // Availability days
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    mobileMoneyNumber: "",     // Mobile money number for payments
    mobileMoneyName: "",       // Name on mobile money account
    accountNumber: "",         // Bank account number
    accountName: ""            // Name on bank account
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const debounceLocationSearch = createDebounce(300);

  // specializations array - Available caregiving specialties
  const specializations = [
    "Elderly Care",
    "Child Care",
    "Disability Support",
    "Post-Surgery Recovery",
    "Dementia Care",
    "Palliative Care",
    "Physical Therapy Assistant",
    "Mental Health Support"
  ];

  // services array - Available caregiving services
  const availableServices = [
    "Basic life needs",
    "Companionship",
    "Physiotherapy",
    "Feeding assistance",
    "Mobility support"
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, ...Array.from(e.target.files)]
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      await handleCompleteOnboarding();
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!formData.specialization || !formData.experience || !formData.location || !formData.bio || formData.providedServices.length === 0) {
      setError("Please fill in all required fields and select at least one service");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      // Get current user ID from localStorage
      const userStr = localStorage.getItem("user");
      const userId = userStr ? JSON.parse(userStr).id : null;

      if (!userId) {
        navigate("/login");
        return;
      }

      // Update user profile with onboarding data
      const updateData = {
        specialization: formData.specialization,
        providedServices: formData.providedServices,
        experience: formData.experience,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        institution: formData.institution,
        bio: formData.bio,
        skills: formData.skills,
        dailyRate: formData.dailyRate ? parseInt(formData.dailyRate) : 500,
        availability: formData.availability,
        mobileMoneyNumber: formData.mobileMoneyNumber,
        mobileMoneyName: formData.mobileMoneyName,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
        onboardingCompleted: true
      };

      await userAPI.updateProfile(userId, updateData);
      
      // Redirect to caregiver dashboard
      navigate("/caregiver-dashboard");
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("Failed to complete onboarding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold text-foreground">CareLink</span>
        </Link>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-1 rounded ${s < step ? "bg-primary" : "bg-secondary"}`} />}
            </div>
          ))}
        </div>

        <div className="card-elevated p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-foreground">Professional Details</h1>
                  <p className="text-muted-foreground">Tell us about your caregiving expertise</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Specialization</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="input-base"
                    required
                  >
                    <option value="">Select your specialization</option>
                    {specializations.map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Services Provided</label>
                  <p className="text-sm text-muted-foreground mb-3">Select all services you can provide (multiple selections allowed)</p>
                  <div className="grid grid-cols-1 gap-2">
                    {availableServices.map((service) => (
                      <label key={service} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.providedServices.includes(service)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                providedServices: [...formData.providedServices, service]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                providedServices: formData.providedServices.filter(s => s !== service)
                              });
                            }
                          }}
                          className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Years of Experience</label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="input-base"
                    required
                  >
                    <option value="">Select experience level</option>
                    <option value="0-1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Brief Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="input-base min-h-[120px] resize-none"
                    placeholder="Tell families about yourself and your approach to caregiving..."
                    required
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-foreground">Location & Availability</h1>
                  <p className="text-muted-foreground">Where do you work and when are you available?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      className="input-base"
                      placeholder="City, State"
                      required
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

                {/* Map for location selection */}
                <div className="mt-4">
                  <div className="h-64 rounded-md overflow-hidden border">
                    <MapContainer
                      center={[5.6037, -0.1870]} // Default to Accra, Ghana
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
                    Click on the map to select your service location
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Institution / Agency (Optional)
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      className="input-base pl-10"
                      placeholder="Healthcare agency or institution"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Availability</label>
                  <p className="text-sm text-muted-foreground mb-4">Select the days you're available to provide care</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(formData.availability).map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.availability[day as keyof typeof formData.availability]}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              availability: {
                                ...formData.availability,
                                [day]: e.target.checked
                              }
                            });
                          }}
                          className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-foreground">Certifications</h1>
                  <p className="text-muted-foreground">Upload your credentials for blockchain verification</p>
                </div>

                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium mb-2">Upload Certifications</p>
                  <p className="text-sm text-muted-foreground mb-4">PDF, JPG, or PNG (max 10MB each)</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="cert-upload"
                  />
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="cert-upload" className="cursor-pointer">
                      Choose Files
                    </label>
                  </Button>
                </div>

                {formData.certifications.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Uploaded files:</p>
                    {formData.certifications.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm text-foreground">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-foreground">
                    <strong>Credential Verification:</strong> Your credentials will be securely verified and stored, ensuring authenticity and trust for families.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Daily Rate (GH₵)</label>
                  <input
                    type="number"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                    className="input-base"
                    placeholder="e.g., 500"
                    min="50"
                    step="10"
                  />
                </div>

                <div className="pt-6 border-t border-secondary">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Payment Information</h3>
                  <p className="text-sm text-muted-foreground mb-6">Provide your payment details so families can pay you after services</p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Mobile Money Number</label>
                      <input
                        type="tel"
                        value={formData.mobileMoneyNumber}
                        onChange={(e) => setFormData({ ...formData, mobileMoneyNumber: e.target.value })}
                        className="input-base w-full"
                        placeholder="10 digits, e.g. 0241234567"
                        pattern="\\d{10}"
                        title="Please enter exactly 10 digits"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Mobile Money Account Name</label>
                      <input
                        type="text"
                        value={formData.mobileMoneyName}
                        onChange={(e) => setFormData({ ...formData, mobileMoneyName: e.target.value })}
                        className="input-base w-full"
                        placeholder="Account holder name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Bank Account Number</label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="input-base w-full"
                        placeholder="Bank account number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Bank Account Name</label>
                      <input
                        type="text"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        className="input-base w-full"
                        placeholder="Account holder name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1" disabled={isSubmitting}>
                  Back
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : step === 3 ? "Complete Registration" : "Continue"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CaregiverOnboarding;
