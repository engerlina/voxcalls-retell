"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore, useTenantUsersStore, TenantUser, TenantInvitation } from "@/lib/store";
import { cn } from "@/lib/utils";

// Drawer component for editing
function Drawer({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6" style={{ height: "calc(100% - 65px)" }}>
          {children}
        </div>
      </div>
    </>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    users,
    invitations,
    isLoading,
    isInviting,
    fetchUsers,
    updateUser,
    changeUserRole,
    deleteUser,
    fetchInvitations,
    inviteUser,
    regenerateInvitation,
    deleteInvitation,
  } = useTenantUsersStore();

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Load data
  useEffect(() => {
    if (user?.role === "admin" || user?.role === "super_admin") {
      fetchUsers();
      fetchInvitations();
    }
  }, [user, fetchUsers, fetchInvitations]);

  if (user?.role !== "admin" && user?.role !== "super_admin") {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Team Members</h1>
        <p className="text-muted-foreground">
          Manage users and invitations for your organization.
        </p>
      </div>

      {/* Content */}
      <UsersSection
        users={users}
        invitations={invitations}
        isLoading={isLoading}
        isInviting={isInviting}
        currentUserId={user?.id || ""}
        onUpdateUser={updateUser}
        onChangeRole={changeUserRole}
        onDeleteUser={deleteUser}
        onInviteUser={inviteUser}
        onRegenerateInvitation={regenerateInvitation}
        onDeleteInvitation={deleteInvitation}
      />
    </div>
  );
}

// Users Section
function UsersSection({
  users,
  invitations,
  isLoading,
  isInviting,
  currentUserId,
  onUpdateUser,
  onChangeRole,
  onDeleteUser,
  onInviteUser,
  onRegenerateInvitation,
  onDeleteInvitation,
}: {
  users: TenantUser[];
  invitations: TenantInvitation[];
  isLoading: boolean;
  isInviting: boolean;
  currentUserId: string;
  onUpdateUser: (id: string, data: { name?: string }) => Promise<TenantUser>;
  onChangeRole: (id: string, role: string) => Promise<TenantUser>;
  onDeleteUser: (id: string) => Promise<void>;
  onInviteUser: (email: string, role?: string) => Promise<TenantInvitation>;
  onRegenerateInvitation: (id: string) => Promise<TenantInvitation>;
  onDeleteInvitation: (id: string) => Promise<void>;
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null);
  const [regeneratedLink, setRegeneratedLink] = useState<{ id: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const openEditDrawer = (user: TenantUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.full_name || user.name,
      role: user.role,
    });
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError(null);
    setEditLoading(true);
    try {
      // Update name if changed
      if (editForm.name !== (editingUser.full_name || editingUser.name)) {
        await onUpdateUser(editingUser.id, { name: editForm.name });
      }
      // Update role if changed
      if (editForm.role !== editingUser.role) {
        await onChangeRole(editingUser.id, editForm.role);
      }
      setEditingUser(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setEditError(error.response?.data?.detail || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from your organization?")) {
      return;
    }
    setDeleteLoading(userId);
    try {
      await onDeleteUser(userId);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-muted-foreground">
            {users.length} team member{users.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-white">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div className="col-span-3">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {users.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No team members yet. Invite someone to get started.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 last:border-0"
            >
              <div className="col-span-3 font-medium truncate">
                {user.full_name || user.name}
                {user.id === currentUserId && (
                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                )}
              </div>
              <div className="col-span-4 text-muted-foreground truncate">{user.email}</div>
              <div className="col-span-2">
                <RoleBadge role={user.role} />
              </div>
              <div className="col-span-1">
                <StatusBadge status={user.status} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDrawer(user)}
                  disabled={user.id === currentUserId}
                >
                  Edit
                </Button>
                {user.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(user.id)}
                    disabled={deleteLoading === user.id}
                  >
                    {deleteLoading === user.id ? "..." : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Pending Invitations ({invitations.length})</h3>
          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-3">Expires</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 last:border-0"
              >
                <div className="col-span-4 truncate text-sm">{invitation.email}</div>
                <div className="col-span-2">
                  <RoleBadge role={invitation.role as "admin" | "user"} />
                </div>
                <div className="col-span-3 text-sm text-muted-foreground">
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  {regeneratedLink?.id === invitation.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={regeneratedLink.link}
                        readOnly
                        className="w-28 rounded border bg-muted px-2 py-1 text-xs font-mono truncate"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(regeneratedLink.link);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRegeneratedLink(null)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setRegeneratingId(invitation.id);
                          try {
                            const updated = await onRegenerateInvitation(invitation.id);
                            setRegeneratedLink({ id: invitation.id, link: updated.magic_link });
                          } finally {
                            setRegeneratingId(null);
                          }
                        }}
                        disabled={regeneratingId === invitation.id}
                      >
                        {regeneratingId === invitation.id ? "..." : "Copy Link"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          setDeletingInvitationId(invitation.id);
                          try {
                            await onDeleteInvitation(invitation.id);
                          } finally {
                            setDeletingInvitationId(null);
                          }
                        }}
                        disabled={deletingInvitationId === invitation.id}
                      >
                        {deletingInvitationId === invitation.id ? "..." : "Cancel"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          isInviting={isInviting}
          onInvite={onInviteUser}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Edit User Drawer */}
      <Drawer
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit Team Member"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={editingUser?.email || ""}
              disabled
              className="w-full rounded-md border bg-muted px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Admins can manage users and settings.
            </p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={editLoading} className="flex-1">
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// Invite User Modal
function InviteUserModal({
  isInviting,
  onInvite,
  onClose,
}: {
  isInviting: boolean;
  onInvite: (email: string, role?: string) => Promise<TenantInvitation>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    role: "user",
  });
  const [error, setError] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const invitation = await onInvite(form.email, form.role);
      setMagicLink(invitation.magic_link);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to create invitation");
    }
  };

  const handleCopy = async () => {
    if (magicLink) {
      await navigator.clipboard.writeText(magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If we have a magic link, show success view
  if (magicLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Invitation Created</CardTitle>
            <CardDescription>
              Share this link with the user to invite them to your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              Invitation created for {form.email}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Invitation Link (expires in 7 days)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={magicLink}
                  readOnly
                  className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono"
                />
                <Button type="button" onClick={handleCopy}>
                  {copied ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Send this link to the user so they can create their account.
              </p>
            </div>
          </CardContent>
          <div className="flex justify-end border-t p-4">
            <Button onClick={onClose}>Done</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Create an invitation link for a new team member.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="colleague@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Admins can invite users and manage team settings.
              </p>
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? "Creating..." : "Create Invitation"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Utility Components
function RoleBadge({ role }: { role: "admin" | "user" }) {
  const styles = {
    admin: "bg-purple-100 text-purple-700",
    user: "bg-gray-100 text-gray-700",
  };

  const labels = {
    admin: "Admin",
    user: "User",
  };

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium", styles[role])}>
      {labels[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium capitalize", styles[status] || "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
