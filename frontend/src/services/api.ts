const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:58123';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
}

interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  two_factor_enabled: boolean;
  requires_password_change: boolean;
  last_login_at?: string;
}

interface LoginRequest {
  email: string;
  password: string;
  totp_code?: string;
}

interface BootstrapRequest {
  token: string;
  email: string;
}

interface SetPasswordRequest {
  password: string;
  totp_code?: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface InviteUserRequest {
  email: string;
  role: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      };

      // Add JWT token if available
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers,
        ...options,
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle token expiry
        if (response.status === 401 && this.token) {
          this.setToken(null);
          // Redirect to login or emit event for auth context to handle
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
        }
        
        return { 
          error: responseData.message || responseData.error || `HTTP error! status: ${response.status}`,
          success: false 
        };
      }

      return { 
        data: responseData.data || responseData, 
        success: responseData.success !== false 
      };
    } catch (error) {
      console.error('API request failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Network error occurred',
        success: false 
      };
    }
  }

  // Collections API
  async getCollections(workspaceId?: number) {
    const query = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return this.request(`/collections${query}`);
  }

  async getCollection(id: number) {
    return this.request(`/collections/${id}`);
  }

  async createCollection(data: any) {
    return this.request('/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCollection(id: number, data: any) {
    return this.request(`/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCollection(id: number) {
    return this.request(`/collections/${id}`, {
      method: 'DELETE',
    });
  }

  // Environments API
  async getEnvironments(workspaceId?: number) {
    const query = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return this.request(`/environments${query}`);
  }

  async getEnvironment(id: number) {
    return this.request(`/environments/${id}`);
  }

  async createEnvironment(data: any) {
    return this.request('/environments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEnvironment(id: number, data: any) {
    return this.request(`/environments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async activateEnvironment(id: number) {
    return this.request(`/environments/${id}/activate`, {
      method: 'POST',
    });
  }

  async deleteEnvironment(id: number) {
    return this.request(`/environments/${id}`, {
      method: 'DELETE',
    });
  }

  // Requests API
  async getRequests(collectionId?: number) {
    const query = collectionId ? `?collection_id=${collectionId}` : '';
    return this.request(`/requests${query}`);
  }

  async createRequest(data: any) {
    return this.request('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRequest(id: number, data: any) {
    return this.request(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRequest(id: number) {
    return this.request(`/requests/${id}`, {
      method: 'DELETE',
    });
  }

  // Documentation API
  async getDocs(requestId?: number) {
    const query = requestId ? `?request_id=${requestId}` : '';
    return this.request(`/docs${query}`);
  }

  async generateDoc(requestId: number, requestData: any) {
    return this.request(`/docs/generate/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  // Authentication API
  async bootstrap(data: BootstrapRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/bootstrap', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyBootstrapOtp(email: string, otp: string): Promise<ApiResponse<{ temp_token: string; requires_setup: boolean }>> {
    return this.request('/api/bootstrap/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async login(data: LoginRequest): Promise<ApiResponse<{ user: User; tokens: AuthTokens; requires_2fa?: boolean }>> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const result = await this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
    // Clear token on successful logout
    if (result.success !== false) {
      this.setToken(null);
    }
    return result;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/api/auth/me');
  }

  async setFirstTimePassword(data: SetPasswordRequest): Promise<ApiResponse<{ qr_code?: string; backup_codes?: string[]; tokens?: AuthTokens }>> {
    return this.request('/api/auth/first-time-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verify2faSetup(totp_code: string): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    return this.request('/api/auth/verify-2fa-setup', {
      method: 'POST',
      body: JSON.stringify({ totp_code }),
    });
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyForgotPasswordOtp(email: string, otp: string): Promise<ApiResponse<{ reset_token: string }>> {
    return this.request('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyInvitation(email: string, otp: string): Promise<ApiResponse<{ temp_token: string; role: string }>> {
    return this.request('/api/auth/verify-invitation', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async setCollaboratorPassword(password: string): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    return this.request('/api/auth/collaborator/set-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Admin API
  async getCollaborators(): Promise<ApiResponse<User[]>> {
    return this.request('/api/admin/collaborators');
  }

  async inviteUser(data: InviteUserRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/admin/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUserRole(userId: number, role: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/admin/collaborators/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeUser(userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/admin/collaborators/${userId}`, {
      method: 'DELETE',
    });
  }

  async getAuditLogs(page: number = 1, limit: number = 50): Promise<ApiResponse<{ logs: any[]; total: number; page: number; limit: number }>> {
    return this.request(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
  }

  async getSystemStatus(): Promise<ApiResponse<{ mode: string; bootstrap_required: boolean; smtp_configured: boolean }>> {
    return this.request('/api/admin/system-status');
  }
}

export const apiService = new ApiService();
export default apiService;