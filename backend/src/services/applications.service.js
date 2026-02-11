import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const applicationsService = {
  async getApplicationsByJob(jobId, orgId, filters = {}) {
    // Verify job belongs to org
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id')
      .eq('id', jobId)
      .eq('organization_id', orgId)
      .single()

    if (jobError || !job) throw new NotFoundError('Job posting not found')

    let query = supabase
      .from('applications')
      .select(`
        *,
        candidate:profiles!applications_candidate_id_fkey(id, full_name, email, avatar_url, phone, linkedin_url)
      `)
      .eq('job_posting_id', jobId)
      .order('applied_at', { ascending: false })

    if (filters.stage) query = query.eq('stage', filters.stage)

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getMyApplications(candidateId) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job:job_postings!applications_job_posting_id_fkey(
          id, title, department, location, employment_type,
          organization:organizations!job_postings_organization_id_fkey(name, logo_url)
        )
      `)
      .eq('candidate_id', candidateId)
      .order('applied_at', { ascending: false })

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getApplication(applicationId, orgId = null) {
    let query = supabase
      .from('applications')
      .select(`
        *,
        candidate:profiles!applications_candidate_id_fkey(*),
        job:job_postings!applications_job_posting_id_fkey(
          *,
          organization:organizations!job_postings_organization_id_fkey(name, logo_url)
        )
      `)
      .eq('id', applicationId)

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Application not found')
      throw new BadRequestError(error.message)
    }

    // Verify org access if orgId provided
    if (orgId && data.job?.organization?.id !== orgId) {
      throw new NotFoundError('Application not found')
    }

    return data
  },

  async applyToJob(jobId, candidateId, applicationData) {
    // Check if already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_posting_id', jobId)
      .eq('candidate_id', candidateId)
      .maybeSingle()

    if (existing) throw new BadRequestError('You have already applied to this job')

    const { data, error } = await supabase
      .from('applications')
      .insert({
        job_posting_id: jobId,
        candidate_id: candidateId,
        ...applicationData,
        stage: 'applied',
        applied_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async moveStage(applicationId, orgId, newStage, notes = null, userId = null) {
    // Verify app belongs to org
    const app = await this.getApplication(applicationId, orgId)

    try {
      const { data, error } = await supabase.rpc('move_application_stage', {
        p_application_id: applicationId,
        p_new_stage: newStage,
        p_notes: notes
      })
      if (error) throw error
      return data
    } catch {
      // Fallback to direct update
      const { data, error } = await supabase
        .from('applications')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
        .single()

      if (error) throw new BadRequestError(error.message)
      return data
    }
  },

  async updateApplication(applicationId, orgId, updates) {
    // Verify ownership
    await this.getApplication(applicationId, orgId)

    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getActivityHistory(applicationId) {
    const { data, error } = await supabase
      .from('application_activities')
      .select(`
        *,
        created_by_profile:profiles!application_activities_created_by_fkey(full_name, avatar_url)
      `)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getPipelineSummary(orgId) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        stage,
        job:job_postings!applications_job_posting_id_fkey!inner(organization_id)
      `)
      .eq('job.organization_id', orgId)

    if (error) throw new BadRequestError(error.message)

    const summary = data.reduce((acc, app) => {
      acc[app.stage] = (acc[app.stage] || 0) + 1
      return acc
    }, {})

    return summary
  },

  async hasApplied(jobId, candidateId) {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_posting_id', jobId)
      .eq('candidate_id', candidateId)
      .maybeSingle()

    if (error) throw new BadRequestError(error.message)
    return !!data
  }
}
