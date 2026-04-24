import axios from 'axios'

const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')

const api = axios.create({
  baseURL: configuredBaseUrl || '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hiresmart_token') || localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }

    // Guard against accidental /api/api duplication if baseURL includes /api.
    const hasApiBase = String(config.baseURL || '').endsWith('/api')
    if (hasApiBase && typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '')
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || ''
    const isAuthCall = requestUrl.includes('/login') || requestUrl.includes('/register')

    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('hiresmart_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
