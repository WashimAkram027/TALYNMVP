import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { unauthorizedResponse } from '../utils/response.js'

/**
 * JWT authentication middleware
 * Verifies the token and attaches user info to request
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'No token provided')
    }

    const token = authHeader.split(' ')[1]

    // Verify JWT
    let decoded
    try {
      decoded = jwt.verify(token, env.jwtSecret)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorizedResponse(res, 'Token expired')
      }
      return unauthorizedResponse(res, 'Invalid token')
    }

    // Get user from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations!fk_profiles_organization(*)
      `)
      .eq('id', decoded.userId)
      .single()

    if (error || !profile) {
      return unauthorizedResponse(res, 'User not found')
    }

    // Attach user to request
    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      organizationId: profile.organization_id,
      profile,
      organization: profile.organization
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return unauthorizedResponse(res, 'Authentication failed')
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null
      return next()
    }

    const token = authHeader.split(' ')[1]

    try {
      const decoded = jwt.verify(token, env.jwtSecret)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, organization:organizations!fk_profiles_organization(*)')
        .eq('id', decoded.userId)
        .single()

      if (profile) {
        req.user = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          status: profile.status,
          organizationId: profile.organization_id,
          profile,
          organization: profile.organization
        }
      }
    } catch {
      req.user = null
    }

    next()
  } catch (error) {
    req.user = null
    next()
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Not authenticated')
    }

    if (!roles.includes(req.user.role)) {
      return unauthorizedResponse(res, 'Insufficient permissions')
    }

    next()
  }
}

/**
 * Require employer role
 */
export function requireEmployer(req, res, next) {
  if (!req.user) {
    return unauthorizedResponse(res, 'Not authenticated')
  }

  if (req.user.role !== 'employer') {
    return unauthorizedResponse(res, 'Employer access required')
  }

  next()
}

/**
 * Require organization membership
 */
export function requireOrganization(req, res, next) {
  if (!req.user) {
    return unauthorizedResponse(res, 'Not authenticated')
  }

  if (!req.user.organizationId) {
    return unauthorizedResponse(res, 'No organization associated')
  }

  next()
}
