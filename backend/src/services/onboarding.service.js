import { supabase } from '../config/supabase.js'
import { BadRequestError } from '../utils/errors.js'
import { authService } from './auth.service.js'
import { emailService } from './email.service.js'
import { notificationService } from './notification.service.js'

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
      .select('id, name, description, website, linkedin_url, employee_types_needed, entity_status, entity_rejection_reason, setup_step_1_completed_at')
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
      .neq('member_role', 'authorized_user')

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

    // Step 3: Payment Setup (unlock when step 2 is completed OR pending_review)
    let step3Status = 'locked'
    if (step2Status === 'completed' || step2Status === 'pending_review') {
      // Check if payment_methods table exists and has data
      const { count: paymentCount, error: paymentError } = await supabase
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')

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
          subtitle: 'Upload W-9, Articles of Incorporation, Bank Statement, and optional Certificate of Registration',
          status: step2Status,
          data: {
            entityStatus: org.entity_status || 'not_started',
            rejectionReason: org.entity_rejection_reason || null,
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
          data: {
            entityStatus: org.entity_status || 'not_started'
          }
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
   * Get employee's job details and linked EOR quote for offer review.
   * Looks up by profile_id (if already accepted) or invitation_email (if still invited).
   */
  async getEmployeeQuoteAndJob(userId) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, organization_id, first_name, last_name, full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('User not found')
    }

    const memberColumns = 'id, job_title, job_description, salary_amount, salary_currency, employment_type, start_date, quote_id, quote_verified, quote_verified_at, quote_dispute_note, organization_id'
    let member = null

    // Strategy 1: If employee has an org, look up by profile_id (already accepted)
    if (profile.organization_id) {
      const { data } = await supabase
        .from('organization_members')
        .select(memberColumns)
        .eq('profile_id', userId)
        .eq('organization_id', profile.organization_id)
        .in('status', ['onboarding', 'active'])
        .single()
      member = data
    }

    // Strategy 2: If no member found yet, look up by invitation_email (pending invitation)
    if (!member && profile.email) {
      const { data } = await supabase
        .from('organization_members')
        .select(memberColumns)
        .eq('invitation_email', profile.email.toLowerCase())
        .eq('status', 'invited')
        .order('invited_at', { ascending: false })
        .limit(1)
        .single()
      member = data
    }

    if (!member) {
      throw new BadRequestError('No invitation or membership found')
    }

    // Build result
    const result = {
      memberId: member.id,
      jobTitle: member.job_title,
      jobDescription: member.job_description,
      salaryAmount: member.salary_amount,
      salaryCurrency: member.salary_currency,
      employmentType: member.employment_type,
      startDate: member.start_date,
      quoteVerified: member.quote_verified,
      quoteVerifiedAt: member.quote_verified_at,
      quoteDisputeNote: member.quote_dispute_note,
      quote: null
    }

    // If there's a linked quote, fetch it
    if (member.quote_id) {
      const { data: quote } = await supabase
        .from('eor_quotes')
        .select('*')
        .eq('id', member.quote_id)
        .single()

      if (quote) {
        result.quote = quote
      }
    }

    return result
  },

  /**
   * Verify or flag a discrepancy on the employee's quote/job details.
   * Works before or after invitation acceptance (looks up by email if no org yet).
   * If verified: sets quote_verified = true
   * If flagged: saves dispute note, notifies employer via email
   */
  async verifyEmployeeQuote(userId, verified, discrepancyNote) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, organization_id, first_name, last_name, full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) throw new BadRequestError('User not found')
    if (profile.role !== 'candidate') throw new BadRequestError('Only employees can verify quotes')

    // Find member by profile_id+org (accepted) or invitation_email (invited)
    let member = null
    if (profile.organization_id) {
      const { data } = await supabase
        .from('organization_members')
        .select('id, organization_id, invited_by')
        .eq('profile_id', userId)
        .eq('organization_id', profile.organization_id)
        .single()
      member = data
    }
    if (!member && profile.email) {
      const { data } = await supabase
        .from('organization_members')
        .select('id, organization_id, invited_by')
        .eq('invitation_email', profile.email.toLowerCase())
        .eq('status', 'invited')
        .order('invited_at', { ascending: false })
        .limit(1)
        .single()
      member = data
    }

    if (!member) {
      throw new BadRequestError('No invitation or membership found')
    }

    if (verified) {
      // Mark as verified (no step advancement — quote review is not an onboarding step)
      const { error: memberUpdateError } = await supabase
        .from('organization_members')
        .update({
          quote_verified: true,
          quote_verified_at: new Date().toISOString(),
          quote_dispute_note: null
        })
        .eq('id', member.id)

      if (memberUpdateError) throw new BadRequestError('Failed to verify employment details')

      return { verified: true }
    } else {
      // Flag discrepancy
      if (!discrepancyNote || discrepancyNote.trim().length === 0) {
        throw new BadRequestError('Please describe the discrepancy')
      }

      const { error: memberUpdateError } = await supabase
        .from('organization_members')
        .update({
          quote_verified: false,
          quote_dispute_note: discrepancyNote.trim()
        })
        .eq('id', member.id)

      if (memberUpdateError) throw new BadRequestError('Failed to save discrepancy note')

      // Send notification email to employer (fire-and-forget)
      try {
        if (member.invited_by) {
          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('email, first_name')
            .eq('id', member.invited_by)
            .single()

          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', member.organization_id)
            .single()

          const employeeName = profile.full_name ||
            `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
            'An employee'

          if (inviterProfile?.email) {
            await emailService.sendQuoteDiscrepancyEmail(
              inviterProfile.email,
              inviterProfile.first_name,
              employeeName,
              org?.name || 'your organization',
              discrepancyNote.trim()
            )
          }
        }
      } catch (emailErr) {
        console.error('[OnboardingService] Failed to send discrepancy email:', emailErr)
      }

      return { currentStep: 1, isComplete: false, verified: false, flagged: true }
    }
  },

  /**
   * Helper: get the employee's organization_members row
   */
  async _getEmployeeMember(userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', userId)
      .single()

    if (!profile?.organization_id) return null

    const { data: member } = await supabase
      .from('organization_members')
      .select('id, organization_id')
      .eq('profile_id', userId)
      .eq('organization_id', profile.organization_id)
      .in('status', ['invited', 'onboarding', 'active'])
      .single()

    return member
  },

  /**
   * Get employee onboarding status (with pre-filled data for form restore)
   */
  async getEmployeeOnboardingStatus(userId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, first_name, role, onboarding_step, onboarding_completed, pending_bank_details, pending_emergency_contact, pending_tax_info, date_of_birth, phone, address')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      throw new BadRequestError('User not found')
    }

    const result = {
      currentStep: profile.onboarding_step || null,
      isComplete: profile.onboarding_completed === true,
      hasBankDetails: !!profile.pending_bank_details,
      firstName: profile.first_name,
      personalInfo: null,
      emergencyContact: null,
      taxInfo: null,
      quoteVerified: false,
      documents: []
    }

    // Fetch member data if employee has an organization
    const member = await this._getEmployeeMember(userId)

    if (member) {
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('id, pan_number, ssf_number, emergency_contact, quote_verified')
        .eq('id', member.id)
        .single()

      if (memberData) {
        result.emergencyContact = memberData.emergency_contact || null
        result.taxInfo = {
          panNumber: memberData.pan_number || null,
          ssfNumber: memberData.ssf_number || null
        }
        result.quoteVerified = memberData.quote_verified || false
      }

      // Fetch uploaded identity documents by member_id
      const { data: docs } = await supabase
        .from('documents')
        .select('id, name, file_url, category, created_at')
        .eq('member_id', member.id)
        .eq('category', 'identity')

      result.documents = docs || []
    } else {
      // No org yet — use pending data from profiles
      result.emergencyContact = profile.pending_emergency_contact || null
      if (profile.pending_tax_info) {
        result.taxInfo = profile.pending_tax_info
      }

      // Fetch docs by uploaded_by instead of member_id
      const { data: docs } = await supabase
        .from('documents')
        .select('id, name, file_url, category, created_at')
        .eq('uploaded_by', userId)
        .eq('category', 'identity')

      result.documents = docs || []
    }

    // Personal info from profile
    result.personalInfo = {
      dateOfBirth: profile.date_of_birth || null,
      phone: profile.phone || null,
      address: profile.address || null
    }

    return result
  },

  /**
   * Advance employee onboarding step (steps 1-3)
   */
  async advanceEmployeeStep(userId, currentStep) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_step, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('User not found')
    }

    if (profile.role !== 'candidate') {
      throw new BadRequestError('Only employees can complete this onboarding')
    }

    if (profile.onboarding_completed) {
      throw new BadRequestError('Onboarding already completed')
    }

    if (profile.onboarding_step !== currentStep) {
      throw new BadRequestError(`Expected step ${profile.onboarding_step}, got ${currentStep}`)
    }

    if (currentStep < 1 || currentStep > 3) {
      throw new BadRequestError('Invalid step number')
    }

    const nextStep = currentStep + 1

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ onboarding_step: nextStep })
      .eq('id', userId)
      .select('id, onboarding_step, onboarding_completed')
      .single()

    if (updateError) {
      throw new BadRequestError('Failed to advance onboarding step')
    }

    return {
      currentStep: updatedProfile.onboarding_step,
      isComplete: false
    }
  },

  /**
   * Step 1: Save personal information
   */
  async completeEmployeePersonalInfo(userId, data) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_step, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) throw new BadRequestError('User not found')
    if (profile.role !== 'candidate') throw new BadRequestError('Only employees can complete this onboarding')
    if (profile.onboarding_completed) throw new BadRequestError('Onboarding already completed')
    if (profile.onboarding_step !== 1) throw new BadRequestError('Please complete the steps in order')

    const address = {
      street: data.street,
      city: data.city,
      state: data.state || null,
      country: data.country || 'Nepal',
      nationality: data.nationality
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        date_of_birth: data.dateOfBirth,
        phone: data.phone,
        address,
        onboarding_step: 2
      })
      .eq('id', userId)

    if (updateError) throw new BadRequestError('Failed to save personal information')

    return { currentStep: 2, isComplete: false }
  },

  /**
   * Step 2: Save emergency contact
   */
  async completeEmployeeEmergencyContact(userId, data) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_step, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) throw new BadRequestError('User not found')
    if (profile.role !== 'candidate') throw new BadRequestError('Only employees can complete this onboarding')
    if (profile.onboarding_completed) throw new BadRequestError('Onboarding already completed')
    if (profile.onboarding_step !== 2) throw new BadRequestError('Please complete the steps in order')

    const emergencyContact = {
      name: data.contactName,
      phone: data.contactPhone,
      relationship: data.relationship
    }

    const member = await this._getEmployeeMember(userId)

    if (member) {
      // Save directly to organization_members
      const { error: memberError } = await supabase
        .from('organization_members')
        .update({ emergency_contact: emergencyContact })
        .eq('id', member.id)

      if (memberError) throw new BadRequestError('Failed to save emergency contact')
    }

    // Always save to profiles as pending data (works even without org)
    const { error: stepError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 3,
        pending_emergency_contact: emergencyContact
      })
      .eq('id', userId)

    if (stepError) throw new BadRequestError('Failed to save emergency contact')

    return { currentStep: 3, isComplete: false }
  },

  /**
   * Step 3: Save tax information and complete onboarding
   * After step 3, onboarding is marked complete. Document upload and banking
   * details are deferred to dashboard todo items.
   */
  async completeEmployeeTaxInfo(userId, data) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_step, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) throw new BadRequestError('User not found')
    if (profile.role !== 'candidate') throw new BadRequestError('Only employees can complete this onboarding')
    if (profile.onboarding_completed) throw new BadRequestError('Onboarding already completed')
    if (profile.onboarding_step !== 3) throw new BadRequestError('Please complete the steps in order')

    const taxInfo = {
      panNumber: data.panNumber,
      ssfNumber: data.ssfNumber || null
    }

    const member = await this._getEmployeeMember(userId)

    if (member) {
      // Save directly to organization_members
      const { error: memberError } = await supabase
        .from('organization_members')
        .update({
          pan_number: data.panNumber,
          ssf_number: data.ssfNumber || null
        })
        .eq('id', member.id)

      if (memberError) throw new BadRequestError('Failed to save tax information')
    }

    // Mark onboarding as complete after step 3
    const { error: stepError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: null,
        pending_tax_info: taxInfo
      })
      .eq('id', userId)

    if (stepError) throw new BadRequestError('Failed to save tax information')

    return { currentStep: null, isComplete: true, redirectTo: '/employee/overview' }
  },

  /**
   * Upload an identity document (available during onboarding or post-onboarding from dashboard)
   */
  async uploadEmployeeDocument(userId, data) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_step, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) throw new BadRequestError('User not found')
    if (profile.role !== 'candidate') throw new BadRequestError('Only employees can upload documents')

    // Server-side file validation
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowedMimes.includes(data.fileType)) {
      throw new BadRequestError('Invalid file type. Only PDF, PNG, and JPEG are allowed.')
    }

    const buffer = Buffer.from(data.fileBase64, 'base64')

    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestError('File size must be under 10MB')
    }

    // Sanitize filename
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileExt = safeName.split('.').pop()

    const member = await this._getEmployeeMember(userId)
    const orgId = member?.organization_id || 'unassigned'
    const storagePath = `${orgId}/employee-${userId}/${data.docType}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const bucket = 'employee-documents'
    let fileUrl = storagePath

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: data.fileType, upsert: true })

    if (uploadError) {
      // Fallback to documents bucket if employee-documents doesn't exist
      if (uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
        const { error: fallbackError } = await supabase.storage
          .from('documents')
          .upload(storagePath, buffer, { contentType: data.fileType, upsert: true })
        if (fallbackError) {
          console.error('[OnboardingService] Employee doc upload error:', fallbackError)
          throw new BadRequestError('Failed to upload document')
        }
        const { data: signedData } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
        fileUrl = signedData?.signedUrl || storagePath
      } else {
        console.error('[OnboardingService] Employee doc upload error:', uploadError)
        throw new BadRequestError('Failed to upload document')
      }
    } else {
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
      fileUrl = signedData?.signedUrl || storagePath
    }

    // Insert into documents table (member_id may be null if not yet in an org)
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        organization_id: member?.organization_id || null,
        member_id: member?.id || null,
        name: safeName,
        file_url: fileUrl,
        category: 'identity',
        is_sensitive: true,
        uploaded_by: userId
      })
      .select()
      .single()

    if (docError) {
      console.error('[OnboardingService] Employee doc insert error:', docError)
      throw new BadRequestError('Failed to save document record')
    }

    return doc
  },

  /**
   * Complete document step (post-onboarding, from dashboard todo)
   * No longer advances steps since onboarding completes at step 3.
   */
  async completeEmployeeDocumentStep(userId) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) throw new BadRequestError('User not found')
    if (profile.role !== 'candidate') throw new BadRequestError('Only employees can complete this step')

    // Check for identity docs by uploaded_by (works with or without org)
    const member = await this._getEmployeeMember(userId)
    let docQuery = supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'identity')

    if (member) {
      docQuery = docQuery.eq('member_id', member.id)
    } else {
      docQuery = docQuery.eq('uploaded_by', userId)
    }

    const { count, error: countError } = await docQuery

    if (countError || !count || count < 1) {
      throw new BadRequestError('Please upload at least one identity document')
    }

    return { success: true, documentsUploaded: true }
  },

  /**
   * Save employee bank details (post-onboarding from dashboard todo or Settings)
   */
  async completeEmployeeBankDetails(userId, bankDetails) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new BadRequestError('User not found')
    }

    if (profile.role !== 'candidate') {
      throw new BadRequestError('Only employees can update bank details')
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ pending_bank_details: bankDetails })
      .eq('id', userId)
      .select('id, onboarding_step, onboarding_completed')
      .single()

    if (updateError) {
      throw new BadRequestError('Failed to save bank details')
    }

    return {
      currentStep: null,
      isComplete: true,
      bankDetailsAdded: true
    }
  },

  /**
   * Get pending onboarding tasks for an employee (post-onboarding dashboard checklist)
   * Returns status of document upload and banking details.
   */
  async getEmployeeOnboardingTasks(userId) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, pending_bank_details, onboarding_completed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) throw new BadRequestError('User not found')

    // Check for identity documents
    const member = await this._getEmployeeMember(userId)
    let docQuery = supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'identity')

    if (member) {
      docQuery = docQuery.eq('member_id', member.id)
    } else {
      docQuery = docQuery.eq('uploaded_by', userId)
    }

    const { count: docCount } = await docQuery

    const documentsUploaded = (docCount || 0) > 0
    const bankingDetailsAdded = !!profile.pending_bank_details

    return {
      documents: { completed: documentsUploaded },
      banking: { completed: bankingDetailsAdded },
      allComplete: documentsUploaded && bankingDetailsAdded
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
    if (org?.entity_status === 'approved') {
      throw new BadRequestError('Cannot upload documents after entity is approved')
    }

    // Validate file type
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowedMimes.includes(fileType)) {
      throw new BadRequestError('Invalid file type. Only PDF, PNG, and JPEG are allowed.')
    }

    // Decode base64 and sanitize filename
    const buffer = Buffer.from(fileBase64, 'base64')
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileExt = safeName.split('.').pop()
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
    if (org?.entity_status === 'approved') {
      throw new BadRequestError('Cannot delete documents after entity is approved')
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

    // Submit for admin review (no longer auto-approved)
    const now = new Date().toISOString()
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({
        entity_status: 'pending_review',
        entity_submitted_at: now,
        entity_rejection_reason: null
      })
      .eq('id', organizationId)
      .eq('owner_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[OnboardingService] Entity submit error:', updateError)
      throw new BadRequestError('Failed to submit entity for review')
    }

    // Send notification emails (fire-and-forget)
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', userId)
        .single()

      if (ownerProfile) {
        await emailService.sendEntitySubmittedEmail(ownerProfile.email, ownerProfile.first_name, updatedOrg.name)
      }
      await emailService.sendAdminEntitySubmittedNotification(updatedOrg.name, organizationId)

      // In-app notification for employer
      await notificationService.create({
        recipientId: userId,
        organizationId: organizationId,
        type: 'entity_submitted',
        title: 'Entity documents submitted',
        message: `Your documents for ${updatedOrg.name} are under review`,
        actionUrl: '/dashboard',
        metadata: { organization_id: organizationId }
      })
    } catch (emailErr) {
      console.error('[OnboardingService] Failed to send entity submission emails:', emailErr)
    }

    return updatedOrg
  }
}
