import { supabase } from '../../config/supabase.js'
import { NotFoundError, BadRequestError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'

export const adminUsersService = {
  /**
   * List all user profiles with filters
   */
  async listUsers({ page = 1, limit = 20, search, role, status, sortBy = 'created_at', sortOrder = 'desc' }) {
    let query = supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, status, email_verified, avatar_url, organization_id, created_at, last_login_at', { count: 'exact' })

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }
    if (role) query = query.eq('role', role)
    if (status) query = query.eq('status', status)

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  },

  /**
   * Get user detail with org membership and email history
   */
  async getUserDetail(userId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations!fk_profiles_organization(id, name, email, status)
      `)
      .eq('id', userId)
      .single()

    if (error || !profile) throw new NotFoundError('User not found')

    // Get org memberships
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('id, organization_id, member_role, status, job_title, joined_at, organization:organizations!organization_members_organization_id_fkey(id, name)')
      .eq('profile_id', userId)

    // Get email log (if table exists)
    let emailHistory = []
    try {
      const { data: emails } = await supabase
        .from('email_logs')
        .select('id, email_type, status, created_at')
        .eq('recipient_email', profile.email)
        .order('created_at', { ascending: false })
        .limit(20)
      emailHistory = emails || []
    } catch {
      // email_logs table may not exist
    }

    return {
      ...profile,
      memberships: memberships || [],
      emailHistory
    }
  },

  /**
   * Suspend a user
   */
  async suspendUser(userId, adminId, reason, ip) {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, status, first_name, last_name')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) throw new NotFoundError('User not found')
    if (profile.status === 'suspended') throw new BadRequestError('User is already suspended')

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', userId)

    if (error) throw error

    await auditLogService.log(adminId, 'user_suspended', 'profile', userId, {
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
      reason
    }, ip)

    return { success: true }
  },

  /**
   * Force password reset - generates a temporary password
   */
  async forcePasswordReset(userId, adminId, ip) {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) throw new NotFoundError('User not found')

    // Generate temp password
    const crypto = await import('crypto')
    const tempPassword = crypto.randomUUID().slice(0, 16)

    // Update via Supabase auth admin API
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: tempPassword })
    if (error) throw error

    await auditLogService.log(adminId, 'password_reset_forced', 'profile', userId, {
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`
    }, ip)

    return { success: true, tempPassword }
  },

  /**
   * Manually verify a user's email
   */
  async verifyEmail(userId, adminId, ip) {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, email_verified')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) throw new NotFoundError('User not found')
    if (profile.email_verified) throw new BadRequestError('Email is already verified')

    const { error } = await supabase
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', userId)

    if (error) throw error

    // Also verify in Supabase Auth
    try {
      await supabase.auth.admin.updateUserById(userId, { email_confirm: true })
    } catch { /* ignore if fails */ }

    await auditLogService.log(adminId, 'email_manually_verified', 'profile', userId, {
      email: profile.email
    }, ip)

    return { success: true }
  },

  /**
   * Reactivate a suspended user
   */
  async reactivateUser(userId, adminId, ip) {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, status, first_name, last_name')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) throw new NotFoundError('User not found')
    if (profile.status === 'active') throw new BadRequestError('User is already active')

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId)

    if (error) throw error

    await auditLogService.log(adminId, 'user_reactivated', 'profile', userId, {
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`
    }, ip)

    return { success: true }
  },

  /**
   * Fully delete a user and all associated records
   * Only super_admin can perform this action
   */
  async deleteUser(userId, adminId, ip) {
    // 1. Fetch the user profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, organization_id')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) throw new NotFoundError('User not found')

    // 2. Check if user owns an organization (fk_organizations_owner is RESTRICT)
    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('owner_id', userId)

    if (ownedOrgs && ownedOrgs.length > 0) {
      throw new BadRequestError(
        `Cannot delete user: they own organization "${ownedOrgs[0].name}". Transfer organization ownership first.`
      )
    }

    // 3. Delete organization_members linked by invitation_email (non-FK, would be orphaned)
    const { data: emailMembers } = await supabase
      .from('organization_members')
      .select('id')
      .eq('invitation_email', profile.email)
      .is('profile_id', null)

    let emailMembersDeleted = 0
    if (emailMembers && emailMembers.length > 0) {
      const { error: emailDeleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('invitation_email', profile.email)
        .is('profile_id', null)

      if (emailDeleteError) throw emailDeleteError
      emailMembersDeleted = emailMembers.length
    }

    // 4. Count FK-linked organization_members (these cascade via profile_id FK)
    const { data: fkMembers } = await supabase
      .from('organization_members')
      .select('id')
      .eq('profile_id', userId)

    const fkMembersCount = fkMembers?.length || 0

    // 5. Delete the profile row (cascades to auth.users via trigger, and to FK-linked records)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteError) throw deleteError

    // 6. Log the deletion to audit trail
    const deletedSummary = {
      email: profile.email,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      role: profile.role,
      fkMembershipsDeleted: fkMembersCount,
      emailMembershipsDeleted: emailMembersDeleted
    }

    await auditLogService.log(adminId, 'user_deleted', 'profile', userId, deletedSummary, ip)

    return {
      deletedUser: {
        id: userId,
        email: profile.email,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      },
      deletedRecords: {
        profile: 1,
        authUser: 1,
        membershipsByProfileId: fkMembersCount,
        membershipsByEmail: emailMembersDeleted
      }
    }
  },

  /**
   * Update a user's profile fields
   */
  async updateUser(userId, updates, adminId, ip) {
    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'status']
    const filteredUpdates = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new BadRequestError('No valid fields to update')
    }

    // Verify user exists
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) throw new NotFoundError('User not found')

    // Update profile
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    // Sync email change to Supabase Auth if email was updated
    if (filteredUpdates.email && filteredUpdates.email !== profile.email) {
      try {
        await supabase.auth.admin.updateUserById(userId, { email: filteredUpdates.email })
      } catch { /* ignore auth sync failure */ }
    }

    await auditLogService.log(adminId, 'user_updated', 'profile', userId, {
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
      changes: filteredUpdates
    }, ip)

    return updated
  }
}
