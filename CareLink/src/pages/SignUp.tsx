// Import useState hook for managing component state
import { useState, useEffect } from "react";
// Import Link component for navigation between pages
import { Link, useNavigate, useLocation } from "react-router-dom";
// Import Button UI component for submit actions
import { Button } from "@/components/ui/button";
// Import icon components for visual elements (heart, users, briefcase, eye icons)
import { Heart, Users, Briefcase, Eye, EyeOff, CheckCircle2, Shield, ChevronDown, ChevronUp, X, FileText, AlertCircle, Users as UsersIcon, Scale, Database, Lock } from "lucide-react";
// Import API client for backend communication
import { userAPI } from "@/lib/api";
// Import toast notifications for user feedback
import { useToast } from "@/hooks/use-toast";
// Import Google OAuth
import { GoogleLogin } from "@react-oauth/google";
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

// SignUp component - User registration page for both families and caregivers
const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // role state - Tracks if user is signing up as "family" or "caregiver" (null when deciding)
  const [role, setRole] = useState<"family" | "caregiver" | null>(null);
  // showPassword state - Toggles password visibility in input field
  const [showPassword, setShowPassword] = useState(false);
  // formData state - Stores user input for name, email, phone, password, location (caregiver), rate (caregiver), and consent checkbox
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    location: "", // For both families and caregivers
    latitude: 0, // Latitude coordinate
    longitude: 0, // Longitude coordinate
    dailyRate: "", // For caregivers
    providedServices: [] as string[], // For caregivers
    neededServices: [] as string[], // For families
    certifications: [] as string[], // For caregivers
    licenseNumber: "", // For caregivers - License number
    mobileMoneyNumber: "", // For caregivers - Mobile Money number
    mobileMoneyName: "", // For caregivers - Mobile Money account name
    accountNumber: "", // For caregivers - Bank account number
    accountName: "", // For caregivers - Bank account name
    consent: false
  });
  // State to track loading and error states
  const [isLoading, setIsLoading] = useState(false);
  // State for profile picture upload
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  // Only allow showing a profile picture preview when signup is via Google
  const [allowProfilePreview, setAllowProfilePreview] = useState(false);
  const [error, setError] = useState("");
  // State for certification input
  const [certificationInput, setCertificationInput] = useState("");
  // State for file uploads (caregiver documents)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // State for Terms modal
  const [showTermsModal, setShowTermsModal] = useState(false);
  // State for Privacy modal
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [expandedPrivacySections, setExpandedPrivacySections] = useState<number[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  // map visibility toggle, default hidden per new requirement
  const [showMap, setShowMap] = useState(false);
  const debounceLocationSearch = createDebounce(300);

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

  // Handle profile picture selection
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Profile picture must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setProfilePictureFile(file);
    // Only create a preview if previews are allowed (Google signup case)
    if (allowProfilePreview) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicturePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Ensure no preview is shown for manual form uploads
      setProfilePicturePreview(null);
    }
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

  // Set initial role based on URL path
  useEffect(() => {
    if (location.pathname === "/signup/family") {
      setRole("family");
    } else if (location.pathname === "/signup/caregiver") {
      setRole("caregiver");
    }
    // If it's just "/signup", keep role as null to show role selection
  }, [location.pathname]);

  // Available services for caregivers to select
  const availableServices = [
    "Basic life needs",
    "Companionship",
    "Physiotherapy",
    "Feeding assistance",
    "Mobility support"
  ];

  // Terms sections array with icons and content
  const termsSections = [
    {
      icon: <UsersIcon className="h-6 w-6" />,
      title: "Eligibility & Registration",
      content: "You must be at least 18 years old to use CareLink. By registering, you agree to provide accurate information and maintain the confidentiality of your account credentials. Caregivers must complete identity verification and credential submission."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Platform Use",
      content: "CareLink provides a matching platform connecting families with caregivers. We facilitate connections but do not directly employ caregivers. All care arrangements are between families and caregivers directly."
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "Verification Process",
      content: "Caregivers undergo background checks and credential verification. Verified credentials are securely stored for authenticity. While we strive for accuracy, families should conduct their own due diligence before engaging care services."
    },
    {
      icon: <Scale className="h-6 w-6" />,
      title: "Liability & Disputes",
      content: "CareLink acts as an intermediary platform. We are not liable for the quality of care provided or disputes between users. Users agree to resolve disputes through our mediation process before pursuing legal action."
    },
    {
      icon: <AlertCircle className="h-6 w-6" />,
      title: "Prohibited Conduct",
      content: "Users may not misrepresent qualifications, engage in fraudulent activity, harass other users, or use the platform for illegal purposes. Violations may result in account suspension or termination."
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Research Participation",
      content: "CareLink may conduct research to improve services. Participation is voluntary and anonymized. By using the platform, you may be invited to participate in surveys or studies. You can opt out at any time."
    }
  ];

  // Privacy sections array with icons and content
  const privacySections = [
    {
      icon: <Database className="h-6 w-6" />,
      title: "Data Collection",
      content: "We collect information you provide directly, such as name, email, and phone number. For caregivers, we also collect professional credentials, certifications, and work history for verification and matching purposes."
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Data Security",
      content: "Your data is encrypted at rest and in transit using industry-standard AES-256 encryption. Credential records are securely stored and protected against unauthorized access."
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Data Usage",
      content: "We use your data to provide and improve our services, including caregiver matching, identity verification, and platform analytics. We never sell your personal information to third parties."
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "User Rights",
      content: "You have the right to access, correct, or delete your personal data. You can request a copy of your data or ask us to remove your account at any time through your account settings or by contacting support."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Blockchain Verification",
      content: "Caregiver credentials are verified and securely stored. Only verification status (verified/unverified) is visible to families; full credential details remain private and are not shared publicly."
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Research Compliance",
      content: "Any research using platform data is conducted in compliance with applicable regulations and ethics guidelines. Participation in research studies is voluntary and requires explicit consent."
    }
  ];

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const togglePrivacySection = (index: number) => {
    setExpandedPrivacySections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!role) {
      setError("Please select a role first");
      return;
    }

    // disallow caregivers from using Google signup now that login is removed
    if (role === "caregiver") {
      setError("Google signup is not available for caregivers. Please register using the form.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await userAPI.googleAuth(credentialResponse.credential, role);

      // If the Google response includes a profile picture, allow and show preview
      if (response?.user?.profilePicture) {
        setAllowProfilePreview(true);
        setProfilePicturePreview(response.user.profilePicture);
      }

      // automatically log in families since caregivers are blocked above
      localStorage.setItem("token", response.token);
      localStorage.setItem("userId", response.user.id);
      localStorage.setItem("userType", response.user.userType);

      toast({
        title: "Success",
        description: "Account created with Google successfully!",
      });

      navigate("/family-dashboard");
    } catch (err: any) {
      const errorMessage = err.message || "Google signup failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google signup failed. Please try again.");
    toast({
      title: "Error",
      description: "Google signup failed",
      variant: "destructive",
    });
  };

  // File handling functions for caregiver document uploads
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...newFiles]);
      setError("");
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  // Certification management functions
  const handleAddCertification = () => {
    if (certificationInput.trim() && !formData.certifications.includes(certificationInput.trim())) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, certificationInput.trim()]
      });
      setCertificationInput("");
      setError("");
    }
  };

  const handleRemoveCertification = (index: number) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index)
    });
  };

  // handleSubmit function - Processes form submission and redirects to appropriate dashboard
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default HTML form submission behavior
    e.preventDefault();
    // Verify that user has selected a role
    if (!role) return;

    // wipe any existing auth state so an unapproved caregiver can't reuse
    // an old token from a previous session
    if (role === "caregiver") {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userType");
    }
    
    setError("");
    setIsLoading(true);

    try {
      // Validate location is provided
      if (!formData.location.trim()) {
        setError("Location is required for both families and caregivers");
        setIsLoading(false);
        return;
      }

      if (role === "caregiver") {
        // must have license number
        if (!formData.licenseNumber.trim()) {
          setError("License number is required for caregiver registration");
          setIsLoading(false);
          return;
        }

        // must have at least one file before registering
        if (selectedFiles.length === 0) {
          setError("Please upload at least one document before submitting");
          setIsLoading(false);
          return;
        }

        // must have at least one service selected
        if (formData.providedServices.length === 0) {
          setError("Please select at least one service you provide");
          setIsLoading(false);
          return;
        }

        // must have at least one payment method (Mobile Money OR Bank Account)
        const hasMobileMoneyNumber = formData.mobileMoneyNumber.trim().length > 0;
        const hasAccountNumber = formData.accountNumber.trim().length > 0;
        
        if (!hasMobileMoneyNumber && !hasAccountNumber) {
          setError("Please provide at least one payment method: either Mobile Money number or Bank Account number");
          setIsLoading(false);
          return;
        }

        // if Mobile Money number is provided, name should also be provided
        if (hasMobileMoneyNumber && !formData.mobileMoneyName.trim()) {
          setError("Please provide the account name for your Mobile Money number");
          setIsLoading(false);
          return;
        }

        // if Bank account is provided, account name should also be provided
        if (hasAccountNumber && !formData.accountName.trim()) {
          setError("Please provide the account name for your Bank Account");
          setIsLoading(false);
          return;
        }

        // build multipart form data
        const data = new FormData();
        data.append("name", formData.name);
        data.append("email", formData.email);
        data.append("phone", formData.phone);
        data.append("password", formData.password);
        data.append("location", formData.location);
        data.append("latitude", formData.latitude.toString());
        data.append("longitude", formData.longitude.toString());
        data.append("dailyRate", formData.dailyRate || "0");
        data.append("providedServices", JSON.stringify(formData.providedServices));
        data.append("certifications", JSON.stringify(formData.certifications));
        data.append("licenseNumber", formData.licenseNumber || "");
        data.append("mobileMoneyNumber", formData.mobileMoneyNumber || "");
        data.append("mobileMoneyName", formData.mobileMoneyName || "");
        data.append("accountNumber", formData.accountNumber || "");
        data.append("accountName", formData.accountName || "");

        selectedFiles.forEach((file) => {
          data.append("credentials", file);
        });

        // Add profile picture if provided
        if (profilePictureFile) {
          data.append("profilePicture", profilePictureFile);
        }

        const response = await userAPI.registerCaregiver(data);
        // response contains token even if not approved
        // but we do not log in caregiver here
        toast({
          title: "Success",
          description: "Registration complete. Your documents are under review.",
        });
        navigate("/login");
      } else {
        // Family validation
        if (formData.neededServices.length === 0) {
          setError("Please select at least one service you need");
          setIsLoading(false);
          return;
        }

        const registrationData: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          userType: role,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          neededServices: formData.neededServices,
        };

        // If family member has profile picture, send as FormData
        if (profilePictureFile) {
          const formDataWithPicture = new FormData();
          Object.keys(registrationData).forEach(key => {
            if (Array.isArray(registrationData[key])) {
              formDataWithPicture.append(key, JSON.stringify(registrationData[key]));
            } else {
              formDataWithPicture.append(key, registrationData[key]);
            }
          });
          formDataWithPicture.append("profilePicture", profilePictureFile);

          const response = await userAPI.register(formDataWithPicture);
          // refresh profile from server to ensure neededServices and other fields are present
          try {
            const freshProfile = await userAPI.getProfile(response.user.id);
            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(freshProfile));
            localStorage.setItem("userId", freshProfile.id || response.user.id);
            localStorage.setItem("userType", freshProfile.userType || response.user.userType);
            localStorage.setItem("profilePicture", freshProfile.profilePicture || response.user.profilePicture || "");
          } catch (err) {
            // fallback to response.user if profile fetch fails
            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(response.user));
            localStorage.setItem("userId", response.user.id);
            localStorage.setItem("userType", response.user.userType);
            localStorage.setItem("profilePicture", response.user.profilePicture || "");
          }
        } else {
          const response = await userAPI.register(registrationData);
          try {
            const freshProfile = await userAPI.getProfile(response.user.id);
            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(freshProfile));
            localStorage.setItem("userId", freshProfile.id || response.user.id);
            localStorage.setItem("userType", freshProfile.userType || response.user.userType);
          } catch (err) {
            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(response.user));
            localStorage.setItem("userId", response.user.id);
            localStorage.setItem("userType", response.user.userType);
          }
        }

        toast({ title: "Success", description: "Account created successfully!" });
        navigate("/family-dashboard");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Registration failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold text-foreground">CareLink</span>
        </Link>

        <div className="card-elevated p-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">Create Your Account</h1>
          <p className="text-muted-foreground text-center mb-8">Join our caring community today</p>

          {/* Role Selection */}
          {!role ? (
            <div className="space-y-4" role="group" aria-labelledby="role-instructions">
              <p id="role-instructions" className="text-sm font-medium text-foreground mb-4">I am looking to:</p>
              <button
                onClick={() => setRole("family")}
                className="w-full p-4 rounded-xl border-2 border-border hover:border-primary bg-background flex items-center gap-4 transition-all hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="I need care for my family"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center" aria-hidden="true">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Family Member</p>
                  <p className="text-sm text-muted-foreground">I need care for my family</p>
                </div>
              </button>
              <button
                onClick={() => setRole("caregiver")}
                className="w-full p-4 rounded-xl border-2 border-border hover:border-accent bg-background flex items-center gap-4 transition-all hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="Become a Caregiver - I want to provide care"
              >
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center" aria-hidden="true">
                  <Briefcase className="h-6 w-6 text-accent" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Become a Caregiver</p>
                  <p className="text-sm text-muted-foreground">I want to provide care</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 mb-6">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${role === "family" ? "bg-primary/10" : role === "caregiver" ? "bg-accent/10" : "bg-destructive/10"}`} aria-hidden="true">
                  {role === "family" ? <Users className="h-5 w-5 text-primary" /> : role === "caregiver" ? <Briefcase className="h-5 w-5 text-accent" /> : <Shield className="h-5 w-5 text-destructive" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {role === "family" ? "Family / Client" : role === "caregiver" ? "Caregiver" : "Admin"}
                  </p>
                  <button type="button" onClick={() => {
                    setRole(null);
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      password: "",
                      location: "",
                      latitude: 0,
                      longitude: 0,
                      dailyRate: "",
                      providedServices: [],
                      neededServices: [],
                      certifications: [],
                      mobileMoneyNumber: "",
                      mobileMoneyName: "",
                      accountNumber: "",
                      accountName: "",
                      consent: false
                    });
                    setSelectedFiles([]);
                    setCertificationInput("");
                    setError("");
                  }} className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1">
                    Change role
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="full-name" className="block text-sm font-medium text-foreground mb-2">
                  Full Name <span aria-label="required">*</span>
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base"
                  placeholder="Enter your full name"
                  required
                  disabled={isLoading}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-foreground mb-2">
                  Email Address <span aria-label="required">*</span>
                </label>
                <input
                  id="email-address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-base"
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>

              <div>
                <label htmlFor="phone-number" className="block text-sm font-medium text-foreground mb-2">
                  Phone Number <span aria-label="required">*</span>
                </label>
                <input
                  id="phone-number"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-base"
                  placeholder={role === "family" ? "Enter phone number" : "10 digits, e.g. 0241234567"}
                  pattern={role === "family" ? undefined : "\\d{10}"}
                  title={role === "family" ? "Enter your phone number" : "Please enter exactly 10 digits"}
                  required
                  disabled={isLoading}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-foreground mb-2">
                  Password <span aria-label="required">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-base pr-12"
                    placeholder="Create a strong password"
                    required
                    disabled={isLoading}
                    aria-describedby={error ? "signup-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Profile Picture Upload (Optional) */}
              <div>
                <label htmlFor="profile-picture" className="block text-sm font-medium text-foreground mb-2">
                  Profile Picture (Optional)
                </label>
                <div className="space-y-3">
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    disabled={isLoading}
                    className="input-base"
                  />
                  {profilePicturePreview && (
                    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border">
                      <img
                        src={profilePicturePreview}
                        alt="Profile preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-primary"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Profile Picture Preview</p>
                        <p className="text-xs text-muted-foreground">This will be displayed on your profile</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePictureFile(null);
                          setProfilePicturePreview(null);
                        }}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload a profile picture (max 5MB, JPG, PNG, WebP). This is optional and can be changed later.
                  </p>
                </div>
              </div>

              {/* Location field for both families and caregivers */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
                  {role === "caregiver" ? "Service Location" : "Your Location"} <span aria-label="required">*</span>
                </label>
                <div className="relative">
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    className="input-base"
                    placeholder={role === "caregiver" ? "e.g., Accra, Greater Accra Region" : "e.g., Accra, Greater Accra Region"}
                    required
                    disabled={isLoading}
                    aria-describedby={error ? "signup-error" : undefined}
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
                  {role === "caregiver" ? "Where do you provide care services?" : "Where do you need care services?"} Or select on the map below.
                </p>
              </div>

              {/* Map for location selection */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1 mb-2"
                  disabled={isLoading}
                >
                  {showMap ? "Hide Map" : "Show Map"}
                </button>
                {showMap && (
                  <>
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
                      Click on the map to select your location
                    </p>
                  </>
                )}
              </div>

              {/* Family-specific fields */}
              {role === "family" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Services Needed</label>
                  <p className="text-sm text-muted-foreground mb-3">Select all services you need (multiple selections allowed)</p>
                  <div className="grid grid-cols-1 gap-2">
                    {availableServices.map((service) => (
                      <label key={service} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.neededServices.includes(service)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                neededServices: [...formData.neededServices, service]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                neededServices: formData.neededServices.filter(s => s !== service)
                              });
                            }
                          }}
                          className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                          disabled={isLoading}
                        />
                        <span className="text-sm text-foreground">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Caregiver-specific fields */}
              {role === "caregiver" && (
                <>

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
                            disabled={isLoading}
                          />
                          <span className="text-sm text-foreground">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="daily-rate" className="block text-sm font-medium text-foreground mb-2">
                      Daily Rate (GHS) <span aria-label="required">*</span>
                    </label>
                    <input
                      id="daily-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.dailyRate}
                      onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                      className="input-base"
                      placeholder="e.g., 150.00"
                      required
                      disabled={isLoading}
                      aria-describedby={error ? "signup-error" : undefined}
                    />
                  </div>

                  <div>
                    <label htmlFor="license-number" className="block text-sm font-medium text-foreground mb-2">
                      License Number <span aria-label="required">*</span>
                    </label>
                    <input
                      id="license-number"
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      className="input-base"
                      placeholder="e.g., LIC-2024-00123"
                      required
                      disabled={isLoading}
                      aria-describedby={error ? "signup-error" : undefined}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Your professional license number is required for caregiver verification</p>
                  </div>

                  {/* Certifications section */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Certifications & Qualifications</label>
                    <p className="text-sm text-muted-foreground mb-3">Add your professional certifications and qualifications</p>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={certificationInput}
                        onChange={(e) => setCertificationInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCertification();
                          }
                        }}
                        className="input-base flex-1"
                        placeholder="e.g., CPR Certified, First Aid, Nursing License"
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleAddCertification}
                        className="px-4"
                        type="button"
                        disabled={isLoading}
                      >
                        Add
                      </Button>
                    </div>

                    {formData.certifications.length > 0 && (
                      <div className="space-y-2">
                        {formData.certifications.map((cert, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg border border-border"
                          >
                            <span className="text-sm text-foreground">{cert}</span>
                            <button
                              onClick={() => handleRemoveCertification(index)}
                              className="text-destructive hover:text-destructive/80 transition-colors"
                              type="button"
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Documents upload section */}
                  <div>
                    <label htmlFor="documents" className="block text-sm font-medium text-foreground mb-2">
                      Upload Credentials <span aria-label="required">*</span>
                    </label>
                    <input
                      id="documents"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileSelect}
                      disabled={isLoading}
                      className="input-base"
                    />
                    {selectedFiles.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground">
                        {selectedFiles.map((file, idx) => (
                          <li key={idx} className="flex justify-between items-center">
                            {file.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-destructive hover:underline text-xs ml-2"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Payment Information Section */}
                  <div className="border-t border-secondary pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Payment Information</h3>
                    <p className="text-sm text-muted-foreground mb-6">Provide both Mobile Money and Bank account information so families can pay you after services</p>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Mobile Money Number <span aria-label="required" className="text-destructive">*</span></label>
                        <input
                          type="tel"
                          value={formData.mobileMoneyNumber}
                          onChange={(e) => setFormData({ ...formData, mobileMoneyNumber: e.target.value })}
                          className="input-base w-full"
                          placeholder="10 digits, e.g. 0241234567"
                          pattern="\\d{10}"
                          title="Please enter exactly 10 digits"
                          disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Format: 10 digits</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Mobile Money Account Name</label>
                        <input
                          type="text"
                          value={formData.mobileMoneyName}
                          onChange={(e) => setFormData({ ...formData, mobileMoneyName: e.target.value })}
                          className="input-base w-full"
                          placeholder="Account holder name"
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Bank Account Number <span aria-label="required" className="text-destructive">*</span></label>
                        <input
                          type="text"
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                          className="input-base w-full"
                          placeholder="Bank account number"
                          disabled={isLoading}
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
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4">
                      <p className="text-sm text-foreground">
                        <strong>Required:</strong> Please provide both your Mobile Money and Bank Account details; families will use whichever information you provide when making payments.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Error message display */}
              {error && (
                <div id="signup-error" className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}

              {/* Terms Dropdown Section */}
              <div className="space-y-3 border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(!showTermsModal)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                  aria-label={showTermsModal ? "Hide Terms of Service" : "Show Terms of Service"}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-foreground">Terms of Service</h3>
                  </div>
                  {showTermsModal ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {showTermsModal && (
                  <div className="px-4 pb-4 border-t border-border/50 bg-secondary/30 max-h-96 overflow-y-auto">
                    <div className="space-y-3 pt-4">
                      {termsSections.map((section, index) => (
                        <div key={index} className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                          <button
                            type="button"
                            onClick={() => toggleSection(index)}
                            className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                {section.icon}
                              </div>
                              <h4 className="font-medium text-sm text-foreground">{section.title}</h4>
                            </div>
                            {expandedSections.includes(index) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          {expandedSections.includes(index) && (
                            <div className="px-3 pb-3 border-t border-border/50 bg-secondary/20">
                              <p className="text-muted-foreground leading-relaxed pt-2 text-sm">{section.content}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Consent Checkbox */}
              <label htmlFor="consent-checkbox" className="flex items-start gap-3 cursor-pointer">
                <input
                  id="consent-checkbox"
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  required
                  disabled={isLoading}
                  aria-describedby="consent-text"
                />
                <span id="consent-text" className="text-sm text-muted-foreground">
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>

              {/* Privacy Policy Dropdown Section */}
              <div className="space-y-3 border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(!showPrivacyModal)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                  aria-label={showPrivacyModal ? "Hide Privacy Policy" : "Show Privacy Policy"}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-foreground">Privacy Policy</h3>
                  </div>
                  {showPrivacyModal ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {showPrivacyModal && (
                  <div className="px-4 pb-4 border-t border-border/50 bg-secondary/30 max-h-96 overflow-y-auto">
                    <div className="space-y-3 pt-4">
                      {privacySections.map((section, index) => (
                        <div key={index} className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                          <button
                            type="button"
                            onClick={() => togglePrivacySection(index)}
                            className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                {section.icon}
                              </div>
                              <h4 className="font-medium text-sm text-foreground">{section.title}</h4>
                            </div>
                            {expandedPrivacySections.includes(index) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          {expandedPrivacySections.includes(index) && (
                            <div className="px-3 pb-3 border-t border-border/50 bg-secondary/20">
                              <p className="text-muted-foreground leading-relaxed pt-2 text-sm">{section.content}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>

              {role !== "caregiver" && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                    </div>
                  </div>

                  <div>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      width="100%"
                    />
                  </div>
                </>
              )}
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
