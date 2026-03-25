import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { unauthorizedResponse, forbiddenResponse } from '../utils/response.js'

/**
 * Admin JWT authentication middleware
 * Verifies the token has isAdmin claim and looks up admin_roles
 */
export async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'No token provided')
    }

    const token = authHeader.split(' ')[1]

    let decoded
    try {
      decoded = jwt.verify(token, env.jwtSecret)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorizedResponse(res, 'Token expired')
      }
      return unauthorizedResponse(res, 'Invalid token')
    }

    // Must have isAdmin claim
    if (!decoded.isAdmin) {
      return unauthorizedResponse(res, 'Not an admin token')
    }

    // Look up admin_roles entry
    const { data: adminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('id, profile_id, role, is_active')
      .eq('profile_id', decoded.userId)
      .single()

    if (roleError || !adminRole) {
      return unauthorizedResponse(res, 'Admin role not found')
    }

    if (!adminRole.is_active) {
      return unauthorizedResponse(res, 'Admin account is deactivated')
    }

    // Fetch admin profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('id', decoded.userId)
      .single()

    if (profileError || !profile) {
      return unauthorizedResponse(res, 'Admin profile not found')
    }

    // Attach admin info to request
    req.admin = {
      id: profile.id,
      email: profile.email,
      adminRole: adminRole.role,
      adminRoleId: adminRole.id,
      profile
    }

    next()
  } catch (error) {
    console.error('Admin auth middleware error:', error)
    return unauthorizedResponse(res, 'Authentication failed')
  }
}

/**
 * Require specific admin role(s)
 */
export function requireAdminRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) {
      return unauthorizedResponse(res, 'Not authenticated as admin')
    }

    if (!roles.includes(req.admin.adminRole)) {
      return forbiddenResponse(res, 'Insufficient admin permissions')
    }

    next()
  }
}
