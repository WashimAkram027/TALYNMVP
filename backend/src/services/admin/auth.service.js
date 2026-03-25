import jwt from 'jsonwebtoken'
import { supabase, supabaseAuth } from '../../config/supabase.js'
import { env } from '../../config/env.js'
import { UnauthorizedError, BadRequestError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'

/**
 * Admin auth service
 */
export const adminAuthService = {
  /**
   * Admin login - authenticates and verifies admin_roles entry
   */
  async login(email, password, ip = null) {
    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      throw new UnauthorizedError('Invalid email or password')
    }

    // Verify profile exists and has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, avatar_url')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      throw new UnauthorizedError('Profile not found')
    }

    if (profile.role !== 'admin') {
      throw new UnauthorizedError('Not an admin account')
    }

    // Verify admin_roles entry exists and is active
    const { data: adminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('id, role, is_active')
      .eq('profile_id', authData.user.id)
      .single()

    if (roleError || !adminRole) {
      throw new UnauthorizedError('Admin role not assigned')
    }

    if (!adminRole.is_active) {
      throw new UnauthorizedError('Admin account is deactivated')
    }

    // Generate JWT with isAdmin claim
    const token = jwt.sign(
      {
        userId: authData.user.id,
        isAdmin: true,
        adminRole: adminRole.role
      },
      env.jwtSecret,
      { expiresIn: '8h' }
    )

    // Log the login
    await auditLogService.log(
      authData.user.id,
      'admin_login',
      'profile',
      authData.user.id,
      { email },
      ip
    )

    return {
      token,
      admin: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        avatarUrl: profile.avatar_url,
        adminRole: adminRole.role
      }
    }
  },

  /**
   * Get current admin info (for /me endpoint)
   */
  async getMe(adminId) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, avatar_url')
      .eq('id', adminId)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('Profile not found')
    }

    const { data: adminRole } = await supabase
      .from('admin_roles')
      .select('id, role, is_active, created_at')
      .eq('profile_id', adminId)
      .single()

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      avatarUrl: profile.avatar_url,
      adminRole: adminRole?.role,
      isActive: adminRole?.is_active,
      adminSince: adminRole?.created_at
    }
  }
}
