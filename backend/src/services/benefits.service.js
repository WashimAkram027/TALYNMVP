import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const benefitsService = {
  async getPlans(orgId, activeOnly = true) {
    let query = supabase
      .from('benefits_plans')
      .select('*')
      .eq('organization_id', orgId)
      .order('name')

    if (activeOnly) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getPlan(planId, orgId) {
    const { data, error } = await supabase
      .from('benefits_plans')
      .select('*')
      .eq('id', planId)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Plan not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async createPlan(orgId, plan) {
    const { data, error } = await supabase
      .from('benefits_plans')
      .insert({ ...plan, organization_id: orgId })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updatePlan(planId, orgId, updates) {
    const { data, error } = await supabase
      .from('benefits_plans')
      .update(updates)
      .eq('id', planId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Plan not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async deletePlan(planId, orgId) {
    const { error } = await supabase
      .from('benefits_plans')
      .delete()
      .eq('id', planId)
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)
    return { success: true }
  },

  async getMemberEnrollments(memberId, orgId) {
    // Verify member belongs to org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) throw new NotFoundError('Member not found')

    const { data, error } = await supabase
      .from('benefits_enrollments')
      .select(`
        *,
        plan:benefits_plans!benefits_enrollments_plan_id_fkey(*)
      `)
      .eq('member_id', memberId)

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getPlanEnrollments(planId, orgId) {
    // Verify plan belongs to org
    await this.getPlan(planId, orgId)

    const { data, error } = await supabase
      .from('benefits_enrollments')
      .select(`
        *,
        member:organization_members!benefits_enrollments_member_id_fkey(
          profile:profiles!organization_members_profile_id_fkey(full_name, email)
        )
      `)
      .eq('plan_id', planId)

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async enrollMember(memberId, planId, orgId, coverageStartDate) {
    // Verify member belongs to org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) throw new NotFoundError('Member not found')

    // Verify plan belongs to org
    await this.getPlan(planId, orgId)

    const { data, error } = await supabase
      .from('benefits_enrollments')
      .insert({
        member_id: memberId,
        plan_id: planId,
        status: 'pending',
        coverage_start_date: coverageStartDate
      })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updateEnrollment(enrollmentId, orgId, updates) {
    // Get enrollment with plan to verify org
    const { data: enrollment, error: fetchError } = await supabase
      .from('benefits_enrollments')
      .select('plan:benefits_plans!benefits_enrollments_plan_id_fkey(organization_id)')
      .eq('id', enrollmentId)
      .single()

    if (fetchError || !enrollment) throw new NotFoundError('Enrollment not found')
    if (enrollment.plan?.organization_id !== orgId) throw new NotFoundError('Enrollment not found')

    if (updates.status === 'active' && !updates.enrolled_at) {
      updates.enrolled_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('benefits_enrollments')
      .update(updates)
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async cancelEnrollment(enrollmentId, orgId, coverageEndDate = null) {
    // Get enrollment with plan to verify org
    const { data: enrollment, error: fetchError } = await supabase
      .from('benefits_enrollments')
      .select('plan:benefits_plans!benefits_enrollments_plan_id_fkey(organization_id)')
      .eq('id', enrollmentId)
      .single()

    if (fetchError || !enrollment) throw new NotFoundError('Enrollment not found')
    if (enrollment.plan?.organization_id !== orgId) throw new NotFoundError('Enrollment not found')

    const { data, error } = await supabase
      .from('benefits_enrollments')
      .update({
        status: 'cancelled',
        coverage_end_date: coverageEndDate || new Date().toISOString().split('T')[0]
      })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getActiveCoverage(memberId, orgId) {
    // Verify member belongs to org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) throw new NotFoundError('Member not found')

    const { data, error } = await supabase
      .from('benefits_enrollments')
      .select(`
        id, status, coverage_start_date,
        plan:benefits_plans!benefits_enrollments_plan_id_fkey(name, plan_type, provider)
      `)
      .eq('member_id', memberId)
      .eq('status', 'active')

    if (error) throw new BadRequestError(error.message)
    return data
  }
}
