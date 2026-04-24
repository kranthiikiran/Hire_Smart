import axios from 'axios';

const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const resolvedBaseUrl = configuredBaseUrl
  ? (configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`)
  : '/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 60000, // 60 seconds for large file uploads
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    // Prevent /api/api duplication if callers use /api/* paths by mistake.
    const hasApiBase = String(config.baseURL || '').endsWith('/api');
    if (hasApiBase && typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || '');
    const isAuthCall =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.endsWith('/login') ||
      requestUrl.endsWith('/register');

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshEndpoint = String(resolvedBaseUrl).endsWith('/api')
            ? `${resolvedBaseUrl}/auth/refresh`
            : `${resolvedBaseUrl}/api/auth/refresh`;

          const response = await axios.post(
            refreshEndpoint,
            { refreshToken }
          );

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ===== AUTH API =====

export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      // Backward compatibility fallback for older deployments
      if (status === 404 || status === 405) {
        const fallback = await api.post('/login', credentials);
        return fallback.data;
      }
      throw error;
    }
  },

  // Refresh access token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Logout user
  logout: async (userId) => {
    const response = await api.post('/auth/logout', { userId });
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// ===== ANALYSIS API =====

export const analysisAPI = {
  // Batch analyze resumes
  analyzeBatch: async (formData, onUploadProgress) => {
    const response = await api.post('/analyze/batch', formData, {
      onUploadProgress
    });
    return response.data;
  },

  // Get analysis results by ID
  getResults: async (analysisId) => {
    const response = await api.get(`/analyze/results/${analysisId}`);
    return response.data;
  },

  // Get analysis history
  getHistory: async (params = {}) => {
    const { page = 1, limit = 10, status } = params;
    const queryParams = new URLSearchParams({ page, limit });
    if (status) queryParams.append('status', status);
    
    const response = await api.get(`/analyze/history?${queryParams}`);
    return response.data;
  },

  // Get user statistics
  getStats: async () => {
    const response = await api.get('/analyze/stats');
    return response.data;
  }
};

// ===== UTILITY API =====

export const utilityAPI = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Export configured axios instance for custom requests
export default api;
