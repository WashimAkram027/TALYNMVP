import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { supabase } from '../config/supabase.js'
import { env } from '../config/env.js'
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js'
import { membersService } from './members.service.js'
import { emailService } from './email.service.js'

/**
 * Auth service - handles user authentication
 */
export const authService = {
  /**
   * Register a new user
   * Now requires email verification before login
   */
  async signup({ email, password, role = 'candidate', firstName = '', lastName = '', companyName = '', industry = '' }) {
    // Create user in Supabase Auth (email NOT confirmed - requires verification)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Changed: user must verify email
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
      // Create profile manually with email_verified = false
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: firstName || '',
          last_name: lastName || '',
          role: role,
          status: 'pending',
          email_verified: false
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

        // Update profile with organization_id (but status stays pending until verified)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            organization_id: orgData.id,
            onboarding_completed: true
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('Profile update error:', updateError)
        } else if (profile) {
          profile.organization_id = orgData.id
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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // Store verification token
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: authData.user.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      })

    if (tokenError) {
      console.error('[AuthService] Failed to store verification token:', tokenError)
    }

    // Send verification email (don't block on failure)
    try {
      await emailService.sendVerificationEmail(email, verificationToken, firstName)
    } catch (emailError) {
      console.error('[AuthService] Failed to send verification email:', emailError)
      // Don't throw - account was created, email just failed
    }

    // Don't generate JWT - user must verify email first
    return {
      user: authData.user,
      profile,
      organization,
      token: null, // No token until verified
      requiresVerification: true
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    // Hash the incoming token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find the token in database
    const { data: verifyRecord, error: fetchError } = await supabase
      .from('email_verification_tokens')
      .select('id, user_id, expires_at, verified_at')
      .eq('token_hash', tokenHash)
      .single()

    if (fetchError || !verifyRecord) {
      throw new BadRequestError('Invalid or expired verification link')
    }

    // Check if already verified - return success instead of error
    // This handles duplicate requests gracefully (e.g., user clicking link twice)
    if (verifyRecord.verified_at) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', verifyRecord.user_id)
        .single()

      return {
        alreadyVerified: true,
        role: profile?.role || 'candidate'
      }
    }

    // Check if token is expired
    if (new Date(verifyRecord.expires_at) < new Date()) {
      throw new BadRequestError('Verification link has expired. Please request a new one.')
    }

    // Get profile to determine role and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, organization:organizations!fk_profiles_organization(*)')
      .eq('id', verifyRecord.user_id)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('User not found')
    }

    // Mark profile as verified and active
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        status: 'active'
      })
      .eq('id', verifyRecord.user_id)

    if (updateError) {
      console.error('[AuthService] Failed to update profile:', updateError)
      throw new BadRequestError('Failed to verify email')
    }

    // Confirm email in Supabase Auth
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      verifyRecord.user_id,
      { email_confirm: true }
    )

    if (authUpdateError) {
      console.error('[AuthService] Failed to confirm email in auth:', authUpdateError)
    }

    // Mark token as used
    await supabase
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verifyRecord.id)

    // Send welcome email based on role (don't block on failure)
    try {
      if (profile.role === 'employer') {
        await emailService.sendWelcomeEmployerEmail(
          profile.email,
          profile.first_name,
          profile.organization?.name || 'your company'
        )
      } else {
        await emailService.sendWelcomeCandidateEmail(
          profile.email,
          profile.first_name
        )
      }
    } catch (emailError) {
      console.error('[AuthService] Failed to send welcome email:', emailError)
    }

    return { success: true, role: profile.role }
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, email, email_verified')
      .eq('email', email.toLowerCase())
      .single()

    // Always return success to not reveal if email exists
    if (!profile) {
      console.log('[AuthService] Resend verification requested for non-existent email:', email)
      return { success: true }
    }

    // Check if already verified
    if (profile.email_verified) {
      throw new BadRequestError('Email is already verified. Please log in.')
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // Store new verification token
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: profile.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      })

    if (tokenError) {
      console.error('[AuthService] Failed to store verification token:', tokenError)
      return { success: true }
    }

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationToken, profile.first_name)
    } catch (emailError) {
      console.error('[AuthService] Failed to send verification email:', emailError)
    }

    return { success: true }
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

    // Check if email is verified
    if (profile.email_verified === false) {
      console.log('[AuthService] Email not verified for:', profile.email)
      throw new UnauthorizedError('EMAIL_NOT_VERIFIED')
    }

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
   * Request password reset - generates token, stores hash, sends email
   */
  async forgotPassword(email) {
    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('email', email.toLowerCase())
      .single()

    // Always return success to not reveal if email exists
    if (!profile) {
      console.log('[AuthService] Password reset requested for non-existent email:', email)
      return { success: true }
    }

    // Generate random token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex')

    // Hash the token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Set expiry to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Store the token hash in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      })

    if (insertError) {
      console.error('[AuthService] Failed to store reset token:', insertError)
      // Don't reveal the error to the user
      return { success: true }
    }

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        profile.email,
        token,
        profile.first_name
      )
    } catch (emailError) {
      console.error('[AuthService] Failed to send reset email:', emailError)
      // Don't reveal the error to the user
    }

    return { success: true }
  },

  /**
   * Reset password with token - validates token and updates password
   */
  async resetPassword(token, newPassword) {
    // Hash the incoming token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find the token in database
    const { data: resetRecord, error: fetchError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .single()

    if (fetchError || !resetRecord) {
      throw new BadRequestError('Invalid or expired reset token')
    }

    // Check if token was already used
    if (resetRecord.used_at) {
      throw new BadRequestError('This reset link has already been used')
    }

    // Check if token is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      throw new BadRequestError('This reset link has expired')
    }

    // Update the user's password via Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetRecord.user_id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('[AuthService] Failed to update password:', updateError)
      throw new BadRequestError('Failed to reset password')
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetRecord.id)

    return { success: true }
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user's email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('User not found')
    }

    // Verify current password by attempting to sign in
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword
    })

    if (authError) {
      throw new UnauthorizedError('Current password is incorrect')
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('[AuthService] Failed to change password:', updateError)
      throw new BadRequestError('Failed to change password')
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
