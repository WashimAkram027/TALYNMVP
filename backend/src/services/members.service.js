import { supabase } from '../config/supabase.js'
import { emailService } from './email.service.js'

/**
 * Members Service
 * Handles all organization member-related database operations
 */
export const membersService = {
  /**
   * Get all members of an organization with optional filters
   */
  async getAll(orgId, filters = {}) {
    let query = supabase
      .from('organization_members')
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(id, full_name, first_name, last_name, email, phone, avatar_url)
      `)
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false, nullsFirst: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.memberRole) {
      query = query.eq('member_role', filters.memberRole)
    }

    if (filters.department) {
      query = query.eq('department', filters.department)
    }

    if (filters.employmentType) {
      query = query.eq('employment_type', filters.employmentType)
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`
      query = query.or(`invitation_email.ilike.${pattern},job_title.ilike.${pattern},department.ilike.${pattern}`)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  },

  /**
   * Get a single member by ID with full details
   */
  async getById(memberId, orgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(id, email, first_name, last_name, full_name, avatar_url, role, status),
        invited_by_profile:profiles!organization_members_invited_by_fkey(id, full_name, email)
      `)
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get member by profile ID
   */
  async getByProfileId(profileId, orgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(*),
        organization:organizations(id, name, logo_url, industry)
      `)
      .eq('profile_id', profileId)
      .eq('organization_id', orgId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Invite a new member to the organization
   * MVP Flow: Allows invitation by email before user signs up
   * - If profile exists: links profile_id
   * - If profile doesn't exist: stores invitation_email (profile_id = null)
   */
  async invite(orgId, invitedBy, memberData) {
    const email = memberData.email.toLowerCase().trim()

    // Check if profile exists for this email
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('email', email)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError
    }

    // If profile exists, check if already a member of this org
    if (existingProfile) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('organization_id', orgId)
        .eq('profile_id', existingProfile.id)
        .single()

      if (existingMember) {
        throw new Error('User is already a member of this organization')
      }
    }

    // Also check by invitation_email (for re-invites before user signs up)
    const { data: existingInvite } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('invitation_email', email)
      .single()

    if (existingInvite) {
      throw new Error('An invitation has already been sent to this email')
    }

    // Create membership (profile_id is null if user hasn't signed up yet)
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        profile_id: existingProfile?.id || null,
        invitation_email: email,
        member_role: memberData.memberRole || 'employee',
        job_title: memberData.jobTitle,
        department: memberData.department,
        employment_type: memberData.employmentType || 'full_time',
        salary_amount: memberData.salaryAmount,
        salary_currency: memberData.salaryCurrency || 'NPR',
        pay_frequency: memberData.payFrequency || 'monthly',
        location: memberData.location || null,
        start_date: memberData.startDate || null,
        job_description: memberData.jobDescription || null,
        probation_period: memberData.probationPeriod ? parseInt(memberData.probationPeriod) : null,
        status: 'invited',
        invited_by: invitedBy,
        invited_at: new Date().toISOString()
      })
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Send invitation email
    try {
      // Get inviter and org info for email
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name')
        .eq('id', invitedBy)
        .single()

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()

      const inviterName = inviterProfile?.full_name ||
        `${inviterProfile?.first_name || ''} ${inviterProfile?.last_name || ''}`.trim() ||
        'Someone'

      await emailService.sendInvitationEmail(
        email,
        inviterName,
        org?.name || 'an organization',
        memberData.jobTitle
      )
    } catch (emailError) {
      console.error('[MembersService] Failed to send invitation email:', emailError)
      // Don't throw - invitation was created, email just failed
    }

    return data
  },

  /**
   * Update member details
   */
  async update(memberId, orgId, updates) {
    const allowedFields = [
      'member_role',
      'job_title',
      'department',
      'employment_type',
      'salary_amount',
      'salary_currency',
      'pay_frequency',
      'location',
      'start_date',
      'job_description',
      'probation_period',
      'status'
    ]

    const filteredUpdates = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    const { data, error } = await supabase
      .from('organization_members')
      .update(filteredUpdates)
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Activate an invited member
   */
  async activate(memberId, orgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .eq('status', 'invited')
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Offboard a member
   */
  async offboard(memberId, orgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .update({
        status: 'offboarded',
        offboarded_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a member (only for invited status)
   */
  async delete(memberId, orgId) {
    // First check if member is in invited status
    const { data: member } = await supabase
      .from('organization_members')
      .select('status')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (!member) {
      throw new Error('Member not found')
    }

    if (member.status !== 'invited') {
      throw new Error('Only invited members can be deleted. Use offboard for active members.')
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', orgId)

    if (error) throw error
    return { success: true }
  },

  /**
   * Get available candidates (not hired by any organization)
   */
  async getAvailableCandidates() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, email, avatar_url, linkedin_url, resume_url, created_at')
      .eq('role', 'candidate')
      .is('organization_id', null)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get member statistics for an organization
   */
  async getStats(orgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('status, member_role, department, employment_type')
      .eq('organization_id', orgId)

    if (error) throw error

    const stats = {
      total: data.length,
      byStatus: {
        active: data.filter(m => m.status === 'active').length,
        invited: data.filter(m => m.status === 'invited').length,
        inactive: data.filter(m => m.status === 'inactive').length,
        offboarded: data.filter(m => m.status === 'offboarded').length
      },
      byRole: {},
      byDepartment: {},
      byEmploymentType: {}
    }

    // Count by role
    data.forEach(m => {
      if (m.member_role) {
        stats.byRole[m.member_role] = (stats.byRole[m.member_role] || 0) + 1
      }
      if (m.department) {
        stats.byDepartment[m.department] = (stats.byDepartment[m.department] || 0) + 1
      }
      if (m.employment_type) {
        stats.byEmploymentType[m.employment_type] = (stats.byEmploymentType[m.employment_type] || 0) + 1
      }
    })

    return stats
  },

  // ======================
  // INVITATION METHODS
  // ======================

  /**
   * Get pending invitations for a user by email
   * Called when a user logs in to check if they have invitations
   */
  async getPendingInvitationsByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim()

    // Find invitations by email (invitation_email column)
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        job_title,
        department,
        member_role,
        employment_type,
        salary_amount,
        salary_currency,
        invited_at,
        organization:organizations!organization_members_organization_id_fkey(id, name, logo_url, industry)
      `)
      .eq('invitation_email', normalizedEmail)
      .eq('status', 'invited')
      .order('invited_at', { ascending: false })

    if (error) throw error

    // Format for frontend
    return (data || []).map(invite => ({
      memberId: invite.id,
      organizationId: invite.organization_id,
      organizationName: invite.organization?.name,
      organizationLogo: invite.organization?.logo_url,
      industry: invite.organization?.industry,
      jobTitle: invite.job_title,
      department: invite.department,
      memberRole: invite.member_role,
      employmentType: invite.employment_type,
      salary: invite.salary_amount ? `${invite.salary_currency} ${invite.salary_amount}` : null,
      invitedAt: invite.invited_at
    }))
  },

  /**
   * Accept an invitation
   * Links the profile to the membership and activates it
   */
  async acceptInvitation(memberId, profileId) {
    // Get the invitation to verify it exists and is pending
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_members')
      .select('*, organization:organizations!organization_members_organization_id_fkey(id, name)')
      .eq('id', memberId)
      .eq('status', 'invited')
      .single()

    if (inviteError || !invitation) {
      throw new Error('Invitation not found or already accepted')
    }

    // Verify the email matches
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    if (profile.email.toLowerCase() !== invitation.invitation_email?.toLowerCase()) {
      throw new Error('This invitation was sent to a different email address')
    }

    // Update the membership: link profile and activate
    const { data: updatedMember, error: updateError } = await supabase
      .from('organization_members')
      .update({
        profile_id: profileId,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select(`
        *,
        organization:organizations!organization_members_organization_id_fkey(*)
      `)
      .single()

    if (updateError) throw updateError

    // Update the profile's organization_id
    await supabase
      .from('profiles')
      .update({
        organization_id: invitation.organization_id,
        status: 'active'
      })
      .eq('id', profileId)

    // Send notification email to the inviter/employer
    try {
      // Get inviter info
      if (invitation.invited_by) {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('email, first_name')
          .eq('id', invitation.invited_by)
          .single()

        // Get accepted user's full name
        const { data: acceptedProfile } = await supabase
          .from('profiles')
          .select('full_name, first_name, last_name')
          .eq('id', profileId)
          .single()

        const candidateName = acceptedProfile?.full_name ||
          `${acceptedProfile?.first_name || ''} ${acceptedProfile?.last_name || ''}`.trim() ||
          profile.email

        if (inviterProfile?.email) {
          await emailService.sendInvitationAcceptedEmail(
            inviterProfile.email,
            inviterProfile.first_name,
            candidateName,
            invitation.organization?.name || 'your organization'
          )
        }
      }
    } catch (emailError) {
      console.error('[MembersService] Failed to send acceptance notification:', emailError)
      // Don't throw - acceptance was successful, email just failed
    }

    return {
      membership: updatedMember,
      organization: updatedMember.organization
    }
  },

  /**
   * Decline an invitation
   */
  async declineInvitation(memberId, profileId) {
    // Get the invitation to verify it exists (include invited_by for notification)
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_members')
      .select(`
        invitation_email,
        invited_by,
        organization_id,
        organization:organizations!organization_members_organization_id_fkey(name)
      `)
      .eq('id', memberId)
      .eq('status', 'invited')
      .single()

    if (inviteError || !invitation) {
      throw new Error('Invitation not found or already processed')
    }

    // Verify the email matches
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .single()

    if (profile?.email.toLowerCase() !== invitation.invitation_email?.toLowerCase()) {
      throw new Error('This invitation was sent to a different email address')
    }

    // Delete the invitation (or could mark as 'declined' status if we want to track)
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) throw deleteError

    // Send notification email to the inviter/employer
    try {
      if (invitation.invited_by) {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('email, first_name')
          .eq('id', invitation.invited_by)
          .single()

        if (inviterProfile?.email) {
          await emailService.sendInvitationDeclinedEmail(
            inviterProfile.email,
            inviterProfile.first_name,
            invitation.invitation_email,
            invitation.organization?.name || 'your organization'
          )
        }
      }
    } catch (emailError) {
      console.error('[MembersService] Failed to send decline notification:', emailError)
      // Don't throw - decline was successful, email just failed
    }

    return { success: true }
  },

  /**
   * Resend an invitation (for employers)
   * Resets the invited_at timestamp
   */
  async resendInvitation(memberId, orgId, resenderId) {
    const { data, error } = await supabase
      .from('organization_members')
      .update({
        invited_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .eq('status', 'invited')
      .select()
      .single()

    if (error) throw error

    // Send invitation email
    try {
      // Get resender and org info for email
      const { data: resenderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name')
        .eq('id', resenderId)
        .single()

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()

      const resenderName = resenderProfile?.full_name ||
        `${resenderProfile?.first_name || ''} ${resenderProfile?.last_name || ''}`.trim() ||
        'Someone'

      await emailService.sendInvitationEmail(
        data.invitation_email,
        resenderName,
        org?.name || 'an organization',
        data.job_title
      )
    } catch (emailError) {
      console.error('[MembersService] Failed to send invitation email:', emailError)
      // Don't throw - invitation was updated, email just failed
    }

    return data
  }
}
