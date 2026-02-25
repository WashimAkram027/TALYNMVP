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

// Flag to prevent logout loop - when true, we're already logging out
let isLoggingOut = false

// Public endpoints that don't need auth headers
const publicEndpoints = [
  '/auth/verify-email',
  '/auth/login',
  '/auth/signup',
  '/auth/check-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/resend-verification'
]

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
 * Skips auth header for public endpoints to avoid stale token issues
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')

    // Check if this is a public endpoint that shouldn't send auth header
    const isPublicEndpoint = publicEndpoints.some(ep => config.url?.includes(ep))

    if (token && !isPublicEndpoint) {
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
 * Includes loop prevention for logout scenarios
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
    // Also skip if we're already in the process of logging out (prevents infinite loop)
    if (error.response?.status === 401 && !isLoggingOut) {
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

        // Sync with Zustand auth store (with loop prevention)
        isLoggingOut = true
        try {
          const store = await getAuthStore()
          if (store) {
            await store.getState().logout()
          }
        } catch (e) {
          console.error('[API] Failed to sync auth store:', e)
        } finally {
          isLoggingOut = false
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
  changePassword: (data) => api.post('/auth/change-password', data),
  checkEmail: (email) => api.post('/auth/check-email', { email }),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email })
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

/**
 * Onboarding API endpoints
 */
export const onboardingAPI = {
  completeProfile: (data) => api.post('/onboarding/employer/profile', data),
  selectService: (data) => api.post('/onboarding/employer/service', data),
  getStatus: () => api.get('/onboarding/employer/status')
}

export default api
