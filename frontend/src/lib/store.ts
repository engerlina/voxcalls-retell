import { create } from "zustand";
import { api } from "./api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "user";
  tenant_id: string | null;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await api.login(email, password);
    api.setToken(response.access_token);
    api.setRefreshToken(response.refresh_token);

    const user = await api.getCurrentUser();
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await api.logout();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const user = await api.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Agent store
export interface Agent {
  id: string;
  name: string;
  status: string;
  retell_agent_id: string | null;
  retell_llm_id: string | null;
  voice_id: string | null;
  llm_model: string;
  language: string;
  system_prompt: string | null;
  welcome_message: string | null;
  temperature: number;
  responsiveness: number;
  interruption_sensitivity: number;
  ambient_sound: string | null;
  tenant_id: string;
  assigned_user_id: string | null;
  knowledge_base_ids: string[];
  tools_config: {
    additional_voices?: string[];
    additional_languages?: string[];
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
}

interface AgentState {
  agents: Agent[];
  isLoading: boolean;
  fetchAgents: () => Promise<void>;
  createAgent: (data: {
    name: string;
    system_prompt?: string;
    welcome_message?: string;
    voice_id?: string;
  }) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  isLoading: false,

  fetchAgents: async () => {
    set({ isLoading: true });
    try {
      const agents = await api.getAgents();
      set({ agents, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createAgent: async (data) => {
    const agent = await api.createAgent(data);
    set({ agents: [...get().agents, agent] });
    return agent;
  },

  deleteAgent: async (id) => {
    await api.deleteAgent(id);
    set({ agents: get().agents.filter((a) => a.id !== id) });
  },
}));

// Admin store (for super_admin users)
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "trial" | "cancelled";
  plan: "free" | "starter" | "pro" | "enterprise";
  max_users: number;
  max_agents: number;
  max_phone_numbers: number;
  monthly_minutes_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "user";
  tenant_id: string | null;
  status: "active" | "inactive" | "suspended";
  created_at: string;
}

export interface Analytics {
  tenants: { total: number };
  users: { total: number };
  agents: { total: number };
  phone_numbers: { total: number; available: number; assigned: number };
  calls: { total: number };
}

export interface AdminInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  magic_link: string;
}

// Phone number types for admin
export interface TwilioAvailableNumber {
  phone_number: string;
  friendly_name: string;
  country_code: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export interface AvailableNumbersResult {
  local: TwilioAvailableNumber[];
  mobile: TwilioAvailableNumber[];
  toll_free: TwilioAvailableNumber[];
  pricing: Record<string, string | null>;
}

export interface PooledPhoneNumber {
  id: string;
  phone_number: string;
  retell_phone_id: string | null;
  country_code: string | null;
  number_type: string | null;
  sip_trunk_uri: string | null;
  tenant_id: string | null;
  assigned_user_id: string | null;
  assigned_agent_id: string | null;
  supports_inbound: boolean;
  supports_outbound: boolean;
  supports_sms: boolean;
  status: string;
  assigned_at: string | null;
  created_at: string;
}

interface AdminState {
  tenants: Tenant[];
  users: AdminUser[];
  analytics: Analytics | null;
  isLoading: boolean;
  // Phone number state
  pooledNumbers: PooledPhoneNumber[];
  availableNumbers: AvailableNumbersResult | null;
  selectedCountry: string;
  isSearchingNumbers: boolean;
  isPurchasingNumber: boolean;
  // Invitation state
  pendingInvitations: AdminInvitation[];
  // Tenant actions
  fetchTenants: () => Promise<void>;
  fetchAllUsers: (tenantId?: string) => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  createTenant: (data: { name: string; slug: string; plan?: string }) => Promise<Tenant>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<Tenant>;
  suspendTenant: (id: string) => Promise<void>;
  activateTenant: (id: string) => Promise<void>;
  updateUser: (id: string, data: { name?: string; role?: string; status?: string; tenant_id?: string | null }) => Promise<AdminUser>;
  // Invitation actions
  createUserInvitation: (data: {
    tenant_id: string;
    email: string;
    role?: string;
  }) => Promise<AdminInvitation>;
  fetchPendingInvitations: (tenantId?: string) => Promise<void>;
  regenerateInvitation: (id: string) => Promise<AdminInvitation>;
  deleteInvitation: (id: string) => Promise<void>;
  // Phone number actions
  fetchPooledNumbers: () => Promise<void>;
  searchAvailableNumbers: (countryCode?: string) => Promise<void>;
  purchaseNumber: (phoneNumber: string, numberType: string, countryCode: string) => Promise<PooledPhoneNumber>;
  deletePooledNumber: (id: string) => Promise<void>;
  setSelectedCountry: (countryCode: string) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  tenants: [],
  users: [],
  analytics: null,
  isLoading: false,
  // Phone number initial state
  pooledNumbers: [],
  availableNumbers: null,
  selectedCountry: "AU",
  isSearchingNumbers: false,
  isPurchasingNumber: false,
  // Invitation initial state
  pendingInvitations: [],

