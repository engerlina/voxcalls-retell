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

  async register(data: {
    email: string;
    password: string;
    name: string;
    tenant_name: string;
    tenant_slug: string;
  }) {
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

  async getConversationDetails(conversationId: string) {
    const response = await this.client.get(`/calls/conversation/${conversationId}`);
    return response.data;
  }

  async getConversationAudioBlob(conversationId: string): Promise<string | null> {
    try {
      const response = await this.client.get(
        `/calls/conversation/${conversationId}/audio`,
        { responseType: "blob" }
      );
      // Create a blob URL for the audio
      const blob = new Blob([response.data], { type: "audio/mpeg" });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Failed to fetch audio:", error);
      return null;
    }
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
    const response = await this.client.post("/phone-numbers/claim", {
      phone_number_id: phoneNumberId,
    });
    return response.data;
  }

  async releasePhoneNumber(phoneNumberId: string) {
    await this.client.post("/phone-numbers/release", null, {
      params: { phone_number_id: phoneNumberId },
    });
  }

  async getPhoneNumber(phoneNumberId: string) {
    const response = await this.client.get(`/phone-numbers/${phoneNumberId}`);
    return response.data;
  }

  async assignAgentToPhoneNumber(phoneNumberId: string, agentId: string | null) {
    const response = await this.client.patch(`/phone-numbers/${phoneNumberId}/agent`, {
      agent_id: agentId,
    });
    return response.data;
  }

  // Knowledge Base / Documents endpoints
  async getKnowledgeDocuments(agentId?: string) {
    const params = agentId ? { agent_id: agentId } : {};
    const response = await this.client.get("/documents", { params });
    // Transform to expected format
    const documents = response.data;
    return {
      documents: documents.map((d: Record<string, unknown>) => ({
        id: d.id,
        name: d.name,
        type: d.source_type || "file",
        // Only show size for files, not URLs or text
        size: d.source_type === "file" ? ((d.file_size_bytes as number) || 0) : null,
        created_by: (d.user_name as string) || "Unknown",
        created_at: d.created_at,
        updated_at: d.created_at, // Backend doesn't have updated_at yet
        agent_id: d.agent_id,
      })),
      stats: { used_bytes: 0, total_bytes: 21 * 1024 * 1024 },
    };
  }

  async addKnowledgeUrl(name: string, url: string, agentId?: string) {
    const response = await this.client.post("/documents/url", {
      name,
      url,
      agent_id: agentId,
    });
    return response.data;
  }

  async addKnowledgeText(name: string, content: string, agentId?: string) {
    const response = await this.client.post("/documents/text", {
      name,
      content,
      agent_id: agentId,
    });
    return response.data;
  }

  async uploadKnowledgeFile(file: File, agentId?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (agentId) formData.append("agent_id", agentId);

    const response = await this.client.post("/documents/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async createKnowledgeFolder(name: string, agentId?: string) {
    // Folders are just placeholder documents for organization
    const response = await this.client.post("/documents/text", {
      name,
      content: `Folder: ${name}`,
      agent_id: agentId,
    });
    return response.data;
  }

  async deleteKnowledgeDocument(documentId: string) {
    await this.client.delete(`/documents/${documentId}`);
  }

  // Agent configuration endpoints
  async getAgentDetails(agentId: string) {
    const response = await this.client.get(`/agents/${agentId}`);
    return response.data;
  }

  async assignPhoneToAgent(phoneNumberId: string, agentId: string) {
    const response = await this.client.post(`/phone-numbers/${phoneNumberId}/assign`, {
      agent_id: agentId,
    });
    return response.data;
  }

  // Users endpoints (tenant admin)
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

  async changeUserRole(id: string, role: string) {
    const response = await this.client.patch(`/users/${id}/role`, null, {
      params: { role },
    });
    return response.data;
  }

  // Tenant invitation endpoints (tenant admin)
  async inviteTenantUser(data: { email: string; role?: string }) {
    const response = await this.client.post("/users/invite", data);
    return response.data;
  }

  async getTenantInvitations() {
    const response = await this.client.get("/users/invitations");
    return response.data;
  }

  async regenerateTenantInvitation(invitationId: string) {
    const response = await this.client.post(`/users/invitations/${invitationId}/regenerate`);
    return response.data;
  }

  async deleteTenantInvitation(invitationId: string) {
    await this.client.delete(`/users/invitations/${invitationId}`);
  }

  // Admin endpoints (super admin)
  async getTenants() {
    const response = await this.client.get("/admin/tenants");
    return response.data;
  }

  async getTenant(id: string) {
    const response = await this.client.get(`/admin/tenants/${id}`);
    return response.data;
  }

  async createTenant(data: { name: string; slug: string; plan?: string }) {
    const response = await this.client.post("/admin/tenants", data);
    return response.data;
  }

  async updateTenant(id: string, data: Record<string, unknown>) {
    const response = await this.client.patch(`/admin/tenants/${id}`, data);
    return response.data;
  }

  async suspendTenant(id: string) {
    const response = await this.client.post(`/admin/tenants/${id}/suspend`);
    return response.data;
  }

  async activateTenant(id: string) {
    const response = await this.client.post(`/admin/tenants/${id}/activate`);
    return response.data;
  }

  async getAllUsers(tenantId?: string) {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await this.client.get("/admin/users", { params });
    return response.data;
  }

  async updateAdminUser(
    id: string,
    data: { name?: string; role?: string; status?: string; tenant_id?: string | null }
  ) {
    const response = await this.client.patch(`/admin/users/${id}`, data);
    return response.data;
  }

  async getAnalytics() {
    const response = await this.client.get("/admin/analytics");
    return response.data;
  }

  // Admin phone number endpoints (super admin)
  async getAdminPhoneNumbers() {
    const response = await this.client.get("/admin/phone-numbers");
    return response.data;
  }

  async searchTwilioNumbersByCountry(countryCode: string = "AU", limitPerType: number = 10) {
    const response = await this.client.post("/admin/phone-numbers/search-by-country", null, {
      params: { country_code: countryCode, limit_per_type: limitPerType },
    });
    return response.data;
  }

  async purchasePhoneNumber(phoneNumber: string, numberType: string, countryCode: string) {
    const response = await this.client.post("/admin/phone-numbers/purchase", {
      phone_number: phoneNumber,
      number_type: numberType,
      country_code: countryCode,
    });
    return response.data;
  }

  async deleteAdminPhoneNumber(phoneNumberId: string) {
    await this.client.delete(`/admin/phone-numbers/${phoneNumberId}`);
  }

  // Admin invitation endpoints (super admin)
  async createAdminInvitation(data: {
    tenant_id: string;
    email: string;
    role?: string;
  }) {
    const response = await this.client.post("/admin/invitations", data);
    return response.data;
  }

  async getPendingInvitations(tenantId?: string) {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await this.client.get("/admin/invitations", { params });
    return response.data;
  }

  async regenerateInvitation(invitationId: string) {
    const response = await this.client.post(`/admin/invitations/${invitationId}/regenerate`);
    return response.data;
  }

  async deleteInvitation(invitationId: string) {
    await this.client.delete(`/admin/invitations/${invitationId}`);
  }

  // Public invitation endpoints (no auth required)
  async validateInvitation(token: string) {
    const response = await this.client.get(`/auth/invite/${token}`);
    return response.data;
  }

  async acceptInvitation(
    token: string,
    data: { name: string; password: string }
  ) {
    const response = await this.client.post(`/auth/invite/${token}/accept`, data);
    return response.data;
  }
}

export const api = new ApiClient();
