import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const jobPostingsService = {
  async getJobPostings(orgId, filters = {}) {
    let query = supabase
      .from('job_postings')
      .select(`
        *,
        created_by_profile:profiles!job_postings_created_by_fkey(full_name)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.department) query = query.eq('department', filters.department)

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getPublicJobPostings(filters = {}) {
    let query = supabase
      .from('job_postings')
      .select(`
        *,
        organization:organizations!job_postings_organization_id_fkey(name, logo_url, city, country)
      `)
      .eq('status', 'open')
      .order('published_at', { ascending: false })

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }
    if (filters.employmentType) query = query.eq('employment_type', filters.employmentType)
    if (filters.isRemote !== undefined) query = query.eq('is_remote', filters.isRemote)
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getJobPosting(jobId, orgId = null) {
    let query = supabase
      .from('job_postings')
      .select(`
        *,
        organization:organizations!job_postings_organization_id_fkey(name, logo_url, city, country, website),
        created_by_profile:profiles!job_postings_created_by_fkey(full_name)
      `)
      .eq('id', jobId)

    if (orgId) query = query.eq('organization_id', orgId)

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Job posting not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async createJobPosting(orgId, jobPosting, createdBy) {
    const { data, error } = await supabase
      .from('job_postings')
      .insert({ ...jobPosting, organization_id: orgId, created_by: createdBy })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updateJobPosting(jobId, orgId, updates) {
    if (updates.status === 'open') {
      const { data: current } = await supabase
        .from('job_postings')
        .select('published_at')
        .eq('id', jobId)
        .single()

      if (!current?.published_at) {
        updates.published_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('job_postings')
      .update(updates)
      .eq('id', jobId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Job posting not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async deleteJobPosting(jobId, orgId) {
    const { error } = await supabase
      .from('job_postings')
      .delete()
      .eq('id', jobId)
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)
    return { success: true }
  },

  async getDepartments(orgId) {
    const { data, error } = await supabase
      .from('job_postings')
      .select('department')
      .eq('organization_id', orgId)
      .not('department', 'is', null)

    if (error) throw new BadRequestError(error.message)

    const departments = [...new Set(data.map(d => d.department))]
    return departments.sort()
  },

  async updateApplicationCount(jobId) {
    const { count, error: countError } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('job_posting_id', jobId)

    if (countError) throw new BadRequestError(countError.message)

    const { data, error } = await supabase
      .from('job_postings')
      .update({ applications_count: count })
      .eq('id', jobId)
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  }
}
