import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

/**
 * Profile service - handles user profile operations
 */
export const profileService = {
  /**
   * Get user profile with organization
   */
  async getProfile(userId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations!fk_profiles_organization(*)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      throw new NotFoundError('Profile not found')
    }

    return profile
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    // Convert camelCase to snake_case for database
    const dbUpdates = {}
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl
    if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new BadRequestError('Failed to update profile')
    }

    return data
  },

  /**
   * Complete employer signup (create organization)
   */
  async completeEmployerSignup(userId, { firstName, lastName, industry, industryOther }) {
    // Get user's email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw new NotFoundError('Profile not found')
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        email: profile.email,
        industry: industry,
        industry_other: industry === 'other' ? industryOther : null,
        owner_id: userId
      })
      .select()
      .single()

    if (orgError) {
      throw new BadRequestError(orgError.message)
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: 'employer',
        organization_id: organization.id,
        status: 'active',
        onboarding_completed: true
      })
      .eq('id', userId)

    if (updateError) {
      throw new BadRequestError('Failed to update profile')
    }

    // Create owner membership
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        profile_id: userId,
        member_role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Failed to create membership:', memberError)
    }

    // Return updated profile
    return this.getProfile(userId)
  },

  /**
   * Complete candidate signup
   */
  async completeCandidateSignup(userId, { firstName, lastName, resumeUrl, resumeFilename, linkedinUrl }) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: 'candidate',
        resume_url: resumeUrl,
        resume_filename: resumeFilename,
        linkedin_url: linkedinUrl || null,
        status: 'active',
        onboarding_completed: true
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new BadRequestError('Failed to complete signup')
    }

    return data
  },

  /**
   * Check if email exists
   */
  async checkEmailExists(email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    return !!data
  },

  /**
   * Upload avatar (returns signed URL)
   */
  async uploadAvatar(userId, file, filename) {
    const fileExt = filename.split('.').pop()
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: `image/${fileExt}`,
        upsert: true
      })

    if (error) {
      throw new BadRequestError('Failed to upload avatar')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update profile
    await this.updateProfile(userId, { avatarUrl: publicUrl })

    return { url: publicUrl }
  },

  /**
   * Upload resume
   */
  async uploadResume(userId, file, filename) {
    const fileExt = filename.split('.').pop()
    const filePath = `${userId}/resume-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        contentType: fileExt === 'pdf' ? 'application/pdf' : 'application/octet-stream',
        upsert: true
      })

    if (error) {
      throw new BadRequestError('Failed to upload resume')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath)

    // Update profile
    await supabase
      .from('profiles')
      .update({
        resume_url: publicUrl,
        resume_filename: filename
      })
      .eq('id', userId)

    return { url: publicUrl, filename }
  }
}
