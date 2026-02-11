import { create } from 'zustand'
import { authAPI, profileAPI } from '../services/api'
import { invitationsService } from '../services/invitationsService'

/**
 * Check if a JWT token is expired
 * @param {string} token - The JWT token to check
 * @returns {boolean} - True if token is expired or invalid
 */
const isTokenExpired = (token) => {
  if (!token) return true

  try {
    // JWT structure: header.payload.signature
    const payload = JSON.parse(atob(token.split('.')[1]))

    // exp is in seconds, Date.now() is in milliseconds
    const expiryTime = payload.exp * 1000

    // Add 30 second buffer to avoid edge cases
    const isExpired = expiryTime < (Date.now() + 30000)

    return isExpired
  } catch {
    return true // Treat invalid tokens as expired
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  organization: null,
  membership: null,
  pendingInvitations: [],
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // Fetch current user and profile from API
  fetchProfile: async () => {
    try {
      const response = await authAPI.me()
      if (response.success && response.data) {
        const { user, profile, organization, membership, pendingInvitations } = response.data
        set({
          user,
          profile,
          organization: organization || null,
          membership: membership || null,
          pendingInvitations: pendingInvitations || []
        })
        return profile
      }
      return null
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  },

  signUp: async (email, password, metadata = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authAPI.signup({ email, password, ...metadata })

      if (response.success) {
        // Store the JWT token
        localStorage.setItem('access_token', response.data.token)

        set({
          user: response.data.user,
          profile: response.data.profile,
          isAuthenticated: true,
          isLoading: false
        })

        // Fetch full profile including pending invitations
        await get().fetchProfile()

        return { success: true, user: response.data.user }
      } else {
        throw new Error(response.error || 'Signup failed')
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  login: async (email, password, expectedRole = null) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authAPI.login({ email, password, expectedRole })

      if (response.success) {
        const token = response.data.token
        if (token) {
          localStorage.setItem('access_token', token)
        }

        const profile = response.data.profile

        set({
          user: response.data.user,
          profile: profile,
          organization: response.data.organization || null,
          membership: response.data.membership || null,
          pendingInvitations: response.data.pendingInvitations || [],
          isAuthenticated: true,
          isLoading: false
        })

        return { success: true, user: response.data.user, profile: profile }
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  logout: async () => {
    // Get token before clearing anything
    const token = localStorage.getItem('access_token')

    // Clear local state FIRST to prevent any race conditions
    localStorage.removeItem('access_token')
    set({
      user: null,
      profile: null,
      organization: null,
      membership: null,
      pendingInvitations: [],
      isAuthenticated: false,
      isLoading: false,
      error: null
    })

    // Only call API logout if we had a valid token
    // This is a best-effort call - we've already logged out locally
    if (token) {
      try {
        await authAPI.logout()
      } catch (error) {
        // Ignore errors - we're logged out locally already
        // This prevents loops when the logout API fails with 401
        console.warn('Logout API call failed (ignored):', error.message)
      }
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token')

    // No token - clear auth state
    if (!token) {
      set({
        user: null,
        profile: null,
        organization: null,
        membership: null,
        isAuthenticated: false,
        isLoading: false
      })
      return
    }

    // Check if token is expired before making API call
    if (isTokenExpired(token)) {
      localStorage.removeItem('access_token')
      set({
        user: null,
        profile: null,
        organization: null,
        membership: null,
        isAuthenticated: false,
        isLoading: false
      })
      return
    }

    set({ isLoading: true })
    try {
      const response = await authAPI.me()

      if (response.success && response.data) {
        const { user, profile, organization, membership, pendingInvitations } = response.data
        set({
          user,
          profile,
          organization: organization || null,
          membership: membership || null,
          pendingInvitations: pendingInvitations || [],
          isAuthenticated: true,
          isLoading: false
        })
      } else {
        localStorage.removeItem('access_token')
        set({
          user: null,
          profile: null,
          organization: null,
          membership: null,
          isAuthenticated: false,
          isLoading: false
        })
      }
    } catch {
      localStorage.removeItem('access_token')
      set({
        user: null,
        profile: null,
        organization: null,
        membership: null,
        isAuthenticated: false,
        isLoading: false
      })
    }
  },

  // Complete employer signup flow
  completeEmployerSignup: async (firstName, lastName, industry, industryOther = null) => {
    set({ isLoading: true, error: null })
    try {
      const response = await profileAPI.completeEmployer({
        firstName,
        lastName,
        industry,
        industryOther
      })

      if (response.success) {
        // Refresh profile data
        await get().fetchProfile()
        set({ isLoading: false })
        return { success: true, data: response.data }
      } else {
        throw new Error(response.error || 'Failed to complete employer signup')
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  // Complete candidate signup flow
  completeCandidateSignup: async (firstName, lastName, resumeUrl = null, resumeFilename = null, linkedinUrl = null) => {
    set({ isLoading: true, error: null })
    try {
      const response = await profileAPI.completeCandidate({
        firstName,
        lastName,
        resumeUrl,
        resumeFilename,
        linkedinUrl
      })

      if (response.success) {
        // Refresh profile data
        await get().fetchProfile()
        set({ isLoading: false })
        return { success: true, data: response.data }
      } else {
        throw new Error(response.error || 'Failed to complete candidate signup')
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  // Update profile
  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await profileAPI.update(data)

      if (response.success) {
        set({
          profile: response.data,
          isLoading: false
        })
        return { success: true, data: response.data }
      } else {
        throw new Error(response.error || 'Failed to update profile')
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  // Accept an invitation and join an organization
  acceptInvitation: async (memberId) => {
    set({ isLoading: true, error: null })
    try {
      // invitationsService.accept returns { membership, organization } directly
      // (axios interceptor already unwraps response.data)
      const result = await invitationsService.accept(memberId)

      if (result && result.membership) {
        const { membership, organization } = result

        // Update profile with new organization
        const currentProfile = get().profile
        const updatedProfile = {
          ...currentProfile,
          organization_id: organization?.id
        }

        set({
          profile: updatedProfile,
          organization: organization || null,
          membership: membership || null,
          pendingInvitations: [], // Clear pending invitations
          isLoading: false
        })

        return { success: true, data: result }
      }

      throw new Error('Failed to accept invitation')
    } catch (error) {
      console.error('[AuthStore] Accept invitation error:', error)

      // If invitation was already accepted, treat as success
      if (error.message?.includes('already accepted')) {
        set({ pendingInvitations: [], isLoading: false })
        return { success: true, alreadyAccepted: true }
      }

      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  // Decline an invitation
  declineInvitation: async (memberId) => {
    set({ isLoading: true, error: null })
    try {
      await invitationsService.decline(memberId)

      // Remove the declined invitation from the list
      const currentInvitations = get().pendingInvitations
      const updatedInvitations = currentInvitations.filter(inv => inv.memberId !== memberId)

      set({
        pendingInvitations: updatedInvitations,
        isLoading: false
      })

      return { success: true }
    } catch (error) {
      console.error('[AuthStore] Decline invitation error:', error)
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  // For testing without API - manually toggle auth state
  toggleAuth: () => set((state) => ({
    isAuthenticated: !state.isAuthenticated,
    user: state.isAuthenticated ? null : { email: 'test@example.com', id: 'test-user-id' },
    profile: state.isAuthenticated ? null : {
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'employer'
    }
  }))
}))
