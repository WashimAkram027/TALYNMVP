import { supabase } from '../../config/supabase.js'
import { NotFoundError, BadRequestError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'
import { emailService } from '../email.service.js'

export const adminOrganizationsService = {
  /**
   * List all organizations with filters and pagination
   */
  async listOrgs({ page = 1, limit = 20, search, status, entityStatus, industry, sortBy = 'created_at', sortOrder = 'desc' }) {
    let query = supabase
      .from('organizations')
      .select('id, name, email, industry, status, entity_status, entity_submitted_at, entity_reviewed_at, created_at, owner_id, owner:profiles!fk_organizations_owner(id, email, first_name, last_name)', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (status) query = query.eq('status', status)
    if (entityStatus) query = query.eq('entity_status', entityStatus)
    if (industry) query = query.eq('industry', industry)

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
   * Get organization detail with related data
   */
  async getOrgDetail(orgId) {
    const { data: org, error } = await supabase
      .from('organizations')
      .select(`
        *,
        owner:profiles!fk_organizations_owner(id, email, first_name, last_name, phone)
      `)
      .eq('id', orgId)
      .single()

    if (error || !org) throw new NotFoundError('Organization not found')

    // Get member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    return { ...org, memberCount: memberCount || 0 }
  },

  /**
   * Get entity verification details for an org
   */
  async getEntityDetails(orgId) {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, entity_status, entity_submitted_at, entity_reviewed_at, entity_reviewed_by, entity_rejection_reason, legal_name, registration_number, address_line1, address_line2, city, state, postal_code, country')
      .eq('id', orgId)
      .single()

    if (error || !org) throw new NotFoundError('Organization not found')

    // Get entity documents
    const { data: docs } = await supabase
      .from('entity_documents')
      .select('id, doc_type, file_url, file_name, file_type, file_size, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    // Generate signed URLs for private bucket documents
    const BUCKET = 'enitity-document'
    const docsWithSignedUrls = await Promise.all(
      (docs || []).map(async (doc) => {
        try {
          // Extract storage path from the stored URL
          const bucketPrefix = `/object/public/${BUCKET}/`
          const idx = doc.file_url?.indexOf(bucketPrefix)
          if (idx === -1 || !doc.file_url) return doc

          const storagePath = decodeURIComponent(doc.file_url.substring(idx + bucketPrefix.length))
          const { data: signedData, error: signError } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(storagePath, 3600) // 1 hour expiry

          if (signError || !signedData?.signedUrl) return doc
          return { ...doc, file_url: signedData.signedUrl }
        } catch {
          return doc
        }
      })
    )

    return { ...org, documents: docsWithSignedUrls }
  },

  /**
   * Approve entity verification
   */
  async approveEntity(orgId, adminId, ip) {
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, entity_status, name')
      .eq('id', orgId)
      .single()

    if (fetchError || !org) throw new NotFoundError('Organization not found')
    if (org.entity_status === 'approved') throw new BadRequestError('Entity already approved')

    const { data: updated, error } = await supabase
      .from('organizations')
      .update({
        entity_status: 'approved',
        entity_reviewed_at: new Date().toISOString(),
        entity_reviewed_by: adminId,
        entity_rejection_reason: null
      })
      .eq('id', orgId)
      .select()
      .single()

    if (error) throw error

    await auditLogService.log(adminId, 'entity_approved', 'organization', orgId, { orgName: org.name }, ip)

    // Send approval email to org owner (fire-and-forget)
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', updated.owner_id)
        .single()

      if (ownerProfile) {
        await emailService.sendEntityApprovedEmail(ownerProfile.email, ownerProfile.first_name, org.name)
      }
    } catch (emailErr) {
      console.error('[AdminOrganizationsService] Failed to send approval email:', emailErr)
    }

    return updated
  },

  /**
   * Reject entity verification
   */
  async rejectEntity(orgId, adminId, reason, ip) {
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, entity_status, name')
      .eq('id', orgId)
      .single()

    if (fetchError || !org) throw new NotFoundError('Organization not found')

    const { data: updated, error } = await supabase
      .from('organizations')
      .update({
        entity_status: 'rejected',
        entity_reviewed_at: new Date().toISOString(),
        entity_reviewed_by: adminId,
        entity_rejection_reason: reason
      })
      .eq('id', orgId)
      .select()
      .single()

    if (error) throw error

    await auditLogService.log(adminId, 'entity_rejected', 'organization', orgId, { orgName: org.name, reason }, ip)

    // Send rejection email to org owner (fire-and-forget)
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', updated.owner_id)
        .single()

      if (ownerProfile) {
        await emailService.sendEntityRejectedEmail(ownerProfile.email, ownerProfile.first_name, org.name, reason)
      }
    } catch (emailErr) {
      console.error('[AdminOrganizationsService] Failed to send rejection email:', emailErr)
    }

    return updated
  },

  /**
   * Get org members
   */
  async getOrgMembers(orgId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit
    const { data, error, count } = await supabase
      .from('organization_members')
      .select('*, profile:profiles!organization_members_profile_id_fkey(id, email, first_name, last_name, avatar_url)', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw error
    return { data: data || [], total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) }
  },

  /**
   * Get org payment methods
   */
  async getOrgPaymentMethods(orgId) {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get org payroll runs
   */
  async getOrgPayrollRuns(orgId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit
    const { data, error, count } = await supabase
      .from('payroll_runs')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw error
    return { data: data || [], total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) }
  },

  /**
   * Update organization fields
   */
  async updateOrg(orgId, updates, adminId, ip) {
    const allowedFields = ['name', 'email', 'phone', 'website', 'industry', 'billing_email']
    const filtered = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) filtered[key] = updates[key]
    }
    if (Object.keys(filtered).length === 0) throw new BadRequestError('No valid fields to update')

    const { data, error } = await supabase
      .from('organizations')
      .update(filtered)
      .eq('id', orgId)
      .select()
      .single()

    if (error) throw error

    await auditLogService.log(adminId, 'org_updated', 'organization', orgId, { updatedFields: Object.keys(filtered) }, ip)
    return data
  },

  /**
   * Suspend an organization
   */
  async suspendOrg(orgId, adminId, reason, ip) {
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, status')
      .eq('id', orgId)
      .single()

    if (fetchError || !org) throw new NotFoundError('Organization not found')
    if (org.status === 'suspended') throw new BadRequestError('Organization is already suspended')

    const { error } = await supabase
      .from('organizations')
      .update({ status: 'suspended' })
      .eq('id', orgId)

    if (error) throw error

    await auditLogService.log(adminId, 'org_suspended', 'organization', orgId, { name: org.name, reason }, ip)
    return { success: true }
  },

  /**
   * Reactivate a suspended organization
   */
  async reactivateOrg(orgId, adminId, ip) {
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, status')
      .eq('id', orgId)
      .single()

    if (fetchError || !org) throw new NotFoundError('Organization not found')
    if (org.status === 'active') throw new BadRequestError('Organization is already active')

    const { error } = await supabase
      .from('organizations')
      .update({ status: 'active' })
      .eq('id', orgId)

    if (error) throw error

    await auditLogService.log(adminId, 'org_reactivated', 'organization', orgId, { name: org.name }, ip)
    return { success: true }
  }
}
