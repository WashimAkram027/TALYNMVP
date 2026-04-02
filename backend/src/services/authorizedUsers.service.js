import crypto from 'crypto'
import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'
import { authService } from './auth.service.js'
import { emailService } from './email.service.js'

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com',
  'live.com', 'msn.com', 'me.com', 'mac.com', 'googlemail.com',
  'yandex.com', 'mail.com'
])

const TOKEN_EXPIRY_HOURS = 72

/**
 * Validate that invitee email domain matches org owner's domain.
 * Skipped if the owner uses a personal email domain.
 */
async function validateEmailDomain(inviteeEmail, orgId) {
  // Get org owner email
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .single()

  if (orgError || !org) throw new BadRequestError('Organization not found')

  const { data: ownerProfile, error: ownerError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', org.owner_id)
    .single()

  if (ownerError || !ownerProfile) throw new BadRequestError('Organization owner not found')

  const ownerDomain = ownerProfile.email.split('@')[1].toLowerCase()
  const inviteeDomain = inviteeEmail.split('@')[1].toLowerCase()

  // Skip enforcement for personal email domains
  if (PERSONAL_DOMAINS.has(ownerDomain)) return

  if (inviteeDomain !== ownerDomain) {
    throw new BadRequestError(
      `Invited email must use the same domain as the organization (@${ownerDomain})`
    )
  }
}

function generateToken() {
  const raw = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
  return { raw, hash, expiresAt }
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export const authorizedUsersService = {
  /**
   * Invite an authorized user to the organization
   */
  async invite(orgId, invitedBy, { email, firstName, lastName }) {
    const normalizedEmail = email.toLowerCase().trim()

    // Validate email domain
    await validateEmailDomain(normalizedEmail, orgId)

    // Check if email already has an account
    const { data: existingProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (profileErr && profileErr.code !== 'PGRST116') throw profileErr
    if (existingProfile) {
      throw new BadRequestError('This email is already registered. The user must use a different email.')
    }

    // Check for existing pending invitation in this org
    const { data: existingInvite } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('invitation_email', normalizedEmail)
      .eq('member_role', 'authorized_user')
      .single()

    if (existingInvite) {
      throw new BadRequestError('An invitation has already been sent to this email')
    }

    // Generate invitation token
    const token = generateToken()

    // Create organization_members row
    const { data: member, error: insertError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        profile_id: null,
        invitation_email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        member_role: 'authorized_user',
        status: 'invited',
        invited_by: invitedBy,
        invited_at: new Date().toISOString(),
        invitation_token_hash: token.hash,
        invitation_token_expires_at: token.expiresAt
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('[AuthorizedUsers] Insert error:', insertError)
      throw new BadRequestError('Failed to create invitation')
    }

    // Get inviter name and org name for email
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
      'Your organization'
    const orgName = org?.name || 'your organization'

    // Send invitation email (non-blocking)
    try {
      await emailService.sendAuthorizedUserInvitationEmail(
        normalizedEmail, token.raw, firstName, orgName, inviterName
      )
    } catch (emailErr) {
      console.error('[AuthorizedUsers] Email send error:', emailErr)
    }

    return member
  },

  /**
   * Validate a setup token and return invitation details
   */
  async validateSetupToken(rawToken) {
    const tokenHash = hashToken(rawToken)

    const { data: member, error } = await supabase
      .from('organization_members')
      .select(`
        id, invitation_email, first_name, last_name, status,
        invitation_token_expires_at, organization_id,
        organization:organizations!organization_members_organization_id_fkey(id, name)
      `)
      .eq('invitation_token_hash', tokenHash)
      .eq('member_role', 'authorized_user')
      .single()

    if (error || !member) {
      throw new BadRequestError('Invalid or expired invitation link')
    }

    if (member.status !== 'invited') {
      throw new BadRequestError('This invitation link is invalid or has expired.')
    }

    if (new Date(member.invitation_token_expires_at) < new Date()) {
      throw new BadRequestError('This invitation link is invalid or has expired.')
    }

    return {
      valid: true,
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.invitation_email,
      organizationName: member.organization?.name || 'Organization'
    }
  },

  /**
   * Set up the authorized user's account (create auth user + profile)
   */
  async setupAccount(rawToken, password) {
    const tokenHash = hashToken(rawToken)

    // Fetch and validate the invitation
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select(`
        id, invitation_email, first_name, last_name, status,
        invitation_token_expires_at, organization_id,
        organization:organizations!organization_members_organization_id_fkey(*)
      `)
      .eq('invitation_token_hash', tokenHash)
      .eq('member_role', 'authorized_user')
      .single()

    if (memberError || !member) {
      throw new BadRequestError('Invalid or expired invitation link')
    }

    if (member.status !== 'invited') {
      throw new BadRequestError('This invitation link is invalid or has expired.')
    }

    if (new Date(member.invitation_token_expires_at) < new Date()) {
      throw new BadRequestError('This invitation link is invalid or has expired.')
    }

    // Create Supabase auth user (email pre-confirmed)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: member.invitation_email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: member.first_name,
        last_name: member.last_name,
        role: 'employer'
      }
    })

    if (authError) {
      console.error('[AuthorizedUsers] Auth user creation error:', authError)
      throw new BadRequestError('Failed to create account. Please contact support.')
    }

    const userId = authData.user.id

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: member.invitation_email,
        first_name: member.first_name,
        last_name: member.last_name,
        role: 'employer',
        status: 'active',
        organization_id: member.organization_id,
        onboarding_completed: true,
        onboarding_step: 2,
        email_verified: true
      })

    if (profileError) {
      console.error('[AuthorizedUsers] Profile creation error:', profileError)
      // Clean up auth user on failure
      await supabase.auth.admin.deleteUser(userId)
      throw new BadRequestError('Failed to create user profile')
    }

    // Update organization_members: link profile, activate, clear token
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({
        profile_id: userId,
        status: 'active',
        joined_at: new Date().toISOString(),
        invitation_token_hash: null,
        invitation_token_expires_at: null
      })
      .eq('id', member.id)

    if (updateError) {
      console.error('[AuthorizedUsers] Membership update error:', updateError)
      // Rollback: delete auth user (cascades to profile)
      await supabase.auth.admin.deleteUser(userId)
      throw new BadRequestError('Failed to activate account. Please contact support.')
    }

    // Generate JWT
    const token = authService.generateToken(userId)

    // Fetch the complete profile with org for the response
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, organization:organizations!fk_profiles_organization(*)')
      .eq('id', userId)
      .single()

    return {
      token,
      user: { id: userId, email: member.invitation_email },
      profile,
      organization: profile?.organization || member.organization
    }
  },

  /**
   * List authorized users for an organization
   */
  async getAuthorizedUsers(orgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id, invitation_email, first_name, last_name, status,
        member_role, invited_at, joined_at, invited_by,
        profile:profiles!organization_members_profile_id_fkey(id, email, first_name, last_name, full_name, avatar_url),
        invited_by_profile:profiles!organization_members_invited_by_fkey(id, full_name, email)
      `)
      .eq('organization_id', orgId)
      .eq('member_role', 'authorized_user')
      .order('invited_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Revoke an authorized user's access (deletes their account entirely)
   */
  async revokeAuthorizedUser(memberId, orgId, callerId) {
    // Prevent self-revocation
    const { data: target } = await supabase
      .from('organization_members')
      .select('profile_id')
      .eq('id', memberId)
      .single()

    if (target?.profile_id === callerId) {
      throw new BadRequestError('You cannot revoke your own access')
    }

    // Fetch the member
    const { data: member, error: fetchError } = await supabase
      .from('organization_members')
      .select('id, member_role, status, profile_id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (fetchError || !member) {
      throw new NotFoundError('Authorized user not found')
    }

    if (member.member_role !== 'authorized_user') {
      throw new BadRequestError('Can only revoke authorized users')
    }

    if (member.status === 'invited') {
      // No account yet — just delete the membership row
      const { error: deleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (deleteError) throw deleteError
    } else if (member.profile_id) {
      // Active user — delete auth user (cascades to profile and membership)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(member.profile_id)

      if (deleteError) {
        console.error('[AuthorizedUsers] Delete user error:', deleteError)
        throw new BadRequestError('Failed to revoke user access')
      }
    }

    return { success: true }
  },

  /**
   * Resend invitation to an authorized user
   */
  async resendInvitation(memberId, orgId, resenderId) {
    const { data: member, error: fetchError } = await supabase
      .from('organization_members')
      .select(`
        id, invitation_email, first_name, last_name, member_role, status,
        organization:organizations!organization_members_organization_id_fkey(id, name)
      `)
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (fetchError || !member) {
      throw new NotFoundError('Invitation not found')
    }

    if (member.member_role !== 'authorized_user') {
      throw new BadRequestError('Can only resend authorized user invitations')
    }

    if (member.status !== 'invited') {
      throw new BadRequestError('This user has already set up their account')
    }

    // Generate new token
    const token = generateToken()

    const { error: updateError } = await supabase
      .from('organization_members')
      .update({
        invitation_token_hash: token.hash,
        invitation_token_expires_at: token.expiresAt,
        invited_at: new Date().toISOString(),
        invited_by: resenderId
      })
      .eq('id', memberId)

    if (updateError) throw updateError

    // Get resender info
    const { data: resenderProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, full_name')
      .eq('id', resenderId)
      .single()

    const inviterName = resenderProfile?.full_name ||
      `${resenderProfile?.first_name || ''} ${resenderProfile?.last_name || ''}`.trim() ||
      'Your organization'
    const orgName = member.organization?.name || 'your organization'

    try {
      await emailService.sendAuthorizedUserInvitationEmail(
        member.invitation_email, token.raw, member.first_name, orgName, inviterName
      )
    } catch (emailErr) {
      console.error('[AuthorizedUsers] Resend email error:', emailErr)
    }

    return { success: true }
  }
}
