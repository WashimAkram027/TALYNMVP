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
  },

  /**
   * Get dashboard onboarding checklist status
   * Computes the state of all 4 setup steps from DB
   */
  async getChecklistStatus(userId, organizationId) {
    // Fetch org data
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, description, website, linkedin_url, employee_types_needed, entity_status, setup_step_1_completed_at')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      throw new BadRequestError('Organization not found')
    }

    // Fetch entity documents
    const { data: entityDocs } = await supabase
      .from('entity_documents')
      .select('doc_type, file_name, file_url, created_at')
      .eq('organization_id', organizationId)

    // Fetch member count (for step 4)
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('member_role', 'owner')

    // Step 1: Complete Org Profile
    const step1Completed = !!org.setup_step_1_completed_at
    const step1Status = step1Completed ? 'completed' : 'active'

    // Step 2: Entity Verification
    let step2Status = 'locked'
    if (step1Completed) {
      if (org.entity_status === 'approved') {
        step2Status = 'completed'
      } else if (org.entity_status === 'pending_review') {
        step2Status = 'pending_review'
      } else if (org.entity_status === 'rejected') {
        step2Status = 'active' // allow re-upload
      } else {
        step2Status = 'active'
      }
    }

    // Step 3: Payment Setup (skeleton — gracefully handle missing table)
    let step3Status = 'locked'
    if (step2Status === 'completed') {
      // Check if payment_methods table exists and has data
      const { count: paymentCount, error: paymentError } = await supabase
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      if (paymentError) {
        // Table doesn't exist yet — show as active (skeleton UI)
        step3Status = 'active'
      } else {
        step3Status = paymentCount > 0 ? 'completed' : 'active'
      }
    }

    // Step 4: Invite Team Members (requires Step 3 completed)
    let step4Status = 'locked'
    if (step3Status === 'completed') {
      step4Status = (memberCount || 0) > 0 ? 'completed' : 'active'
    }

    const allComplete = step1Status === 'completed' &&
      step2Status === 'completed' &&
      step3Status === 'completed' &&
      step4Status === 'completed'

    return {
      allComplete,
      steps: [
        {
          key: 'org_profile',
          title: 'Complete Organization Profile',
          subtitle: 'Add description, employee types, and social links',
          status: step1Status,
          data: step1Completed ? {
            description: org.description,
            website: org.website,
            linkedinUrl: org.linkedin_url,
            employeeTypesNeeded: org.employee_types_needed
          } : null
        },
        {
          key: 'entity_verification',
          title: 'Entity Verification',
          subtitle: 'Upload W-9, Articles of Incorporation, and Bank Statement',
          status: step2Status,
          data: {
            entityStatus: org.entity_status || 'not_started',
            documents: (entityDocs || []).map(d => ({
              docType: d.doc_type,
              fileName: d.file_name,
              fileUrl: d.file_url,
              uploadedAt: d.created_at
            }))
          }
        },
        {
          key: 'payment_setup',
          title: 'Payment Setup',
          subtitle: 'Connect your US bank account to fund payroll',
          status: step3Status,
          data: null
        },
        {
          key: 'invite_team',
          title: 'Invite Team Members',
          subtitle: 'Add your first team member or browse candidates',
          status: step4Status,
          data: {
            memberCount: memberCount || 0
          }
        }
      ]
    }
  },

  /**
   * Step 1: Complete org profile enrichment
   */
  async completeOrgProfile(userId, organizationId, data) {
    const { description, employeeTypesNeeded, website, linkedinUrl } = data

    const updatePayload = {
      setup_step_1_completed_at: new Date().toISOString()
    }

    if (description !== undefined) updatePayload.description = description
    if (employeeTypesNeeded !== undefined) updatePayload.employee_types_needed = employeeTypesNeeded
    if (website !== undefined) updatePayload.website = website || null
    if (linkedinUrl !== undefined) updatePayload.linkedin_url = linkedinUrl || null

    const { data: updatedOrg, error } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', organizationId)
      .eq('owner_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[OnboardingService] Org profile enrichment error:', error)
      throw new BadRequestError('Failed to update organization profile')
    }

    return updatedOrg
  },

  /**
   * Step 2: Upload an entity document
   */
  async uploadEntityDocument(userId, organizationId, { docType, fileBase64, fileName, fileType }) {
    // Check entity_status — can't upload if pending_review
    const { data: org } = await supabase
      .from('organizations')
      .select('entity_status')
      .eq('id', organizationId)
      .single()

    if (org?.entity_status === 'pending_review') {
      throw new BadRequestError('Cannot upload documents while entity is under review')
    }

    // Decode base64
    const buffer = Buffer.from(fileBase64, 'base64')
    const fileExt = fileName.split('.').pop()
    const storagePath = `${organizationId}/${docType}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('enitity-document')
      .upload(storagePath, buffer, {
        contentType: fileType,
        upsert: true
      })

    if (uploadError) {
      console.error('[OnboardingService] Entity doc upload error:', uploadError)
      throw new BadRequestError('Failed to upload document')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('enitity-document')
      .getPublicUrl(storagePath)

    // Upsert into entity_documents (replace if same doc_type exists)
    const { data: doc, error: upsertError } = await supabase
      .from('entity_documents')
      .upsert({
        organization_id: organizationId,
        doc_type: docType,
        file_url: publicUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: buffer.length,
        storage_path: storagePath,
        uploaded_by: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,doc_type'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[OnboardingService] Entity doc upsert error:', upsertError)
      throw new BadRequestError('Failed to save document record')
    }

    return doc
  },

  /**
   * Step 2: Delete an entity document
   */
  async deleteEntityDocument(userId, organizationId, docType) {
    // Check entity_status — can't delete if pending_review
    const { data: org } = await supabase
      .from('organizations')
      .select('entity_status')
      .eq('id', organizationId)
      .single()

    if (org?.entity_status === 'pending_review') {
      throw new BadRequestError('Cannot delete documents while entity is under review')
    }

    // Find the document
    const { data: doc, error: findError } = await supabase
      .from('entity_documents')
      .select('id, storage_path')
      .eq('organization_id', organizationId)
      .eq('doc_type', docType)
      .single()

    if (findError || !doc) {
      throw new BadRequestError('Document not found')
    }

    // Delete from storage
    await supabase.storage
      .from('enitity-document')
      .remove([doc.storage_path])

    // Delete DB record
    const { error: deleteError } = await supabase
      .from('entity_documents')
      .delete()
      .eq('id', doc.id)

    if (deleteError) {
      console.error('[OnboardingService] Entity doc delete error:', deleteError)
      throw new BadRequestError('Failed to delete document')
    }

    return { success: true }
  },

  /**
   * Step 2: Submit entity for review
   */
  async submitEntityForReview(userId, organizationId) {
    // Verify all 3 docs are uploaded
    const { data: docs, error: docsError } = await supabase
      .from('entity_documents')
      .select('doc_type')
      .eq('organization_id', organizationId)

    if (docsError) {
      throw new BadRequestError('Failed to check documents')
    }

    const uploadedTypes = (docs || []).map(d => d.doc_type)
    const requiredTypes = ['w9', 'articles_of_incorporation', 'bank_statement']
    const missing = requiredTypes.filter(t => !uploadedTypes.includes(t))

    if (missing.length > 0) {
      throw new BadRequestError(`Missing required documents: ${missing.join(', ')}`)
    }

    // Update entity status
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({
        entity_status: 'pending_review',
        entity_submitted_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .eq('owner_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[OnboardingService] Entity submit error:', updateError)
      throw new BadRequestError('Failed to submit entity for review')
    }

    return updatedOrg
  }
}
