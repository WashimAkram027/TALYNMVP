import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'
import { env } from '../config/env.js'
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js'
import { membersService } from './members.service.js'

/**
 * Auth service - handles user authentication
 */
export const authService = {
  /**
   * Register a new user
   */
  async signup({ email, password, role = 'candidate', firstName = '', lastName = '', companyName = '', industry = '' }) {
    // Create user in Supabase Auth (without relying on trigger)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role
      }
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      console.error('Error details:', JSON.stringify(authError, null, 2))
      if (authError.message.includes('already registered')) {
        throw new ConflictError('Email already registered')
      }
      throw new BadRequestError(authError.message || 'Failed to create user')
    }

    // Manually create profile (in case trigger doesn't work)
    let profile = null

    // First check if profile was created by trigger
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (existingProfile) {
      profile = existingProfile
    } else {
      // Create profile manually
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: firstName || '',
          last_name: lastName || '',
          role: role,
          status: 'pending'
        })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Don't throw - user was created, profile creation failed
        // We can still return the user
      } else {
        profile = newProfile
      }
    }

    // For employers, create organization and link it
    let organization = null
    if (role === 'employer' && companyName) {
      // Normalize industry value to match database enum
      const normalizedIndustry = this.normalizeIndustry(industry)

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: companyName,
          email: email,
          industry: normalizedIndustry,
          owner_id: authData.user.id,
          status: 'active'
        })
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
      } else {
        organization = orgData

        // Update profile with organization_id and mark as active
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            organization_id: orgData.id,
            status: 'active',
            onboarding_completed: true
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('Profile update error:', updateError)
        } else if (profile) {
          profile.organization_id = orgData.id
          profile.status = 'active'
          profile.onboarding_completed = true
        }

        // Create owner membership record
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: orgData.id,
            profile_id: authData.user.id,
            member_role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString()
          })

        if (memberError) {
          console.error('Membership creation error:', memberError)
        }
      }
    }

    // Generate JWT
    const token = this.generateToken(authData.user.id)

    return {
      user: authData.user,
      profile,
      organization,
      token
    }
  },

  /**
   * Normalize industry string to match database enum
   */
  normalizeIndustry(industry) {
    if (!industry) return 'other'

    // Valid database enum values
    const validIndustries = [
      'mep_engineering',
      'energy_consulting',
      'building_information_modeling',
      'architectural_designs',
      'product_design',
      'engineering_analysis',
      'accounting',
      'construction_management',
      'legal_services',
      'healthcare_services',
      'it_consulting',
      'software_development',
      'office_administration',
      'other'
    ]

    const normalized = industry.toLowerCase().trim()

    // If it's already a valid enum value, return it
    if (validIndustries.includes(normalized)) {
      return normalized
    }

    // Legacy mapping for backward compatibility
    const legacyMap = {
      'technology': 'software_development',
      'tech': 'software_development',
      'finance': 'accounting',
      'financial': 'accounting',
      'healthcare': 'healthcare_services',
      'health': 'healthcare_services',
      'consulting': 'it_consulting',
      'engineering': 'mep_engineering',
      'legal': 'legal_services'
    }

    return legacyMap[normalized] || 'other'
  },

  /**
   * Login with email and password
   */
  async login({ email, password, expectedRole = null }) {
    console.log('[AuthService] Login attempt - email:', email, 'expectedRole:', expectedRole)

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('[AuthService] Auth error:', authError)
      throw new UnauthorizedError('Invalid email or password')
    }

    console.log('[AuthService] Supabase auth successful, user ID:', authData.user.id)

    // Fetch user profile with organization (using explicit foreign key)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations!fk_profiles_organization(*)
      `)
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('[AuthService] Profile fetch error:', profileError)
      console.error('[AuthService] User ID:', authData.user.id)

      // Profile should exist - if not, something went wrong during signup
      if (profileError.code === 'PGRST116') {
        throw new BadRequestError('Profile not found. Please contact support.')
      }

      throw new BadRequestError('Failed to fetch profile')
    }

    console.log('[AuthService] Profile fetched - role:', profile.role, 'email:', profile.email)

    // Validate expected role if provided
    if (expectedRole && profile.role !== expectedRole) {
      console.log('[AuthService] Role mismatch - expected:', expectedRole, 'actual:', profile.role)
      const formType = expectedRole === 'employer' ? 'Employer' : 'Candidate'
      throw new UnauthorizedError(`Please use the ${formType} login form for this account`)
    }

    console.log('[AuthService] Role validation passed')

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', authData.user.id)

    // Fetch membership if user has an organization
    let membership = null
    if (profile.organization_id) {
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('*')
        .eq('profile_id', authData.user.id)
        .eq('organization_id', profile.organization_id)
        .single()

      membership = memberData
    }

    // Fetch pending invitations for candidates without an organization
    let pendingInvitations = []
    if (!profile.organization_id && profile.email) {
      try {
        pendingInvitations = await membersService.getPendingInvitationsByEmail(profile.email)
      } catch (e) {
        console.error('[AuthService] Error fetching pending invitations:', e)
      }
    }

    // Generate JWT
    const token = this.generateToken(authData.user.id)

    console.log('[AuthService] Login successful, returning profile with role:', profile.role)

    return {
      user: authData.user,
      profile,
      organization: profile.organization,
      membership,
      pendingInvitations,
      token
    }
  },

  /**
   * Logout user
   */
  async logout(userId) {
    // Sign out from Supabase
    await supabase.auth.signOut()
    return { success: true }
  },

  /**
   * Get current user profile
   * Also includes pending invitations for candidates
   */
  async getCurrentUser(userId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations!fk_profiles_organization(*)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      throw new BadRequestError('Failed to fetch profile')
    }

    // Get membership if in organization
    let membership = null
    if (profile.organization_id) {
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('*')
        .eq('profile_id', userId)
        .eq('organization_id', profile.organization_id)
        .single()

      membership = memberData
    }

    // Get pending invitations (by email) for users not in an organization
    let pendingInvitations = []
    if (!profile.organization_id && profile.email) {
      try {
        pendingInvitations = await membersService.getPendingInvitationsByEmail(profile.email)
      } catch (e) {
        console.error('Error fetching pending invitations:', e)
        // Don't fail the whole request if invitations fetch fails
      }
    }

    return {
      user: { id: profile.id, email: profile.email },
      profile,
      organization: profile.organization,
      membership,
      pendingInvitations
    }
  },

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.frontendUrl}/reset-password`
    })

    if (error) {
      // Don't reveal if email exists
      console.error('Password reset error:', error)
    }

    return { success: true }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      throw new BadRequestError('Failed to reset password')
    }

    return { success: true }
  },

  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { userId },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    )
  },

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, env.jwtSecret)
    } catch (error) {
      throw new UnauthorizedError('Invalid token')
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(userId) {
    // Verify user still exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      throw new UnauthorizedError('User not found')
    }

    if (profile.status !== 'active') {
      throw new UnauthorizedError('Account is not active')
    }

    return {
      token: this.generateToken(userId)
    }
  },

  /**
   * Check if email is already registered
   */
  async checkEmailExists(email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    return { exists: !!profile }
  }
}
