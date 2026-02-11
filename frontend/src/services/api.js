import axios from 'axios'

// Import auth store for syncing logout state
// Use dynamic import to avoid circular dependency issues
let authStore = null
const getAuthStore = async () => {
  if (!authStore) {
    const module = await import('../store/authStore')
    authStore = module.useAuthStore
  }
  return authStore
}

/**
 * API client for communicating with the Node.js backend
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

/**
 * Request interceptor - adds auth token to requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor - handles auth errors and formats responses
 */
api.interceptors.response.use(
  (response) => {
    // Return the data directly for convenience
    return response.data
  },
  async (error) => {
    // Extract error message from response
    const message = error.response?.data?.error ||
                    error.response?.data?.message ||
                    error.message ||
                    'An error occurred'

    // Only clear token for actual authentication failures
    // Don't clear for authorization issues like "No organization associated"
    if (error.response?.status === 401) {
      const authFailureMessages = [
        'No token provided',
        'Invalid token',
        'Token expired',
        'jwt expired',
        'jwt malformed'
      ]

      const isAuthFailure = authFailureMessages.some(msg =>
        message.toLowerCase().includes(msg.toLowerCase())
      )

      if (isAuthFailure) {
        console.log('[API] Auth failure detected, clearing token and syncing store:', message)
        localStorage.removeItem('access_token')

        // Sync with Zustand auth store
        try {
          const store = await getAuthStore()
          if (store) {
            store.getState().logout()
          }
        } catch (e) {
          console.error('[API] Failed to sync auth store:', e)
        }
      }
    }

    return Promise.reject(new Error(message))
  }
)

/**
 * Auth API endpoints
 */
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  checkEmail: (email) => api.post('/auth/check-email', { email })
}

/**
 * Profile API endpoints
 */
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  completeEmployer: (data) => api.post('/profile/complete-employer', data),
  completeCandidate: (data) => api.post('/profile/complete-candidate', data),
  checkEmail: (email) => api.post('/profile/check-email', { email }),
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadResume: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/profile/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export default api
