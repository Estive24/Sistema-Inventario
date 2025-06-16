class UserService {
  constructor() {
    this.baseURL = '/api/setup';
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (token && !options.skipAuth) {
      config.headers['Authorization'] = `Token ${token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // ========== GESTIÓN DE USUARIOS ==========
  async getUsers(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    return this.request(`/users/${queryString ? `?${queryString}` : ''}`);
  }

  async createUser(userData) {
    return this.request('/users/create/', {
      method: 'POST',
      body: userData
    });
  }

  async updateUser(userId, userData) {
    return this.request(`/users/${userId}/update/`, {
      method: 'PUT',
      body: userData
    });
  }

  async getSystemRoles() {
    return this.request('/users/roles/');
  }
}

export const userService = new UserService();