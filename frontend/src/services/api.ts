const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:58123';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
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
}

export const apiService = new ApiService();
export default apiService;