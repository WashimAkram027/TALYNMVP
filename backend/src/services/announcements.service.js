import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const announcementsService = {
  async getAnnouncements(orgId, filters = {}) {
    let query = supabase
      .from('announcements')
      .select(`
        *,
        author:profiles!announcements_author_id_fkey(full_name, avatar_url)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (filters.publishedOnly) {
      query = query
        .eq('is_published', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getAnnouncement(announcementId, orgId) {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        author:profiles!announcements_author_id_fkey(full_name, avatar_url)
      `)
      .eq('id', announcementId)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Announcement not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async createAnnouncement(orgId, announcement, authorId) {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        ...announcement,
        organization_id: orgId,
        author_id: authorId,
        published_at: announcement.is_published ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updateAnnouncement(announcementId, orgId, updates) {
    if (updates.is_published) {
      const { data: current } = await supabase
        .from('announcements')
        .select('published_at')
        .eq('id', announcementId)
        .single()

      if (!current?.published_at) {
        updates.published_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', announcementId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Announcement not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async deleteAnnouncement(announcementId, orgId) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)
    return { success: true }
  },

  async togglePin(announcementId, orgId) {
    const { data: current, error: fetchError } = await supabase
      .from('announcements')
      .select('is_pinned')
      .eq('id', announcementId)
      .eq('organization_id', orgId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') throw new NotFoundError('Announcement not found')
      throw new BadRequestError(fetchError.message)
    }

    const { data, error } = await supabase
      .from('announcements')
      .update({ is_pinned: !current.is_pinned })
      .eq('id', announcementId)
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getRecentAnnouncements(orgId, limit = 5) {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, published_at, is_pinned')
      .eq('organization_id', orgId)
      .eq('is_published', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) throw new BadRequestError(error.message)
    return data
  }
}
