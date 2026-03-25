import { create } from 'zustand'
import api from '../services/api.js'

const useAdminAuthStore = create((set, get) => ({
  admin: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.post('/admin/auth/login', { email, password })
      const { token, admin } = data.data
      localStorage.setItem('admin_access_token', token)
      set({ admin, isAuthenticated: true, isLoading: false, error: null })
      return admin
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  logout: () => {
    localStorage.removeItem('admin_access_token')
    set({ admin: null, isAuthenticated: false, error: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      set({ isAuthenticated: false, isLoading: false, admin: null })
      return
    }

    try {
      const { data } = await api.get('/admin/auth/me')
      set({ admin: data.data, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem('admin_access_token')
      set({ admin: null, isAuthenticated: false, isLoading: false })
    }
  }
}))

export default useAdminAuthStore
