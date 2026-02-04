import axios, { AxiosError, AxiosInstance } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await this.refreshAccessToken(refreshToken);
              this.setToken(response.access_token);
              originalRequest.headers.Authorization = `Bearer ${response.access_token}`;
              return this.client(originalRequest);
            }
          } catch {
            this.clearTokens();
            window.location.href = "/login";
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token");
    }
    return null;
  }

  setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
  }

  setRefreshToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("refresh_token", token);
    }
  }

  clearTokens(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  private async refreshAccessToken(refreshToken: string) {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post("/auth/login", { email, password });
    return response.data;
  }

  async register(data: { email: string; password: string; full_name: string }) {
    const response = await this.client.post("/auth/register", data);
    return response.data;
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      await this.client.post("/auth/logout", { refresh_token: refreshToken });
    }
    this.clearTokens();
  }

  async getCurrentUser() {
    const response = await this.client.get("/auth/me");
    return response.data;
  }

  // Agents endpoints
  async getAgents() {
    const response = await this.client.get("/agents");
    return response.data;
  }

  async getAgent(id: string) {
    const response = await this.client.get(`/agents/${id}`);
    return response.data;
  }

  async createAgent(data: {
    name: string;
    system_prompt?: string;
    welcome_message?: string;
    voice_id?: string;
    llm_model?: string;
    language?: string;
  }) {
    const response = await this.client.post("/agents", data);
    return response.data;
  }

  async updateAgent(id: string, data: Record<string, unknown>) {
    const response = await this.client.patch(`/agents/${id}`, data);
    return response.data;
  }

  async deleteAgent(id: string) {
    await this.client.delete(`/agents/${id}`);
  }

  // Documents endpoints
  async getDocuments(agentId: string) {
    const response = await this.client.get(`/agents/${agentId}/documents`);
    return response.data;
  }

  async createDocumentFromText(agentId: string, name: string, content: string) {
    const response = await this.client.post(`/agents/${agentId}/documents/text`, {
      name,
      content,
    });
    return response.data;
  }

  async createDocumentFromUrl(agentId: string, name: string, url: string) {
    const response = await this.client.post(`/agents/${agentId}/documents/url`, {
      name,
      url,
    });
    return response.data;
  }

  async deleteDocument(agentId: string, docId: string) {
    await this.client.delete(`/agents/${agentId}/documents/${docId}`);
  }

  // Calls endpoints
  async getCalls(agentId?: string) {
    const params = agentId ? { agent_id: agentId } : {};
    const response = await this.client.get("/calls", { params });
    return response.data;
  }

  async getCall(id: string) {
    const response = await this.client.get(`/calls/${id}`);
    return response.data;
  }

  // Phone numbers endpoints
  async getPhoneNumbers() {
    const response = await this.client.get("/phone-numbers");
    return response.data;
  }

  async getAvailablePhoneNumbers() {
    const response = await this.client.get("/phone-numbers/available");
    return response.data;
  }

  async claimPhoneNumber(phoneNumberId: string) {
    const response = await this.client.post(`/phone-numbers/${phoneNumberId}/claim`);
    return response.data;
  }

  async releasePhoneNumber(phoneNumberId: string) {
    await this.client.post(`/phone-numbers/${phoneNumberId}/release`);
  }

  async assignPhoneToAgent(phoneNumberId: string, agentId: string) {
    const response = await this.client.post(`/phone-numbers/${phoneNumberId}/assign`, {
      agent_id: agentId,
    });
    return response.data;
  }

  // Users endpoints (admin)
  async getUsers() {
    const response = await this.client.get("/users");
    return response.data;
  }

  async createUser(data: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) {
    const response = await this.client.post("/users", data);
    return response.data;
  }

  async updateUser(id: string, data: Record<string, unknown>) {
    const response = await this.client.patch(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    await this.client.delete(`/users/${id}`);
  }

  // Admin endpoints (super admin)
  async getTenants() {
    const response = await this.client.get("/admin/tenants");
    return response.data;
  }

  async createTenant(data: { name: string; slug: string; plan?: string }) {
    const response = await this.client.post("/admin/tenants", data);
    return response.data;
  }

  async getAnalytics() {
    const response = await this.client.get("/admin/analytics");
    return response.data;
  }
}

export const api = new ApiClient();
