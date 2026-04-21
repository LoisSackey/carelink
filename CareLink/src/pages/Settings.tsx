import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { searchLocations, createDebounce } from "@/utils/locationAutocomplete";
import { getFullImageUrl } from "@/utils/imageUrl";
import {
  LayoutDashboard,
  User,
  Lock,
  Bell,
  Shield,
  Save,
  Settings as SettingsIcon,
  Calendar,
  Search,
  History,
  Star,
  Briefcase,
  Mail,
  AlertCircle,
  CheckCircle2,
  LogOut,
  DollarSign,
  X,
  Trash2,
  FileText,
  CreditCard,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Available services for caregivers to select
  const availableServices = [
    "Basic life needs",
    "Companionship", 
    "Physiotherapy",
    "Feeding assistance",
    "Mobility support"
  ];
  
  const [userType, setUserType] = useState<"family" | "caregiver" | "admin" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSection, setCurrentSection] = useState<"profile" | "security" | "preferences" | "rates" | "availability" | "services" | "payment">("profile");
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    latitude: 0,
    longitude: 0,
    profileImage: "",
    neededServices: [] as string[],
  });
  
  // Security data
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  // Caregiver rates data
  const [ratesData, setRatesData] = useState({
    dailyRate: 0,
    serviceType: "other",
    bio: "",
    certifications: [] as string[],
    providedServices: [] as string[],
  });

  // Caregiver availability data
  const [availabilityData, setAvailabilityData] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  });

  // Caregiver payment data
  const [paymentData, setPaymentData] = useState({
    mobileMoneyNumber: "",
    mobileMoneyName: "",
    accountNumber: "",
    accountName: "",
  });

  const [certificationInput, setCertificationInput] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const debounceLocationSearch = createDebounce(300);

  // Get sidebar items based on user type
  const getSidebarItems = () => {
    if (userType === "family") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => navigate("/family-dashboard") },
        { icon: <Search className="h-5 w-5" />, label: "Find Caregiver", path: "/find-caregiver", action: () => navigate("/find-caregiver") },
        { icon: <History className="h-5 w-5" />, label: "History", path: "#history", action: () => navigate("/family-dashboard") },
        { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "#reviews", action: () => navigate("/family-dashboard") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "#settings", action: () => navigate("/settings") },
      ];
    } else if (userType === "caregiver") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => navigate("/caregiver-dashboard") },
        { icon: <Briefcase className="h-5 w-5" />, label: "Job Requests", path: "#requests", action: () => navigate("/caregiver-dashboard") },
        { icon: <History className="h-5 w-5" />, label: "History", path: "#history", action: () => navigate("/caregiver-dashboard#history") },
        { icon: <Calendar className="h-5 w-5" />, label: "Schedule", path: "#schedule", action: () => navigate("/caregiver-dashboard") },
        { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "#reviews", action: () => navigate("/caregiver-dashboard") },
        { icon: <CreditCard className="h-5 w-5 text-primary" />, label: "Payments", path: "#payments", action: () => navigate("/caregiver-dashboard#payments") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "#settings", action: () => navigate("/settings") },
      ];
    } else if (userType === "admin") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => navigate("/admin-dashboard") },
        { icon: <User className="h-5 w-5" />, label: "All Users", path: "#users", action: () => navigate("/admin-dashboard") },
        { icon: <Briefcase className="h-5 w-5" />, label: "Pending Caregivers", path: "#caregivers", action: () => navigate("/admin-dashboard") },
        { icon: <FileText className="h-5 w-5" />, label: "Bookings", path: "/admin-bookings", action: () => navigate("/admin-bookings") },
        { icon: <Trash2 className="h-5 w-5" />, label: "Deletion Requests", path: "#deletion-requests", action: () => navigate("/admin-dashboard") },
        { icon: <FileText className="h-5 w-5" />, label: "Credential Review", path: "#credential-review", action: () => navigate("/admin-dashboard#credential-review") },
        { icon: <FileText className="h-5 w-5" />, label: "Credential Browser", path: "#credential-browser", action: () => navigate("/admin-dashboard#credential-browser") },
        { icon: <Mail className="h-5 w-5" />, label: "Messages", path: "#messages", action: () => navigate("/admin-dashboard") },
        { icon: <Shield className="h-5 w-5" />, label: "Account Management", path: "#account-management", action: () => navigate("/admin-dashboard") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "#settings", action: () => navigate("/settings") },
      ];
    }
    return [];
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedUserType = localStorage.getItem("userType") as "family" | "caregiver" | "admin";
      const storedUserId = localStorage.getItem("userId");

      if (!storedUserType || !storedUserId) {
        navigate("/login");
        return;
      }

      setUserType(storedUserType);
      setUserId(storedUserId);

      // Load user profile
      const userData = await userAPI.getProfile(storedUserId);
      setProfileData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        location: userData.location || "",
        latitude: userData.latitude || 6.6271,
        longitude: userData.longitude || -0.3440,
        // backend stores picture under "profilePicture" field, convert to full URL
        profileImage: getFullImageUrl(userData.profilePicture) || userData.profilePicture || "",
        neededServices: userData.neededServices || [],
      });

      // Load caregiver rates if user is a caregiver
      if (storedUserType === "caregiver") {
        setRatesData({
          dailyRate: userData.dailyRate || 0,
          serviceType: userData.serviceType || "other",
          bio: userData.bio || "",
          certifications: userData.certifications || [],
          providedServices: userData.providedServices || [],
        });
        
        // Load availability if exists
        if (userData.availability) {
          setAvailabilityData(userData.availability);
        }

        // Load payment data if exists
        setPaymentData({
          mobileMoneyNumber: userData.mobileMoneyNumber || "",
          mobileMoneyName: userData.mobileMoneyName || "",
          accountNumber: userData.accountNumber || "",
          accountName: userData.accountName || "",
        });
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      
      if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userType");
        navigate("/login");
      } else {
        toast({
          title: "Error",
          description: err.message || "Failed to load settings",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNeededServices = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      await userAPI.updateProfile(userId, { neededServices: profileData.neededServices });
      toast({
        title: "Success",
        description: "Services needed updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update services needed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      await userAPI.updateProfile(userId, profileData);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRates = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      await userAPI.updateCaregiverRates(userId, ratesData);
      toast({
        title: "Success",
        description: "Rates updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update rates",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      await userAPI.updateProfile(userId, { availability: availabilityData });
      toast({
        title: "Success",
        description: "Availability updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update availability",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayment = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      await userAPI.updateProfile(userId, paymentData);
      toast({
        title: "Success",
        description: "Payment information updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update payment information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCertification = () => {
    if (certificationInput.trim()) {
      setRatesData({
        ...ratesData,
        certifications: [...ratesData.certifications, certificationInput.trim()],
      });
      setCertificationInput("");
    }
  };

  const handleRemoveCertification = (index: number) => {
    setRatesData({
      ...ratesData,
      certifications: ratesData.certifications.filter((_, i) => i !== index),
    });
  };

  const handleChangePassword = async () => {
    if (!securityData.newPassword || !securityData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Note: In production, implement actual password change endpoint
    toast({
      title: "Coming Soon",
      description: "Password change functionality will be available soon",
    });
    
    setSecurityData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleLocationInputChange = (value: string) => {
    setProfileData(prev => ({ ...prev, location: value }));
    debounceLocationSearch(async () => {
      if (value.trim().length >= 2) {
        const suggestions = await searchLocations(value);
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
      }
    });
  };

  const handleSelectLocation = (suggestion: any) => {
    setProfileData(prev => ({
      ...prev,
      location: suggestion.displayName,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lng),
    }));
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setProfileData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file (JPG, PNG, WEBP)",
          variant: "destructive",
        });
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload the file
      handleUploadProfilePicture(file);
    }
  };

  const handleUploadProfilePicture = async (file: File) => {
    if (!userId) return;

    setIsUploadingProfilePicture(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      // Use relative URL to leverage Vite proxy in development,
      // or absolute URL from VITE_API_URL in production
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/users/${userId}/upload-profile-picture`
        : `/api/users/${userId}/upload-profile-picture`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Use helper function to convert relative URL to full URL
      const imageUrl = getFullImageUrl(data.profilePicture);
      
      // Update profile data with new picture URL
      setProfileData(prev => ({
        ...prev,
        profileImage: imageUrl || data.profilePicture,
      }));

      // also notify other parts of the app (header layout) that the picture changed
      const evt = new CustomEvent('profilePictureChanged', { detail: imageUrl || data.profilePicture });
      window.dispatchEvent(evt);

      // Clear the preview to show the uploaded image immediately
      setProfilePicturePreview(null);

      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
      });
    } catch (err: any) {
      console.error('Error uploading profile picture:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to upload profile picture",
        variant: "destructive",
      });
      setProfilePicturePreview(null);
    } finally {
      setIsUploadingProfilePicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    // if a preview exists (user selected but hasn't uploaded yet), just clear it
    if (profilePicturePreview) {
      setProfilePicturePreview(null);
      return;
    }

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      await userAPI.removeProfilePicture(userId);

      // Update profile data (clear string to maintain same type)
      setProfileData(prev => ({
        ...prev,
        profileImage: "",
      }));

      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed successfully",
      });

      // ensure header updates too
      window.dispatchEvent(new CustomEvent('profilePictureChanged', { detail: '' }));
    } catch (err: any) {
      console.error("Error removing profile picture:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to remove profile picture",
        variant: "destructive",
      });
    }
  };

  const LogLocationMarker = () => {
    useMapEvents({
      click: (e) => {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userType");
    localStorage.removeItem("user");
    navigate("/login");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const handleRequestDeleteAccount = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Send deletion request to backend - admin must approve
      const response = await userAPI.requestDeleteAccount(userId);
      console.log("Delete request response:", response);
      
      toast({
        title: "Deletion request submitted",
        description: "Admin will review your account deletion request. You will be notified via email once processed.",
      });
      setShowDeleteModal(false);
      setDeleteConfirmation("");
    } catch (err: any) {
      console.error("Delete request error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to submit deletion request",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !userType) {
    return (
      <DashboardLayout sidebarItems={getSidebarItems()} userType={userType || "family"}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={getSidebarItems()} userType={userType}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        {/* Settings Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <div className="space-y-2">
              <button
                onClick={() => setCurrentSection("profile")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  currentSection === "profile"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => setCurrentSection("security")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  currentSection === "security"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Lock className="h-4 w-4" />
                Security
              </button>
              <button
                onClick={() => setCurrentSection("preferences")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  currentSection === "preferences"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Shield className="h-4 w-4" />
                Preferences
              </button>              {userType === "family" && (
                <button
                  onClick={() => setCurrentSection("services")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    currentSection === "services"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Briefcase className="h-5 w-5" />
                  Services Needed
                </button>
              )}              {userType === "caregiver" && (
                <>
                  <button
                    onClick={() => setCurrentSection("rates")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      currentSection === "rates"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    Rates & Services
                  </button>
                  <button
                    onClick={() => setCurrentSection("availability")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      currentSection === "availability"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Availability
                  </button>
                  <button
                    onClick={() => setCurrentSection("payment")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      currentSection === "payment"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Info
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="md:col-span-3">
            {/* Profile Section */}
            {currentSection === "profile" && (
              <div className="card-elevated p-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="input-base w-full"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="input-base w-full opacity-50 cursor-not-allowed"
                      placeholder="your.email@example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="input-base w-full"
                      placeholder="10 digits, e.g. 0241234567"
                      pattern="\\d{10}"
                      title="Please enter exactly 10 digits"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => handleLocationInputChange(e.target.value)}
                        className="input-base w-full"
                        placeholder="Enter your city or area"
                      />
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {locationSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              onClick={() => handleSelectLocation(suggestion)}
                              className="p-3 hover:bg-primary/10 cursor-pointer border-b border-gray-200 last:border-b-0"
                            >
                              <p className="font-medium text-sm text-foreground">{suggestion.name}</p>
                              <p className="text-xs text-muted-foreground">{suggestion.displayName}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLocationMap(!showLocationMap)}
                      className="text-sm text-primary hover:underline mt-2"
                    >
                      {showLocationMap ? "Hide Map" : "Show on Map"}
                    </button>
                    {showLocationMap && (profileData.latitude || profileData.longitude) && (
                      <div className="mt-4 rounded-lg overflow-hidden border border-gray-300">
                        <MapContainer
                          center={[profileData.latitude || 6.6271, profileData.longitude || -0.3440]}
                          zoom={13}
                          style={{ height: "300px", width: "100%" }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                          />
                          {(profileData.latitude || profileData.longitude) && (
                            <Marker position={[profileData.latitude || 6.6271, profileData.longitude || -0.3440]}>
                              <Popup>{profileData.location}</Popup>
                            </Marker>
                          )}
                          <LogLocationMarker />
                        </MapContainer>
                        <p className="text-xs text-muted-foreground p-2">Click on the map to select a location</p>
                      </div>
                    )}
                  </div>

                  {profileData.profileImage || profilePicturePreview ? (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Profile Picture</label>
                      <div className="flex items-center gap-4">
                        <img
                          src={profilePicturePreview || getFullImageUrl(profileData.profileImage) || profileData.profileImage}
                          alt="Profile"
                          className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                        />
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-muted-foreground">
                            {profilePicturePreview ? "Preview of new picture (use the remove link to cancel)" : "Your current profile picture"}
                          </p>
                          
                          <div className="flex gap-3">
                            <label className="relative cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePictureChange}
                                disabled={isUploadingProfilePicture}
                                className="hidden"
                              />
                              <span className="text-xs text-primary hover:underline">
                                {isUploadingProfilePicture ? "Uploading..." : "Upload a different picture"}
                              </span>
                            </label>
                            {(profileData.profileImage || profilePicturePreview) && (
                              <button
                                onClick={handleRemoveProfilePicture}
                                disabled={isUploadingProfilePicture}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">JPG, PNG or WEBP (max 5MB)</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Profile Picture</label>
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-xs text-muted-foreground">No profile picture yet. Upload one to personalize your profile.</p>
                        <label className="relative cursor-pointer inline-block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                            disabled={isUploadingProfilePicture}
                            className="hidden"
                          />
                          <span className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                            {isUploadingProfilePicture ? "Uploading..." : "Upload Picture"}
                          </span>
                        </label>
                        <p className="text-xs text-muted-foreground">JPG, PNG or WEBP (max 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}

            {/* Security Section */}
            {currentSection === "security" && (
              <div className="card-elevated p-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Settings
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                    <input
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                      className="input-base w-full"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                    <input
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                      className="input-base w-full"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                      className="input-base w-full"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleChangePassword}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Update Password
                </Button>
              </div>
            )}

            {/* Services Needed Section - Family Only */}
            {currentSection === "services" && userType === "family" && (
              <div className="card-elevated p-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Services Needed
                </h2>

                <p className="text-sm text-muted-foreground">
                  Select all services you need. This will help us match you with the right caregivers.
                </p>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Select Services (Multiple Selections Allowed)</label>
                  <div className="grid grid-cols-1 gap-2">
                    {availableServices.map((service) => (
                      <label key={service} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={profileData.neededServices.includes(service)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProfileData({
                                ...profileData,
                                neededServices: [...profileData.neededServices, service]
                              });
                            } else {
                              setProfileData({
                                ...profileData,
                                neededServices: profileData.neededServices.filter(s => s !== service)
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

                <p className="text-xs text-muted-foreground">
                  {profileData.neededServices.length} service{profileData.neededServices.length !== 1 ? 's' : ''} selected
                </p>

                <Button 
                  onClick={handleSaveNeededServices} 
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Services"}
                </Button>
              </div>
            )}

            {/* Preferences Section */}
            {currentSection === "preferences" && (
              <div className="card-elevated p-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Preferences
                </h2>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-border bg-secondary/30">
                    <h3 className="font-medium text-foreground mb-2">Account Status</h3>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Your account is active and verified</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
                    <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Logout</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-200 mb-3">
                      Sign out of your account on this device
                    </p>
                    <Button variant="outline" onClick={handleLogout} className="gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <h3 className="font-medium text-destructive mb-2">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete your account and all associated data. Admin approval required.
                    </p>
                    <Button variant="destructive" onClick={() => setShowDeleteModal(true)} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Request Account Deletion
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Rates Section - Caregiver Only */}
            {currentSection === "rates" && userType === "caregiver" && (
              <div className="card-elevated p-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Rates & Services
                </h2>

                <p className="text-sm text-muted-foreground">
                  Set your service rates and qualifications. These will be visible to families looking for caregivers.
                </p>

                <div className="space-y-4">
                  {/* Services Provided */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Services Provided</label>
                    <p className="text-sm text-muted-foreground mb-3">Select all services you can provide (multiple selections allowed)</p>
                    <div className="grid grid-cols-1 gap-2">
                      {availableServices.map((service) => (
                        <label key={service} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={ratesData.providedServices.includes(service)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRatesData({
                                  ...ratesData,
                                  providedServices: [...ratesData.providedServices, service]
                                });
                              } else {
                                setRatesData({
                                  ...ratesData,
                                  providedServices: ratesData.providedServices.filter(s => s !== service)
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

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Professional Bio</label>
                    <textarea
                      value={ratesData.bio}
                      onChange={(e) => setRatesData({ ...ratesData, bio: e.target.value })}
                      className="input-base w-full min-h-24 resize-none"
                      placeholder="Tell families about your experience, skills, and approach to care..."
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{ratesData.bio.length}/500 characters</p>
                  </div>

                  {/* Rates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Daily Rate</label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">GH₵</span>
                        <input
                          type="number"
                          value={ratesData.dailyRate}
                          onChange={(e) => setRatesData({ ...ratesData, dailyRate: parseFloat(e.target.value) || 0 })}
                          className="input-base w-full"
                          placeholder="0.00"
                          min="0"
                          step="0.50"
                        />
                        <span className="text-muted-foreground text-sm">/day</span>
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Certifications</label>
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
                        placeholder="Add certification (e.g., CPR, First Aid)"
                      />
                      <Button
                        onClick={handleAddCertification}
                        className="px-4"
                        type="button"
                      >
                        Add
                      </Button>
                    </div>

                    {ratesData.certifications.length > 0 && (
                      <div className="space-y-2">
                        {ratesData.certifications.map((cert, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg border border-border"
                          >
                            <span className="text-sm text-foreground">{cert}</span>
                            <button
                              onClick={() => handleRemoveCertification(index)}
                              className="text-destructive hover:text-destructive/80 transition-colors"
                              type="button"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveRates}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Rates"}
                  </Button>
                  <p className="text-xs text-muted-foreground flex items-center">
                    Your rates are visible to families searching for caregivers
                  </p>
                </div>
              </div>
            )}

            {/* Availability Section - Caregiver Only */}
            {currentSection === "availability" && userType === "caregiver" && (
              <div className="card-elevated p-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Availability
                </h2>

                <p className="text-sm text-muted-foreground">
                  Select the days you're available to provide care. Families will use this to find times that work for both of you.
                </p>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Days Available</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.keys(availabilityData).map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={availabilityData[day as keyof typeof availabilityData]}
                          onChange={(e) => {
                            setAvailabilityData({
                              ...availabilityData,
                              [day]: e.target.checked
                            });
                          }}
                          className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    <strong>Tip:</strong> Make sure your availability matches your schedule. Families will see these days when browsing your profile.
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveAvailability}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Availability"}
                  </Button>
                  <p className="text-xs text-muted-foreground flex items-center">
                    Your availability helps families find suitable times to book
                  </p>
                </div>
              </div>
            )}

            {/* Payment Section - Caregiver Only */}
            {currentSection === "payment" && userType === "caregiver" && (
              <div className="card-elevated p-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Information
                </h2>

                <p className="text-sm text-muted-foreground">
                  Provide your payment details so families can pay you after services. This information is securely stored and only visible to families during the payment process.
                </p>

                <div className="space-y-4">
                  {/* Mobile Money */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Mobile Money Number</label>
                      <input
                        type="tel"
                        value={paymentData.mobileMoneyNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, mobileMoneyNumber: e.target.value })}
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
                        value={paymentData.mobileMoneyName}
                        onChange={(e) => setPaymentData({ ...paymentData, mobileMoneyName: e.target.value })}
                        className="input-base w-full"
                        placeholder="Account holder name"
                      />
                    </div>
                  </div>

                  {/* Bank Account */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Bank Account Number</label>
                      <input
                        type="text"
                        value={paymentData.accountNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value })}
                        className="input-base w-full"
                        placeholder="Bank account number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Bank Account Name</label>
                      <input
                        type="text"
                        value={paymentData.accountName}
                        onChange={(e) => setPaymentData({ ...paymentData, accountName: e.target.value })}
                        className="input-base w-full"
                        placeholder="Account holder name"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {/* Security note removed as requested */}
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSavePayment}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Payment Info"}
                  </Button>
                  <p className="text-xs text-muted-foreground flex items-center">
                    Your payment details help families complete bookings
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl border border-border w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Delete Account
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-2">Warning</p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. Your account and all associated data will be permanently deleted after admin approval.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type "DELETE" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="input-base"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Your deletion request will be sent to admins. You will receive an email notification once your account has been deleted.
              </p>
            </div>

            <div className="border-t border-border p-6 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRequestDeleteAccount}
                disabled={deleteConfirmation !== "DELETE"}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Request Deletion
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Settings;
