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
import { AdminAccountManagement } from "@/components/AdminAccountManagement";
import AdminCredentialReview from "@/components/AdminCredentialReview";
import AdminCredentialBrowser from "@/components/AdminCredentialBrowser";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard,
  Users,
  AlertTriangle,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
  LogOut,
  Mail,
  Trash2,
  CheckCheck,
  Plus,
  Briefcase,
  FileText,
} from "lucide-react";
import { userAPI, contactAPI, notificationAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adminName, setAdminName] = useState("Admin");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingCaregivers, setPendingCaregivers] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [pendingDeletionRequests, setPendingDeletionRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "caregivers" | "messages" | "account-management" | "credential-review" | "credential-browser" | "deletion-requests">("overview");

  // ensure selecting a tab scrolls page back to top so content is visible
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  // if the URL hash changes (deep link from settings or sidebar) update tab
  useEffect(() => {
    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (
        [
          "overview",
          "users",
          "caregivers",
          "messages",
          "account-management",
          "credential-review",
          "credential-browser",
          "deletion-requests",
        ].includes(hash)
      ) {
        setActiveTab(hash as any);
      }
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", password: "", userType: "family" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const sidebarItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", path: "#overview", action: () => { setActiveTab("overview"); window.location.hash = "#overview"; } },
    { icon: <Users className="h-5 w-5" />, label: "All Users", path: "#users", action: () => { setActiveTab("users"); window.location.hash = "#users"; } },
    { icon: <Briefcase className="h-5 w-5" />, label: "Pending Caregivers", path: "#caregivers", action: () => { setActiveTab("caregivers"); window.location.hash = "#caregivers"; } },
    { icon: <FileText className="h-5 w-5" />, label: "Bookings", path: "/admin-bookings", action: () => navigate("/admin-bookings") },
    { icon: <Trash2 className="h-5 w-5" />, label: "Deletion Requests", path: "#deletion-requests", action: () => { setActiveTab("deletion-requests"); window.location.hash = "#deletion-requests"; } },
    { icon: <FileText className="h-5 w-5" />, label: "Credential Review", path: "#credential-review", action: () => { setActiveTab("credential-review"); window.location.hash = "#credential-review"; } },
    { icon: <FileText className="h-5 w-5" />, label: "Credential Browser", path: "#credential-browser", action: () => { setActiveTab("credential-browser"); window.location.hash = "#credential-browser"; } },
    { icon: <Mail className="h-5 w-5" />, label: "Messages", path: "#messages", action: () => { setActiveTab("messages"); window.location.hash = "#messages"; } },
    { icon: <Settings className="h-5 w-5" />, label: "Account Management", path: "#account-management", action: () => { setActiveTab("account-management"); window.location.hash = "#account-management"; } },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", path: "/settings", action: () => navigate("/settings") },
  ];

  useEffect(() => {
    loadAdminData();
  }, []);

  // Mark notifications as read when viewing specific tabs
  useEffect(() => {
    const markNotificationsAsRead = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        // Get all notifications for this admin
        const notifications = await notificationAPI.getByUserId(userId);
        
        // Filter notifications based on the current tab and mark them as read
        const notificationsToMark = notifications.filter((n: any) => {
          if (activeTab === 'caregivers' && n.link === '/admin-dashboard#caregivers') {
            return true;
          }
          if (activeTab === 'messages' && n.link === '/admin-dashboard#messages') {
            return true;
          }
          if (activeTab === 'deletion-requests' && n.link === '/admin-dashboard#deletion-requests') {
            return true;
          }
          if (activeTab === 'credential-review' && n.link === '/admin-dashboard#credential-review') {
            return true;
          }
          return false;
        });

        // Mark each notification as read
        for (const notification of notificationsToMark) {
          if (!notification.read) {
            await notificationAPI.markAsRead(notification._id);
          }
        }
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    if (activeTab === 'caregivers' || activeTab === 'messages' || activeTab === 'deletion-requests' || activeTab === 'credential-review') {
      markNotificationsAsRead();
    }
  }, [activeTab]);

  const loadAdminData = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const userType = localStorage.getItem("userType");
      
      if (!userId || userType !== "admin") {
        navigate("/admin-login");
        return;
      }

      const adminData = await userAPI.getProfile(userId);
      setAdminName(adminData.name || "Admin");
      
      const users = await userAPI.getAllUsers();
      setAllUsers(Array.isArray(users) ? users : []);
      
      // Fetch pending deletion requests from the users data
      const deletionRequests = Array.isArray(users) ? users.filter((u: any) => u.deletionStatus === "pending") : [];
      setPendingDeletionRequests(deletionRequests);
      
      const pending = await userAPI.getPendingCaregivers();
      setPendingCaregivers(Array.isArray(pending) ? pending : []);
      
      const messages = await contactAPI.getAll();
      const sortedMessages = Array.isArray(messages) 
        ? messages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)
        : [];
      setContactMessages(sortedMessages);
    } catch (err: any) {
      console.error("Failed to load admin data:", err);
      
      // Check if it's an unauthorized error
      if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userType");
        navigate("/admin-login");
        toast({
          title: "Session expired",
          description: "Please log in again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: err.message || "Failed to load admin data",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await contactAPI.delete(id);
      setContactMessages(contactMessages.filter((msg) => msg._id !== id));
      toast({ title: "Success", description: "Contact message deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userAPI.deleteUser(userToDelete.id);
      setAllUsers(allUsers.filter((user) => user._id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "Success",
        description: `User ${userToDelete.name} has been deleted successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsRead = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "new" ? "read" : "new";
      await contactAPI.update(id, { status: newStatus });
      setContactMessages(
        contactMessages.map((msg) =>
          msg._id === id ? { ...msg, status: newStatus } : msg
        )
      );
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };


  // ensure new tab content is visible by scrolling to top when activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleApproveCaregivver = async (userId: string) => {
    try {
      await userAPI.approveCaregivver(userId);
      setPendingCaregivers(pendingCaregivers.filter((user) => user._id !== userId));
      const updatedUsers = allUsers.map((user) =>
        user._id === userId ? { ...user, approved: true } : user
      );
      setAllUsers(updatedUsers);
      toast({ title: "Success", description: "Caregiver approved!" });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    }
  };

  const handleRejectCaregivver = async (userId: string, caregiverName: string) => {
    try {
      await userAPI.rejectCaregivver(userId);
      setPendingCaregivers(pendingCaregivers.filter((user) => user._id !== userId));
      setAllUsers(allUsers.filter((user) => user._id !== userId));
      toast({ title: "Success", description: `${caregiverName} has been rejected and removed` });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to reject caregiver", variant: "destructive" });
    }
  };

  const handleApproveDeletion = async (userId: string, userName: string) => {
    try {
      await userAPI.approveDeleteAccount(userId);
      setPendingDeletionRequests(pendingDeletionRequests.filter((user) => user._id !== userId));
      setAllUsers(allUsers.filter((user) => user._id !== userId));
      toast({ title: "Success", description: `Account deletion for ${userName} has been approved. User permanently deleted.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to approve deletion", variant: "destructive" });
    }
  };

  const handleRejectDeletion = async (userId: string, userName: string) => {
    try {
      await userAPI.rejectDeleteAccount(userId);
      setPendingDeletionRequests(pendingDeletionRequests.filter((user) => user._id !== userId));
      const updatedUsers = allUsers.map((user) =>
        user._id === userId ? { ...user, deletionStatus: "rejected" } : user
      );
      setAllUsers(updatedUsers);
      toast({ title: "Success", description: `Account deletion request for ${userName} has been rejected.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reject deletion", variant: "destructive" });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newUserForm.userType === "admin") {
        await userAPI.addAdmin({
          name: newUserForm.name,
          email: newUserForm.email,
          password: newUserForm.password,
        });
      } else {
        await userAPI.addUser({
          name: newUserForm.name,
          email: newUserForm.email,
          password: newUserForm.password,
          userType: newUserForm.userType,
        });
      }
      
      toast({ title: "Success", description: "User created successfully!" });
      setShowAddUserModal(false);
      setNewUserForm({ name: "", email: "", password: "", userType: "family" });
      loadAdminData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create user", variant: "destructive" });
    }
  };



  const stats = [
    { label: "Total Users", value: allUsers.length.toString(), icon: <Users className="h-5 w-5" /> },
    { label: "Active Caregivers", value: allUsers.filter((u) => u.userType === "caregiver" && u.approved).length.toString(), icon: <CheckCircle2 className="h-5 w-5" /> },
    { label: "Pending Approvals", value: pendingCaregivers.length.toString(), icon: <Clock className="h-5 w-5" /> },
    { label: "Deletion Requests", value: pendingDeletionRequests.length.toString(), icon: <AlertTriangle className="h-5 w-5" /> },
  ];

  return (
    <DashboardLayout sidebarItems={sidebarItems} userType="admin">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, {adminName}</h1>
            <p className="text-muted-foreground">Platform overview and management</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddUserModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="card-elevated p-5 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => {
              if (index === 0) setActiveTab("users");
              if (index === 1) setActiveTab("users");
              if (index === 2) setActiveTab("caregivers");
              if (index === 3) navigate("/admin-bookings");
            }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-primary">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4 border-b border-border">
          {["overview", "users", "account-management", "caregivers", "deletion-requests", "credential-review", "credential-browser"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "overview" | "users" | "caregivers" | "messages" | "account-management" | "credential-review" | "credential-browser" | "deletion-requests")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "overview" && "Overview"}
              {tab === "users" && "All Users"}
              {tab === "account-management" && "Account Management"}
              {tab === "caregivers" && `Pending Caregivers (${pendingCaregivers.length})`}
              {tab === "deletion-requests" && `Deletion Requests (${pendingDeletionRequests.length})`}
              {tab === "credential-review" && "Credential Review"}
              {tab === "credential-browser" && "Credential Browser"}
              {tab === "messages" && "Messages"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Platform Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Family Users</span>
                  <span className="font-bold text-foreground">{allUsers.filter((u) => u.userType === "family").length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Total Caregivers</span>
                  <span className="font-bold text-foreground">{allUsers.filter((u) => u.userType === "caregiver").length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Admin Users</span>
                  <span className="font-bold text-foreground">{allUsers.filter((u) => u.userType === "admin").length}</span>
                </div>
              </div>
            </div>

            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Action Required
              </h2>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="text-sm font-medium text-foreground">{pendingCaregivers.length} caregivers pending approval</p>
                  <p className="text-xs text-muted-foreground mt-1">Review and approve new applications</p>
                </div>
                {pendingDeletionRequests.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-foreground">{pendingDeletionRequests.length} account deletion request(s)</p>
                    <p className="text-xs text-muted-foreground mt-1">Review and approve/reject deletion requests</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10" onClick={() => setActiveTab("credential-review") }>
                  <p className="text-sm font-medium text-foreground">Pending credential verification</p>
                  <p className="text-xs text-muted-foreground mt-1">Review caregiver documents in Credential Review tab</p>
                </div>
                <div className="p-3 rounded-lg bg-info/5 border border-info/20">
                  <p className="text-sm font-medium text-foreground">{contactMessages.filter((m) => m.status === "new").length} new messages</p>
                  <p className="text-xs text-muted-foreground mt-1">Check contact submissions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="card-elevated overflow-x-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">All Users ({allUsers.length})</h2>
            </div>
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.userType === "admin" 
                          ? "bg-destructive/10 text-destructive"
                          : user.userType === "caregiver"
                          ? "bg-accent/10 text-accent"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.userType === "caregiver" && !user.approved
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      }`}>
                        {user.userType === "caregiver" && !user.approved ? "Pending" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
                        aria-label={`Delete ${user.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "caregivers" && (
          <div className="card-elevated">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Caregiver Approvals
              </h2>
            </div>
            {pendingCaregivers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No pending approvals</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingCaregivers.map((caregiver) => (
                  <div key={caregiver._id} className="p-6 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{caregiver.name}</h3>
                      <p className="text-sm text-muted-foreground">{caregiver.email}</p>
                      {caregiver.licenseNumber && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">License:</span> {caregiver.licenseNumber}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied on {new Date(caregiver.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleApproveCaregivver(caregiver._id)}
                        size="sm"
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button 
                        onClick={() => handleRejectCaregivver(caregiver._id, caregiver.name)}
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "deletion-requests" && (
          <div className="card-elevated">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Account Deletion Requests
              </h2>
            </div>
            {pendingDeletionRequests.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No pending deletion requests</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingDeletionRequests.map((request) => (
                  <div key={request._id} className="p-6 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{request.name}</h3>
                      <p className="text-sm text-muted-foreground">{request.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        User Type: {request.userType.charAt(0).toUpperCase() + request.userType.slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested on {new Date(request.deletionRequestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleApproveDeletion(request._id, request.name)}
                        size="sm"
                        className="gap-2 bg-destructive hover:bg-destructive/90"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button 
                        onClick={() => handleRejectDeletion(request._id, request.name)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="card-elevated overflow-x-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Messages
              </h2>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {contactMessages.length} messages
              </span>
            </div>
            {contactMessages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {contactMessages.map((message) => (
                  <div 
                    key={message._id} 
                    className={`p-4 transition-colors ${message.status === "new" ? "bg-primary/5" : ""} min-w-0 max-w-full`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{message.name}</p>
                          {message.status === "new" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 break-words max-w-full">{message.email}</p>
                        <p className="font-medium text-foreground text-sm mb-1 break-words max-w-full">{message.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 break-words">{message.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(message._id, message.status)}>
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteContact(message._id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "account-management" && (
          <div className="card-elevated p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Account Management</h2>
              <p className="text-sm text-muted-foreground">Edit user account details and manage activation status</p>
            </div>
            <AdminAccountManagement users={allUsers} onRefresh={loadAdminData} />
          </div>
        )}

        {activeTab === "credential-review" && (
          <div className="card-elevated p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Credential Review</h2>
              <p className="text-sm text-muted-foreground">Review and verify pending caregiver credentials</p>
            </div>
            <AdminCredentialReview />
          </div>
        )}

        {activeTab === "credential-browser" && (
          <div className="card-elevated p-6 flex flex-col max-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Credential Browser</h2>
              <p className="text-sm text-muted-foreground">Browse, review, and download all caregiver credentials</p>
            </div>
            <AdminCredentialBrowser />
          </div>
        )}

        {showAddUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-foreground mb-4">Add New User</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <input type="text" value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} className="input-base" placeholder="Name" required />
                <input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} className="input-base" placeholder="Email" required />
                <input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} className="input-base" placeholder="Password" required />
                <select value={newUserForm.userType} onChange={(e) => setNewUserForm({ ...newUserForm, userType: e.target.value })} className="input-base">
                  <option value="family">Family</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Create</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddUserModal(false)} className="flex-1">Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-semibold text-foreground">{userToDelete?.name}</span>? 
                This action cannot be undone. All associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
