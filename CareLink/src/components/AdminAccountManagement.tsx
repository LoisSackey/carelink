import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Search,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  userType: string;
  isActive: boolean;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  serviceType?: string;
  dailyRate?: number;
  bio?: string;
}

interface AdminAccountManagementProps {
  users: User[];
  onRefresh: () => void;
}

export const AdminAccountManagement = ({
  users,
  onRefresh,
}: AdminAccountManagementProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      ...(user.userType === "caregiver" && {
        serviceType: user.serviceType,
        dailyRate: user.dailyRate,
      }),
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;

    try {
      await userAPI.editUserAccount(editingUser._id, editFormData);
      toast({
        title: "Success",
        description: `Account for ${editFormData.name} updated successfully`,
      });
      setEditDialogOpen(false);
      setEditingUser(null);
      onRefresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update account",
        variant: "destructive",
      });
    }
  };

  const handleDeactivateClick = (user: User) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  const handleActivateClick = (user: User) => {
    setSelectedUser(user);
    setActivateDialogOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!selectedUser) return;

    try {
      await userAPI.deactivateUser(selectedUser._id);
      toast({
        title: "Success",
        description: `Account for ${selectedUser.name} has been deactivated`,
      });
      setDeactivateDialogOpen(false);
      setSelectedUser(null);
      onRefresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to deactivate account",
        variant: "destructive",
      });
    }
  };

  const confirmActivate = async () => {
    if (!selectedUser) return;

    try {
      await userAPI.activateUser(selectedUser._id);
      toast({
        title: "Success",
        description: `Account for ${selectedUser.name} has been activated`,
      });
      setActivateDialogOpen(false);
      setSelectedUser(null);
      onRefresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to activate account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user._id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className="capitalize text-sm text-gray-600">
                    {user.userType}
                  </span>
                </TableCell>
                <TableCell>{user.phone || "N/A"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditClick(user)}
                      title="Edit account"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {user.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivateClick(user)}
                        title="Deactivate account"
                        className="text-red-600 hover:text-red-700"
                      >
                        <PowerOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateClick(user)}
                        title="Activate account"
                        className="text-green-600 hover:text-green-700"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found matching your search
        </div>
      )}

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account: {editingUser?.name}</DialogTitle>
            <DialogDescription>
              Update account details for this user
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editFormData.name || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editFormData.phone || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="10 digits, e.g. 0241234567"
                    pattern="\\d{10}"
                    title="Please enter exactly 10 digits"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Address</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={editFormData.address || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editFormData.city || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={editFormData.state || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        state: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={editFormData.zipCode || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        zipCode: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Caregiver-specific fields */}
            {editingUser?.userType === "caregiver" && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Caregiver Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select
                    value={editFormData.serviceType || ""}
                    onValueChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        serviceType: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eldercare">Eldercare</SelectItem>
                      <SelectItem value="childcare">Childcare</SelectItem>
                      <SelectItem value="physical-therapy">
                        Physical Therapy
                      </SelectItem>
                      <SelectItem value="nursing">Nursing</SelectItem>
                      <SelectItem value="companionship">Companionship</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dailyRate">Daily Rate ($)</Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.dailyRate || 0}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          dailyRate: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                    value={editFormData.bio || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bio: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the account for{" "}
              <strong>{selectedUser?.name}</strong>? They will not be able to
              log in or access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Confirmation Dialog */}
      <AlertDialog
        open={activateDialogOpen}
        onOpenChange={setActivateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate the account for{" "}
              <strong>{selectedUser?.name}</strong>? They will be able to log
              in and access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActivate}
              className="bg-green-600 hover:bg-green-700"
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
