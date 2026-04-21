import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  User,
  Briefcase,
  Star,
  Calendar,
  Search,
  History,
  Mail,
  Phone,
  MapPin,
  Award,
  Settings as SettingsIcon,
  Edit2,
  Save,
  X,
  CreditCard,
  FileText,
  Trash2,
  Settings,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getFullImageUrl } from "@/utils/imageUrl";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userType, setUserType] = useState<"family" | "caregiver" | "admin" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    profileImage: "",
    createdAt: new Date().toISOString(),
    status: "active",
    // Caregiver specific
    title: "",
    bio: "",
    skills: [] as string[],
    certifications: [] as string[],
    rating: 0,
    completedJobs: 0,
    dailyRate: 0,
  });

  const [editData, setEditData] = useState(userData);

  // Get sidebar items based on user type
  const getSidebarItems = () => {
    if (userType === "family") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "/family-dashboard", action: () => navigate("/family-dashboard") },
        { icon: <Calendar className="h-5 w-5" />, label: "Bookings", path: "/family-dashboard", action: () => navigate("/family-dashboard") },
        { icon: <Search className="h-5 w-5" />, label: "Find Caregiver", path: "/find-caregiver", action: () => navigate("/find-caregiver") },
        { icon: <History className="h-5 w-5" />, label: "History", path: "/family-dashboard", action: () => navigate("/family-dashboard") },
        { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "/family-dashboard", action: () => navigate("/family-dashboard") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
      ];
    } else if (userType === "caregiver") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "/caregiver-dashboard", action: () => navigate("/caregiver-dashboard") },
        { icon: <Briefcase className="h-5 w-5" />, label: "Job Requests", path: "/caregiver-dashboard", action: () => navigate("/caregiver-dashboard") },
        { icon: <Calendar className="h-5 w-5" />, label: "Schedule", path: "/caregiver-dashboard", action: () => navigate("/caregiver-dashboard") },
        { icon: <Star className="h-5 w-5" />, label: "Reviews", path: "/caregiver-dashboard", action: () => navigate("/caregiver-dashboard") },
        { icon: <CreditCard className="h-5 w-5" />, label: "Payments", path: "/caregiver-dashboard", action: () => navigate("/caregiver-dashboard#payments") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
      ];
    } else if (userType === "admin") {
      return [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "/admin-dashboard", action: () => navigate("/admin-dashboard") },
        { icon: <Users className="h-5 w-5" />, label: "All Users", path: "/admin-dashboard", action: () => navigate("/admin-dashboard") },
        { icon: <Briefcase className="h-5 w-5" />, label: "Pending Caregivers", path: "/admin-dashboard", action: () => navigate("/admin-dashboard") },
        { icon: <FileText className="h-5 w-5" />, label: "Bookings", path: "/admin-bookings", action: () => navigate("/admin-bookings") },
        { icon: <Trash2 className="h-5 w-5" />, label: "Deletion Requests", path: "/admin-dashboard", action: () => navigate("/admin-dashboard") },
        { icon: <FileText className="h-5 w-5" />, label: "Credential Review", path: "/admin-dashboard", action: () => navigate("/admin-dashboard#credential-review") },
        { icon: <FileText className="h-5 w-5" />, label: "Credential Browser", path: "/admin-dashboard", action: () => navigate("/admin-dashboard#credential-browser") },
        { icon: <Mail className="h-5 w-5" />, label: "Messages", path: "/admin-dashboard", action: () => navigate("/admin-dashboard") },
        { icon: <Settings className="h-5 w-5" />, label: "Account Management", path: "/admin-dashboard", action: () => navigate("/admin-dashboard") },
        { icon: <SettingsIcon className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
      ];
    }
    return [];
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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
      const profile = await userAPI.getProfile(storedUserId);
      const pictureUrl = getFullImageUrl(profile.profilePicture) || profile.profilePicture || "";
      setUserData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        profileImage: pictureUrl,
        createdAt: profile.createdAt || new Date().toISOString(),
        status: profile.status || "active",
        title: profile.title || "",
        bio: profile.bio || "",
        skills: profile.skills || [],
        certifications: profile.certifications || [],
        rating: profile.rating || 0,
        completedJobs: profile.completedJobs || 0,
        dailyRate: profile.dailyRate || 0,
      });
      setEditData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        profileImage: pictureUrl,
        createdAt: profile.createdAt || new Date().toISOString(),
        status: profile.status || "active",
        title: profile.title || "",
        bio: profile.bio || "",
        skills: profile.skills || [],
        certifications: profile.certifications || [],
        rating: profile.rating || 0,
        completedJobs: profile.completedJobs || 0,
        dailyRate: profile.dailyRate || 0,
      });
    } catch (err: any) {
      console.error("Failed to load profile:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      await userAPI.updateProfile(userId, editData);
      setUserData(editData);
      setIsEditing(false);
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

  const handleRemoveProfilePicture = async () => {
    if (!userId) return;

    try {
      await userAPI.removeProfilePicture(userId);
      setUserData(prev => ({
        ...prev,
        profileImage: "",
      }));
      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove profile picture",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
          <p className="text-muted-foreground">View and manage your profile information</p>
        </div>

        {!isEditing ? (
          // View Mode
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="md:col-span-1">
              <div className="card-elevated p-6 text-center">
                {userData.profileImage && (
                  <div className="mb-4 flex justify-center relative">
                    <img
                      src={getFullImageUrl(userData.profileImage) || userData.profileImage}
                      alt={userData.name}
                      className="h-32 w-32 rounded-full object-cover border-4 border-primary/20"
                    />
                    <button
                      onClick={handleRemoveProfilePicture}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                      title="Remove profile picture"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <h2 className="text-xl font-bold text-foreground mb-1">{userData.name}</h2>
                {userType === "caregiver" && userData.title && (
                  <p className="text-sm text-muted-foreground mb-4">{userData.title}</p>
                )}
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" />
                    {userData.email}
                  </div>
                  {userData.phone && (
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-4 w-4" />
                      {userData.phone}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <Button onClick={() => setIsEditing(true)} className="w-full gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/settings")} className="w-full">
                    Go to Settings
                  </Button>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="card-elevated p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium text-foreground">{userData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{userData.email}</p>
                  </div>
                  {userData.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium text-foreground">{userData.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <p className="font-medium text-foreground capitalize">{userData.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Caregiver Specific Information */}
              {userType === "caregiver" && (
                <>
                  <div className="card-elevated p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Professional Information
                    </h3>
                    <div className="space-y-3">
                      {userData.title && (
                        <div>
                          <p className="text-sm text-muted-foreground">Title</p>
                          <p className="font-medium text-foreground">{userData.title}</p>
                        </div>
                      )}
                      {userData.bio && (
                        <div>
                          <p className="text-sm text-muted-foreground">Bio</p>
                          <p className="font-medium text-foreground">{userData.bio}</p>
                        </div>
                      )}
                      {userData.dailyRate > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Daily Rate</p>
                          <p className="font-medium text-foreground">GH₵{userData.dailyRate.toFixed(2)}/day</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-elevated p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Performance & Ratings
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Overall Rating</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <p className="text-lg font-bold text-foreground">{userData.rating.toFixed(1)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Jobs</p>
                        <p className="text-lg font-bold text-foreground mt-1">{userData.completedJobs}</p>
                      </div>
                    </div>
                  </div>

                  {userData.skills && userData.skills.length > 0 && (
                    <div className="card-elevated p-6">
                      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {userData.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Account Statistics */}
              <div className="card-elevated p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Account Type</p>
                    <p className="font-medium text-foreground capitalize">{userType} Account</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium text-foreground">
                      {new Date(userData.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Edit Mode
          <div className="card-elevated p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">Edit Profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="input-base w-full"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  disabled
                  className="input-base w-full opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="input-base w-full"
                  placeholder="10 digits, e.g. 0241234567"
                  pattern="\\d{10}"
                  title="Please enter exactly 10 digits"
                />
              </div>

              {userType === "caregiver" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Professional Title</label>
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      className="input-base w-full"
                      placeholder="e.g., Certified Nurse Assistant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      className="input-base w-full min-h-24 resize-none"
                      placeholder="Tell families about yourself and your experience..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="gap-2 flex-1"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
