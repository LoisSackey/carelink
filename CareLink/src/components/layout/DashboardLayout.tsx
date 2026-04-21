// Import React types and hooks for component structure and state management
import { ReactNode, useState, useEffect } from "react";
// Import navigation and routing utilities from React Router
import { Link, useLocation, useNavigate } from "react-router-dom";
// Import icon components for UI elements (logo, menu, logout, user, notifications)
import { Heart, Menu, X, LogOut, User, Bell, Trash2 } from "lucide-react";
// Import Button UI component for clickable actions
import { Button } from "@/components/ui/button";
// Import toast for notifications
import { useToast } from "@/hooks/use-toast";
// Import notifications hook
import { useNotifications } from "@/hooks/use-notifications";
// Import userAPI for fetching user data
import { userAPI } from "@/lib/api";
// Import image URL helper
import { getFullImageUrl } from "@/utils/imageUrl";

// Type definition for component props specifying structure of children, sidebar items, and user type
interface DashboardLayoutProps {
  children: ReactNode;                                              // Page content rendered inside dashboard
  sidebarItems: { icon: ReactNode; label: string; path: string; action?: () => void }[]; // Navigation menu items with icons
  userType: "family" | "caregiver" | "admin";                       // Type of user viewing dashboard
}

// DashboardLayout component - Shared layout wrapper for all dashboard pages with sidebar and top bar
const DashboardLayout = ({ children, sidebarItems, userType }: DashboardLayoutProps) => {
  // isSidebarOpen state - Controls visibility of sidebar on mobile devices (toggles with menu button)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // notification dropdown state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  // profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // profile picture state
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  // location hook - Provides current page location for highlighting active sidebar links
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  // Get notifications
  const { notifications, unreadCount, dismissNotification, markAsRead } = useNotifications();

  // Load user profile picture on component mount
  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (userId) {
          const user = await userAPI.getProfile(userId);
          if (user.profilePicture) {
            // Use helper function to convert relative URL to full URL
            const pictureUrl = getFullImageUrl(user.profilePicture);
            setProfilePicture(pictureUrl);
          }
        }
      } catch (error) {
        console.error("Error loading profile picture:", error);
        // Silently fail, don't show toast for this
      }
    };
    loadProfilePicture();

    // listen for updates when profile picture is changed elsewhere in the app
    const handler = (e: any) => {
      const url = e.detail;
      // e.detail may be a relative path or full url; convert if needed
      if (url) {
        setProfilePicture(getFullImageUrl(url));
      } else {
        setProfilePicture('');
      }
    };
    window.addEventListener('profilePictureChanged', handler);
    return () => window.removeEventListener('profilePictureChanged', handler);
  }, []);

  // userLabels object - Maps user type to appropriate dashboard title displayed in header
  const userLabels = {
    family: "Client Dashboard",
    caregiver: "Caregiver Dashboard",
    admin: "Admin Dashboard",
  };

  const handleLogout = () => {
    // Clear all session data
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userType");
    
    toast({
      title: "Signed out",
      description: "You have been logged out successfully.",
    });
    
    // Redirect to login
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top Bar */}
      <header className="fixed top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur w-full">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-controls="dashboard-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label={isSidebarOpen ? "Close sidebar menu" : "Open sidebar menu"}
            >
              {isSidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
            <Link to="/" className="flex items-center gap-2" aria-label="CareLink - Home">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
                <Heart className="h-4 w-4" />
              </div>
              <span className="font-bold text-foreground hidden sm:inline">CareLink</span>
            </Link>
            <span className="text-sm text-muted-foreground hidden md:inline" aria-label={`Current page: ${userLabels[userType]}`}>
              / {userLabels[userType]}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button 
                className="relative p-2 rounded-lg hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  setIsProfileOpen(false);
                }}
                aria-label="Notifications"
                aria-expanded={isNotificationOpen}
                aria-haspopup="true"
              >
                <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-border">
                        {notifications.slice(0, 6).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 hover:bg-secondary/50 transition-colors text-left cursor-pointer ${
                              notification.unread ? "bg-primary/5" : ""
                            }`}
                            onClick={() => {
                              // Mark as read
                              markAsRead(notification.id);
                              // Close dropdown
                              setIsNotificationOpen(false);
                              // Navigate if link exists
                              if (notification.link) {
                                window.location.hash = notification.link;
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${notification.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent click
                                  dismissNotification(notification.id);
                                }}
                                className="p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                                aria-label="Dismiss notification"
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 6 && (
                    <div className="p-3 border-t border-border text-center">
                      <button
                        onClick={() => setIsNotificationOpen(false)}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        View All Notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationOpen(false);
                }}
                className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary transition-colors overflow-hidden"
                aria-label="Profile menu"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={() => setProfilePicture('')}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Your Profile</p>
                    <p className="text-xs text-muted-foreground">User type: {userType}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigate("/settings");
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      Settings & Profile
                    </button>
                  </div>
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          id="dashboard-sidebar"
          className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card border-r border-border transition-transform duration-200 lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ top: "64px", height: "calc(100vh - 64px)", maxHeight: "calc(100vh - 64px)" }}
          role="navigation"
          aria-label="Dashboard Navigation"
        >
          <div className="flex flex-col h-full p-4 overflow-y-auto">
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {sidebarItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    item.action?.();
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary whitespace-nowrap ${
                    location.hash === item.path || location.pathname === item.path
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {item.icon}
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 focus:ring-2 focus:ring-primary text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
            style={{ top: "64px" }}
            onClick={() => setIsSidebarOpen(false)}
            role="presentation"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 lg:ml-64 min-h-[calc(100vh-64px)] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
