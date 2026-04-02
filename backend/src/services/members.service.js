import { supabase } from '../config/supabase.js'
import { emailService } from './email.service.js'
import { notificationService } from './notification.service.js'

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
      .neq('member_role', 'authorized_user')
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
      query = query.or(`invitation_email.ilike.${pattern},job_title.ilike.${pattern},department.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    }

    const { data, error } = await query

    if (error) throw error

    // Auto-activate: if status is 'onboarding' and start_date <= today, update to 'active'
    const today = new Date().toISOString().split('T')[0]
    const toActivate = (data || []).filter(
      m => m.status === 'onboarding' && m.start_date && m.start_date <= today
    )

    if (toActivate.length > 0) {
      const ids = toActivate.map(m => m.id)
      await supabase
        .from('organization_members')
        .update({ status: 'active' })
        .in('id', ids)

      // Update the returned data in place
      toActivate.forEach(m => { m.status = 'active' })
    }

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
        first_name: memberData.firstName || null,
        last_name: memberData.lastName || null,
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
      'first_name',
      'last_name',
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
      'status',
      'quote_id'
    ]

    const filteredUpdates = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    // When employer updates offer-related fields, clear the employee's change request
    // so the employee can re-review the updated offer
    const offerFields = ['salary_amount', 'job_title', 'job_description']
    const isOfferUpdate = offerFields.some(f => filteredUpdates[f] !== undefined)

    // Fetch existing member BEFORE update to check if this is a response to a change request
    let existingMember = null
    if (isOfferUpdate) {
      filteredUpdates.quote_dispute_note = null
      filteredUpdates.quote_verified = false

      const { data: existing } = await supabase
        .from('organization_members')
        .select('invitation_email, first_name, quote_dispute_note, job_title, salary_amount, salary_currency')
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .single()
      existingMember = existing
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

    // If this update is a response to a change request, notify the employee
    if (isOfferUpdate && existingMember?.quote_dispute_note) {
      try {
        const employeeEmail = existingMember.invitation_email || data.profile?.email
        if (employeeEmail) {
          // Get employer/org info
          const [{ data: org }, { data: employer }] = await Promise.all([
            supabase.from('organizations').select('name').eq('id', orgId).single(),
            supabase.from('profiles').select('first_name, full_name').eq('organization_id', orgId).eq('role', 'employer').limit(1).single()
          ])

          const employerName = employer?.first_name || employer?.full_name || 'Your employer'
          const orgName = org?.name || 'your organization'

          await emailService.sendOfferUpdatedEmail(
            employeeEmail,
            existingMember.first_name || data.first_name,
            employerName,
            orgName,
            data.job_title,
            data.salary_amount,
            data.salary_currency
          )
        }
      } catch (emailErr) {
        console.error('[MembersService] Failed to send offer updated email:', emailErr)
        // Don't throw - member was updated, email just failed
      }
    }

    return data
  },

  /**
   * Activate a member (from invited or onboarding status)
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
      .in('status', ['invited', 'onboarding'])
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // In-app notification for the activated employee (non-blocking)
    try {
      if (data?.profile_id) {
        await notificationService.create({
          recipientId: data.profile_id,
          organizationId: orgId,
          type: 'member_activated',
          title: 'Account activated',
          message: 'Your account has been activated by your employer',
          actionUrl: '/employee/overview',
          metadata: { member_id: memberId }
        })
      }
    } catch (notifErr) {
      console.error('[MembersService] Activation notification failed:', notifErr)
    }

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
      throw new Error('Only invited members can be deleted.')
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
        onboarding: data.filter(m => m.status === 'onboarding').length
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

    // Update the membership: link profile and set to onboarding
    const { data: updatedMember, error: updateError } = await supabase
      .from('organization_members')
      .update({
        profile_id: profileId,
        status: 'onboarding',
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

        // In-app notification for the inviter
        await notificationService.create({
          recipientId: invitation.invited_by,
          actorId: profileId,
          organizationId: invitation.organization_id,
          type: 'invitation_accepted',
          title: 'Invitation accepted',
          message: `${candidateName} accepted the invitation to join ${invitation.organization?.name || 'your organization'}`,
          actionUrl: '/people',
          metadata: { member_id: memberId }
        })
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

        // In-app notification for the inviter
        await notificationService.create({
          recipientId: invitation.invited_by,
          actorId: profileId,
          organizationId: invitation.organization_id,
          type: 'invitation_declined',
          title: 'Invitation declined',
          message: `${invitation.invitation_email} declined the invitation to join ${invitation.organization?.name || 'your organization'}`,
          actionUrl: '/people',
          metadata: { member_id: memberId, invitation_email: invitation.invitation_email }
        })
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
