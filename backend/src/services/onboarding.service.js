import { supabase } from '../config/supabase.js'
import { BadRequestError } from '../utils/errors.js'
import { authService } from './auth.service.js'

export const onboardingService = {
  /**
   * Complete employer profile + create organization (Step 1)
   */
  async completeEmployerProfile(userId, data) {
    const {
      dateOfBirth,
      phone,
      orgName,
      industry,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country
    } = data

    // Verify user is employer with no org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, organization_id, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('User not found')
    }

    if (profile.role !== 'employer') {
      throw new BadRequestError('Only employers can complete this onboarding')
    }

    if (profile.organization_id) {
      throw new BadRequestError('Organization already exists')
    }

    // Normalize industry value
    const normalizedIndustry = authService.normalizeIndustry(industry)

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        email: profile.email,
        industry: normalizedIndustry,
        owner_id: userId,
        status: 'active',
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        country: country || 'US'
      })
      .select()
      .single()

    if (orgError) {
      console.error('[OnboardingService] Organization creation error:', orgError)
      throw new BadRequestError('Failed to create organization')
    }

    // Create owner membership record
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        profile_id: userId,
        member_role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('[OnboardingService] Membership creation error:', memberError)
      throw new BadRequestError('Failed to create organization membership')
    }

    // Update profile with org link, phone, DOB, advance to step 2
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        organization_id: orgData.id,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        onboarding_step: 2
      })
      .eq('id', userId)
      .select('*, organization:organizations!fk_profiles_organization(*)')
      .single()

    if (updateError) {
      console.error('[OnboardingService] Profile update error:', updateError)
      throw new BadRequestError('Failed to update profile')
    }

    return {
      profile: updatedProfile,
      organization: orgData
    }
  },

  /**
   * Select service type (Step 2)
   */
  async selectService(userId, serviceType) {
    // Get profile to find org and verify step
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role, onboarding_step')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('User not found')
    }

    if (profile.role !== 'employer') {
      throw new BadRequestError('Only employers can complete this step')
    }

    if (!profile.organization_id || profile.onboarding_step !== 2) {
      throw new BadRequestError('Please complete Step 1 first')
    }

    // Update organization with service_type
    const { error: orgUpdateError } = await supabase
      .from('organizations')
      .update({ service_type: serviceType })
      .eq('id', profile.organization_id)

    if (orgUpdateError) {
      console.error('[OnboardingService] Org service update error:', orgUpdateError)
      throw new BadRequestError('Failed to update service type')
    }

    // Mark onboarding as complete
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: null
      })
      .eq('id', userId)
      .select('*, organization:organizations!fk_profiles_organization(*)')
      .single()

    if (updateError) {
      console.error('[OnboardingService] Profile onboarding complete error:', updateError)
      throw new BadRequestError('Failed to complete onboarding')
    }

    return {
      profile: updatedProfile,
      redirectTo: '/dashboard'
    }
  },

  /**
   * Get current onboarding status
   */
  async getOnboardingStatus(userId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, first_name, role, organization_id, onboarding_step, onboarding_completed')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      throw new BadRequestError('User not found')
    }

    return {
      currentStep: profile.onboarding_step || null,
      isComplete: profile.onboarding_completed === true,
      hasOrganization: !!profile.organization_id,
      firstName: profile.first_name
    }
  }
}
