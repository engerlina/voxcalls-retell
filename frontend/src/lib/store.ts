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
  elevenlabs_agent_id: string | null;
  voice_id: string | null;
  llm_model: string;
  language: string;
  created_at: string;
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
