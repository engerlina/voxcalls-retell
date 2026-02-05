"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore, useAdminStore, Tenant, AdminUser, Analytics, AdminInvitation, TwilioAvailableNumber, AvailableNumbersResult, PooledPhoneNumber } from "@/lib/store";
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

type TabType = "overview" | "tenants" | "users" | "phone-numbers";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    tenants,
    users,
    analytics,
    isLoading,
    fetchTenants,
    fetchAllUsers,
    fetchAnalytics,
    createTenant,
    updateTenant,
    suspendTenant,
    activateTenant,
    updateUser,
    createUserInvitation,
    // Invitation state and actions
    pendingInvitations,
    fetchPendingInvitations,
    regenerateInvitation,
    deleteInvitation,
    // Phone number state and actions
    pooledNumbers,
    availableNumbers,
    selectedCountry,
    isSearchingNumbers,
    isPurchasingNumber,
    fetchPooledNumbers,
    searchAvailableNumbers,
    purchaseNumber,
    deletePooledNumber,
    setSelectedCountry,
  } = useAdminStore();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Redirect non-super-admins
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Load data
  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchTenants();
      fetchAllUsers();
      fetchAnalytics();
      fetchPooledNumbers();
      fetchPendingInvitations();
    }
  }, [user, fetchTenants, fetchAllUsers, fetchAnalytics, fetchPooledNumbers, fetchPendingInvitations]);

  // Load filtered users and invitations when tenant selected
  useEffect(() => {
    if (selectedTenantId) {
      fetchAllUsers(selectedTenantId);
      fetchPendingInvitations(selectedTenantId);
    } else {
      fetchAllUsers();
      fetchPendingInvitations();
    }
  }, [selectedTenantId, fetchAllUsers, fetchPendingInvitations]);

  if (user?.role !== "super_admin") {
    return null;
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tenants", label: "Tenants" },
    { id: "users", label: "Users" },
    { id: "phone-numbers", label: "Phone Numbers" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage tenants, users, and platform settings.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab analytics={analytics} isLoading={isLoading} />
      )}
      {activeTab === "tenants" && (
        <TenantsTab
          tenants={tenants}
          isLoading={isLoading}
          onCreate={createTenant}
          onUpdate={updateTenant}
          onSuspend={suspendTenant}
          onActivate={activateTenant}
          onSelectTenant={(id) => {
            setSelectedTenantId(id);
            setActiveTab("users");
          }}
        />
      )}
      {activeTab === "users" && (
        <UsersTab
          users={users}
          tenants={tenants}
          isLoading={isLoading}
          selectedTenantId={selectedTenantId}
          onTenantFilter={setSelectedTenantId}
          onUpdateUser={updateUser}
          onInviteUser={createUserInvitation}
          pendingInvitations={pendingInvitations}
          onRegenerateInvitation={regenerateInvitation}
          onDeleteInvitation={deleteInvitation}
        />
      )}
      {activeTab === "phone-numbers" && (
        <PhoneNumbersTab
          pooledNumbers={pooledNumbers}
          availableNumbers={availableNumbers}
          selectedCountry={selectedCountry}
          isSearching={isSearchingNumbers}
          isPurchasing={isPurchasingNumber}
          tenants={tenants}
          onSearch={searchAvailableNumbers}
          onCountryChange={setSelectedCountry}
          onPurchase={purchaseNumber}
          onDelete={deletePooledNumber}
        />
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({
  analytics,
  isLoading,
}: {
  analytics: Analytics | null;
  isLoading: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Tenants"
        value={analytics?.tenants.total ?? 0}
        isLoading={isLoading}
        icon={<BuildingIcon className="h-4 w-4" />}
      />
      <StatCard
        title="Total Users"
        value={analytics?.users.total ?? 0}
        isLoading={isLoading}
        icon={<UsersIcon className="h-4 w-4" />}
      />
      <StatCard
        title="Total Agents"
        value={analytics?.agents.total ?? 0}
        isLoading={isLoading}
        icon={<BotIcon className="h-4 w-4" />}
      />
      <StatCard
        title="Total Calls"
        value={analytics?.calls.total ?? 0}
        isLoading={isLoading}
        icon={<PhoneIcon className="h-4 w-4" />}
      />
      <StatCard
        title="Phone Numbers"
        value={analytics?.phone_numbers.total ?? 0}
        isLoading={isLoading}
        icon={<HashIcon className="h-4 w-4" />}
        subtitle={`${analytics?.phone_numbers.available ?? 0} available, ${analytics?.phone_numbers.assigned ?? 0} assigned`}
      />
    </div>
  );
}

// Tenants Tab
function TenantsTab({
  tenants,
  isLoading,
  onCreate,
  onUpdate,
  onSuspend,
  onActivate,
  onSelectTenant,
}: {
  tenants: Tenant[];
  isLoading: boolean;
  onCreate: (data: { name: string; slug: string; plan?: string }) => Promise<Tenant>;
  onUpdate: (id: string, data: Partial<Tenant>) => Promise<Tenant>;
  onSuspend: (id: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onSelectTenant: (id: string) => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", slug: "", plan: "free" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: "", plan: "", max_users: 0, max_agents: 0, max_phone_numbers: 0 });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSuspend = async (id: string) => {
    setActionLoading(id);
    try {
      await onSuspend(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    setActionLoading(id);
    try {
      await onActivate(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      await onCreate(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: "", slug: "", plan: "free" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setCreateError(error.response?.data?.detail || "Failed to create tenant");
    } finally {
      setCreateLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  const openEditDrawer = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name,
      plan: tenant.plan,
      max_users: tenant.max_users,
      max_agents: tenant.max_agents,
      max_phone_numbers: tenant.max_phone_numbers,
    });
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setEditError(null);
    setEditLoading(true);
    try {
      await onUpdate(editingTenant.id, {
        ...editForm,
        plan: editForm.plan as Tenant["plan"],
      });
      setEditingTenant(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setEditError(error.response?.data?.detail || "Failed to update tenant");
    } finally {
      setEditLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <BuildingIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Tenants</h3>
            <p className="mt-2 text-muted-foreground">
              No tenants have been created yet.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Tenant
            </Button>
          </CardContent>
        </Card>
        {showCreateModal && (
          <CreateTenantModal
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreate}
            onClose={() => setShowCreateModal(false)}
            isLoading={createLoading}
            error={createError}
            generateSlug={generateSlug}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Tenant
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Slug</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        {tenants.map((tenant) => (
          <div
            key={tenant.id}
            className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 last:border-0"
          >
            <div className="col-span-3 font-medium">{tenant.name}</div>
            <div className="col-span-2 text-muted-foreground">{tenant.slug}</div>
            <div className="col-span-2">
              <PlanBadge plan={tenant.plan} />
            </div>
            <div className="col-span-2">
              <StatusBadge status={tenant.status} />
            </div>
            <div className="col-span-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDrawer(tenant)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectTenant(tenant.id)}
              >
                View Users
              </Button>
              {tenant.status === "active" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleSuspend(tenant.id)}
                  disabled={actionLoading === tenant.id}
                >
                  {actionLoading === tenant.id ? "..." : "Suspend"}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700"
                  onClick={() => handleActivate(tenant.id)}
                  disabled={actionLoading === tenant.id}
                >
                  {actionLoading === tenant.id ? "..." : "Activate"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <CreateTenantModal
          form={createForm}
          setForm={setCreateForm}
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
          isLoading={createLoading}
          error={createError}
          generateSlug={generateSlug}
        />
      )}

      {/* Edit Tenant Drawer */}
      <Drawer
        isOpen={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        title="Edit Tenant"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plan</label>
            <select
              value={editForm.plan}
              onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Users</label>
            <input
              type="number"
              value={editForm.max_users}
              onChange={(e) => setEditForm({ ...editForm, max_users: parseInt(e.target.value) || 0 })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Agents</label>
            <input
              type="number"
              value={editForm.max_agents}
              onChange={(e) => setEditForm({ ...editForm, max_agents: parseInt(e.target.value) || 0 })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Phone Numbers</label>
            <input
              type="number"
              value={editForm.max_phone_numbers}
              onChange={(e) => setEditForm({ ...editForm, max_phone_numbers: parseInt(e.target.value) || 0 })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              min="0"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditingTenant(null)} className="flex-1">
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

// Create Tenant Modal
function CreateTenantModal({
  form,
  setForm,
  onSubmit,
  onClose,
  isLoading,
  error,
  generateSlug,
}: {
  form: { name: string; slug: string; plan: string };
  setForm: (form: { name: string; slug: string; plan: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  generateSlug: (name: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Tenant</CardTitle>
          <CardDescription>
            Add a new organization to the platform.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm({
                    ...form,
                    name,
                    slug: form.slug === generateSlug(form.name) ? generateSlug(name) : form.slug,
                  });
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Acme Corp"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Slug (URL identifier)
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                placeholder="acme-corp"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Tenant"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Create User Invitation Modal
function CreateUserInvitationModal({
  tenants,
  defaultTenantId,
  onSubmit,
  onClose,
}: {
  tenants: Tenant[];
  defaultTenantId: string | null;
  onSubmit: (data: { tenant_id: string; email: string; role?: string }) => Promise<AdminInvitation>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    tenant_id: defaultTenantId || "",
    email: "",
    role: "user",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const invitation = await onSubmit({
        tenant_id: form.tenant_id,
        email: form.email,
        role: form.role,
      });
      setMagicLink(invitation.magic_link);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to create invitation");
    } finally {
      setIsLoading(false);
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
              Share this link with the user to invite them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              Invitation sent to {form.email}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Magic Link (expires in 7 days)
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
                The user can use this link to create their account.
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
          <CardTitle>Add User</CardTitle>
          <CardDescription>
            Create an invitation link for a new user.
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
              <label className="block text-sm font-medium mb-1">Tenant</label>
              <select
                value={form.tenant_id}
                onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Select a tenant...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="user@example.com"
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
                Admins can manage users and settings within their tenant.
              </p>
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Invitation"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Users Tab
function UsersTab({
  users,
  tenants,
  isLoading,
  selectedTenantId,
  onTenantFilter,
  onUpdateUser,
  onInviteUser,
  pendingInvitations,
  onRegenerateInvitation,
  onDeleteInvitation,
}: {
  users: AdminUser[];
  tenants: Tenant[];
  isLoading: boolean;
  selectedTenantId: string | null;
  onTenantFilter: (id: string | null) => void;
  onUpdateUser: (id: string, data: { name?: string; role?: string; status?: string; tenant_id?: string | null }) => Promise<AdminUser>;
  onInviteUser: (data: { tenant_id: string; email: string; role?: string }) => Promise<AdminInvitation>;
  pendingInvitations: AdminInvitation[];
  onRegenerateInvitation: (id: string) => Promise<AdminInvitation>;
  onDeleteInvitation: (id: string) => Promise<void>;
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", status: "", tenant_id: "" as string | null });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratedLink, setRegeneratedLink] = useState<{ id: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return "No Tenant";
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant?.name || "Unknown";
  };

  const openEditDrawer = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.full_name,
      role: user.role,
      status: user.status,
      tenant_id: user.tenant_id,
    });
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError(null);
    setEditLoading(true);
    try {
      await onUpdateUser(editingUser.id, {
        name: editForm.name,
        role: editForm.role,
        status: editForm.status as "active" | "inactive" | "suspended",
        tenant_id: editForm.tenant_id || null,
      });
      setEditingUser(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setEditError(error.response?.data?.detail || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filter and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Filter by Tenant:</label>
          <select
            value={selectedTenantId || ""}
            onChange={(e) => onTenantFilter(e.target.value || null)}
            className="rounded-md border bg-white px-3 py-2 text-sm"
          >
            <option value="">All Tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          {selectedTenantId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTenantFilter(null)}
            >
              Clear Filter
            </Button>
          )}
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div className="col-span-2">Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Tenant</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {users.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No users found.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 last:border-0"
            >
              <div className="col-span-2 font-medium truncate">{user.full_name}</div>
              <div className="col-span-3 text-muted-foreground truncate">{user.email}</div>
              <div className="col-span-2 text-sm truncate">
                {getTenantName(user.tenant_id)}
              </div>
              <div className="col-span-2">
                <RoleBadge role={user.role} />
              </div>
              <div className="col-span-1">
                <UserStatusBadge status={user.status} />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDrawer(user)}
                >
                  Edit
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-lg font-semibold">Pending Invitations ({pendingInvitations.length})</h3>
          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Tenant</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Expires</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 last:border-0"
              >
                <div className="col-span-3 truncate text-sm">{invitation.email}</div>
                <div className="col-span-2 text-sm truncate">
                  {getTenantName(invitation.tenant_id)}
                </div>
                <div className="col-span-2">
                  <RoleBadge role={invitation.role as AdminUser["role"]} />
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  {regeneratedLink?.id === invitation.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={regeneratedLink.link}
                        readOnly
                        className="w-32 rounded border bg-muted px-2 py-1 text-xs font-mono truncate"
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
                        {regeneratingId === invitation.id ? "..." : "Regenerate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          setDeletingId(invitation.id);
                          try {
                            await onDeleteInvitation(invitation.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === invitation.id}
                      >
                        {deletingId === invitation.id ? "..." : "Delete"}
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
        <CreateUserInvitationModal
          tenants={tenants}
          defaultTenantId={selectedTenantId}
          onSubmit={onInviteUser}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Edit User Drawer */}
      <Drawer
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
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
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tenant</label>
            <select
              value={editForm.tenant_id || ""}
              onChange={(e) => setEditForm({ ...editForm, tenant_id: e.target.value || null })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">No Tenant (Super Admin)</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
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

// Country list for phone number search
const SUPPORTED_COUNTRIES = [
  { code: "AU", name: "Australia", flag: "AU" },
  { code: "US", name: "United States", flag: "US" },
  { code: "GB", name: "United Kingdom", flag: "GB" },
  { code: "CA", name: "Canada", flag: "CA" },
  { code: "NZ", name: "New Zealand", flag: "NZ" },
  { code: "DE", name: "Germany", flag: "DE" },
  { code: "FR", name: "France", flag: "FR" },
  { code: "SG", name: "Singapore", flag: "SG" },
];

// Phone Numbers Tab
function PhoneNumbersTab({
  pooledNumbers,
  availableNumbers,
  selectedCountry,
  isSearching,
  isPurchasing,
  tenants,
  onSearch,
  onCountryChange,
  onPurchase,
  onDelete,
}: {
  pooledNumbers: PooledPhoneNumber[];
  availableNumbers: AvailableNumbersResult | null;
  selectedCountry: string;
  isSearching: boolean;
  isPurchasing: boolean;
  tenants: Tenant[];
  onSearch: (countryCode?: string) => Promise<void>;
  onCountryChange: (countryCode: string) => void;
  onPurchase: (phoneNumber: string, numberType: string, countryCode: string) => Promise<PooledPhoneNumber>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleSearch = () => {
    setPurchaseError(null);
    onSearch(selectedCountry);
  };

  const handlePurchase = async (phoneNumber: string, numberType: string) => {
    setPurchaseError(null);
    try {
      await onPurchase(phoneNumber, numberType, selectedCountry);
      // Refresh search to update available numbers
      onSearch(selectedCountry);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setPurchaseError(error.response?.data?.detail || "Failed to purchase number");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(id);
    try {
      await onDelete(id);
    } finally {
      setDeleteLoading(null);
    }
  };

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return "-";
    return tenants.find((t) => t.id === tenantId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Available Numbers</CardTitle>
          <CardDescription>
            Search for available phone numbers to add to the pool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium mb-1">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => onCountryChange(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {SUPPORTED_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-6">
              <Button onClick={handleSearch} disabled={isSearching}>
                <SearchIcon className="mr-2 h-4 w-4" />
                {isSearching ? "Searching..." : "Search Available Numbers"}
              </Button>
            </div>
          </div>
          {purchaseError && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {purchaseError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Numbers Section */}
      {availableNumbers && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Numbers</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <NumberTypeCard
              title="Mobile"
              icon={<MobileIcon className="h-5 w-5" />}
              numbers={availableNumbers.mobile}
              numberType="mobile"
              price={availableNumbers.pricing?.mobile}
              isPurchasing={isPurchasing}
              onPurchase={handlePurchase}
            />
            <NumberTypeCard
              title="Local (Landline)"
              icon={<LandlineIcon className="h-5 w-5" />}
              numbers={availableNumbers.local}
              numberType="local"
              price={availableNumbers.pricing?.local}
              isPurchasing={isPurchasing}
              onPurchase={handlePurchase}
            />
            <NumberTypeCard
              title="Toll-Free (1800)"
              icon={<TollFreeIcon className="h-5 w-5" />}
              numbers={availableNumbers.toll_free}
              numberType="toll_free"
              price={availableNumbers.pricing?.toll_free}
              isPurchasing={isPurchasing}
              onPurchase={handlePurchase}
            />
          </div>
        </div>
      )}

      {/* Number Pool Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Number Pool ({pooledNumbers.length} numbers)</h3>
        <div className="rounded-lg border bg-white">
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div className="col-span-3">Phone Number</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Assigned To</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {pooledNumbers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No phone numbers in the pool. Search and purchase numbers above.
            </div>
          ) : (
            pooledNumbers.map((number) => (
              <div
                key={number.id}
                className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 last:border-0"
              >
                <div className="col-span-3 font-mono text-sm">{number.phone_number}</div>
                <div className="col-span-2">
                  <NumberTypeBadge type={number.number_type} />
                </div>
                <div className="col-span-2">
                  <PhoneStatusBadge status={number.status} />
                </div>
                <div className="col-span-3 text-sm">{getTenantName(number.tenant_id)}</div>
                <div className="col-span-2 flex justify-end">
                  {number.status === "available" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(number.id)}
                      disabled={deleteLoading === number.id}
                    >
                      {deleteLoading === number.id ? "..." : "Delete"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Number Type Card
function NumberTypeCard({
  title,
  icon,
  numbers,
  numberType,
  price,
  isPurchasing,
  onPurchase,
}: {
  title: string;
  icon: React.ReactNode;
  numbers: TwilioAvailableNumber[];
  numberType: string;
  price?: string | null;
  isPurchasing: boolean;
  onPurchase: (phoneNumber: string, numberType: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {price && (
            <span className="text-sm font-medium text-green-600">
              ${price}/mo
            </span>
          )}
        </div>
        <CardDescription>{numbers.length} available</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {numbers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No numbers available
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto -mx-2 px-2">
            <div className="space-y-1 py-1">
              {numbers.map((number) => (
                <div
                  key={number.phone_number}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-mono text-sm">{number.friendly_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {number.capabilities.voice && "Voice"}
                      {number.capabilities.voice && number.capabilities.sms && " + "}
                      {number.capabilities.sms && "SMS"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onPurchase(number.phone_number, numberType)}
                    disabled={isPurchasing}
                  >
                    Buy
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Number Type Badge
function NumberTypeBadge({ type }: { type: string | null }) {
  const styles: Record<string, string> = {
    mobile: "bg-blue-100 text-blue-700",
    local: "bg-green-100 text-green-700",
    toll_free: "bg-purple-100 text-purple-700",
  };

  const labels: Record<string, string> = {
    mobile: "Mobile",
    local: "Landline",
    toll_free: "Toll-Free",
  };

  const typeKey = type || "local";

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium", styles[typeKey] || styles.local)}>
      {labels[typeKey] || type || "Unknown"}
    </span>
  );
}

// Phone Status Badge
function PhoneStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    assigned: "bg-blue-100 text-blue-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium capitalize", styles[status] || "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}

// Utility Components
function StatCard({
  title,
  value,
  isLoading,
  icon,
  subtitle,
}: {
  title: string;
  value: number;
  isLoading: boolean;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-secondary" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Tenant["status"] }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
    trial: "bg-amber-100 text-amber-700",
    cancelled: "bg-gray-100 text-gray-700",
  };

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: Tenant["plan"] }) {
  const styles = {
    free: "bg-gray-100 text-gray-700",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
    enterprise: "bg-amber-100 text-amber-700",
  };

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium capitalize", styles[plan])}>
      {plan}
    </span>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  const styles = {
    super_admin: "bg-red-100 text-red-700",
    admin: "bg-purple-100 text-purple-700",
    user: "bg-gray-100 text-gray-700",
  };

  const labels = {
    super_admin: "Super Admin",
    admin: "Admin",
    user: "User",
  };

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium", styles[role])}>
      {labels[role]}
    </span>
  );
}

function UserStatusBadge({ status }: { status: AdminUser["status"] }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium capitalize", styles[status])}>
      {status}
    </span>
  );
}

// Icons
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}

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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function MobileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function LandlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function TollFreeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