  fetchTenants: async () => {
    set({ isLoading: true });
    try {
      const tenants = await api.getTenants();
      set({ tenants, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchAllUsers: async (tenantId?: string) => {
    set({ isLoading: true });
    try {
      const users = await api.getAllUsers(tenantId);
      set({ users, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchAnalytics: async () => {
    try {
      const analytics = await api.getAnalytics();
      set({ analytics });
    } catch {
      // Silently fail
    }
  },

  createTenant: async (data: { name: string; slug: string; plan?: string }) => {
    const tenant = await api.createTenant(data);
    set({ tenants: [...get().tenants, tenant] });
    return tenant;
  },

  updateTenant: async (id: string, data: Partial<Tenant>) => {
    const tenant = await api.updateTenant(id, data);
    set({
      tenants: get().tenants.map((t) => (t.id === id ? tenant : t)),
    });
    return tenant;
  },

  suspendTenant: async (id: string) => {
    await api.suspendTenant(id);
    set({
      tenants: get().tenants.map((t) =>
        t.id === id ? { ...t, status: "suspended" as const } : t
      ),
    });
  },

  activateTenant: async (id: string) => {
    await api.activateTenant(id);
    set({
      tenants: get().tenants.map((t) =>
        t.id === id ? { ...t, status: "active" as const } : t
      ),
    });
  },

  updateUser: async (id: string, data: { name?: string; role?: string; status?: string; tenant_id?: string | null }) => {
    const user = await api.updateAdminUser(id, data);
    set({
      users: get().users.map((u) => (u.id === id ? user : u)),
    });
    return user;
  },

  createUserInvitation: async (data: {
    tenant_id: string;
    email: string;
    role?: string;
  }) => {
    const invitation = await api.createAdminInvitation(data);
    set({ pendingInvitations: [...get().pendingInvitations, invitation] });
    return invitation;
  },

  fetchPendingInvitations: async (tenantId?: string) => {
    try {
      const invitations = await api.getPendingInvitations(tenantId);
      set({ pendingInvitations: invitations });
    } catch {
      // Silently fail
    }
  },

  regenerateInvitation: async (id: string) => {
    const invitation = await api.regenerateInvitation(id);
    set({
      pendingInvitations: get().pendingInvitations.map((inv) =>
        inv.id === id ? invitation : inv
      ),
    });
    return invitation;
  },

  deleteInvitation: async (id: string) => {
    await api.deleteInvitation(id);
    set({
      pendingInvitations: get().pendingInvitations.filter((inv) => inv.id !== id),
    });
  },

  // Phone number actions
  fetchPooledNumbers: async () => {
    try {
      const numbers = await api.getAdminPhoneNumbers();
      set({ pooledNumbers: numbers });
    } catch {
      // Silently fail
    }
  },

  searchAvailableNumbers: async (countryCode?: string) => {
    const country = countryCode || get().selectedCountry;
    set({ isSearchingNumbers: true, selectedCountry: country });
    try {
      const results = await api.searchTwilioNumbersByCountry(country, 10);
      set({ availableNumbers: results, isSearchingNumbers: false });
    } catch {
      set({ availableNumbers: null, isSearchingNumbers: false });
    }
  },

  purchaseNumber: async (phoneNumber: string, numberType: string, countryCode: string) => {
    set({ isPurchasingNumber: true });
    try {
      const number = await api.purchasePhoneNumber(phoneNumber, numberType, countryCode);
      set({
        pooledNumbers: [...get().pooledNumbers, number],
        isPurchasingNumber: false,
      });
      return number;
    } catch (error) {
      set({ isPurchasingNumber: false });
      throw error;
    }
  },

  deletePooledNumber: async (id: string) => {
    await api.deleteAdminPhoneNumber(id);
    set({
      pooledNumbers: get().pooledNumbers.filter((n) => n.id !== id),
    });
  },

  setSelectedCountry: (countryCode: string) => {
    set({ selectedCountry: countryCode });
  },
}));

// Tenant Users Store (for admin users managing their tenant's users)
export interface TenantUser {
  id: string;
  email: string;
  name: string;
  full_name: string;
  role: "admin" | "user";
  tenant_id: string;
  status: "active" | "inactive" | "suspended";
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  magic_link: string;
}

interface TenantUsersState {
  users: TenantUser[];
  invitations: TenantInvitation[];
  isLoading: boolean;
  isInviting: boolean;
  // User actions
  fetchUsers: () => Promise<void>;
  updateUser: (id: string, data: { name?: string }) => Promise<TenantUser>;
  changeUserRole: (id: string, role: string) => Promise<TenantUser>;
  deleteUser: (id: string) => Promise<void>;
  // Invitation actions
  fetchInvitations: () => Promise<void>;
  inviteUser: (email: string, role?: string) => Promise<TenantInvitation>;
  regenerateInvitation: (id: string) => Promise<TenantInvitation>;
  deleteInvitation: (id: string) => Promise<void>;
}

export const useTenantUsersStore = create<TenantUsersState>((set, get) => ({
  users: [],
  invitations: [],
  isLoading: false,
  isInviting: false,

  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const users = await api.getUsers();
      set({ users, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateUser: async (id: string, data: { name?: string }) => {
    const user = await api.updateUser(id, data);
    set({
      users: get().users.map((u) => (u.id === id ? user : u)),
    });
    return user;
  },

  changeUserRole: async (id: string, role: string) => {
    const user = await api.changeUserRole(id, role);
    set({
      users: get().users.map((u) => (u.id === id ? user : u)),
    });
    return user;
  },

  deleteUser: async (id: string) => {
    await api.deleteUser(id);
    set({
      users: get().users.filter((u) => u.id !== id),
    });
  },

  fetchInvitations: async () => {
    try {
      const invitations = await api.getTenantInvitations();
      set({ invitations });
    } catch {
      // Silently fail
    }
  },

  inviteUser: async (email: string, role: string = "user") => {
    set({ isInviting: true });
    try {
      const invitation = await api.inviteTenantUser({ email, role });
      set({
        invitations: [...get().invitations, invitation],
        isInviting: false,
      });
      return invitation;
    } catch (error) {
      set({ isInviting: false });
      throw error;
    }
  },

  regenerateInvitation: async (id: string) => {
    const invitation = await api.regenerateTenantInvitation(id);
    set({
      invitations: get().invitations.map((inv) =>
        inv.id === id ? invitation : inv
      ),
    });
    return invitation;
  },

  deleteInvitation: async (id: string) => {
    await api.deleteTenantInvitation(id);
    set({
      invitations: get().invitations.filter((inv) => inv.id !== id),
    });
  },
}));
