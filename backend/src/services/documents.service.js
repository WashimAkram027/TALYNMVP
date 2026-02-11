import { supabase } from '../config/supabase.js'

/**
 * Documents Service
 * Handles all document-related database and storage operations
 */
export const documentsService = {
  /**
   * Upload a document to storage and create a record in the database
   */
  async upload(orgId, file, metadata, uploadedBy) {
    // Generate unique filename
    const fileExt = file.originalname.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${orgId}/${fileName}`

    console.log('[DocumentsService] Uploading file:', { orgId, fileName, filePath })

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      })

    if (uploadError) {
      console.error('[DocumentsService] Storage upload failed:', uploadError)
      throw uploadError
    }

    console.log('[DocumentsService] Storage upload successful:', uploadData)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    console.log('[DocumentsService] Public URL:', publicUrl)

    // Create document record in database
    const documentRecord = {
      organization_id: orgId,
      member_id: metadata.memberId || null,
      name: metadata.name || file.originalname,
      description: metadata.description || null,
      file_url: publicUrl,
      file_type: file.mimetype,
      file_size: file.size,
      category: metadata.category || 'other',
      is_sensitive: metadata.isSensitive === 'true' || metadata.isSensitive === true,
      uploaded_by: uploadedBy
    }

    console.log('[DocumentsService] Creating document record:', documentRecord)

    const { data, error } = await supabase
      .from('documents')
      .insert(documentRecord)
      .select()
      .single()

    if (error) {
      console.error('[DocumentsService] Database insert failed:', error)
      // Try to clean up the uploaded file
      await supabase.storage.from('documents').remove([filePath])
      throw error
    }

    console.log('[DocumentsService] Document record created:', data)
    return data
  },

  /**
   * Get all documents for an organization with optional filters
   */
  async getAll(orgId, filters = {}) {
    let query = supabase
      .from('documents')
      .select(`
        *,
        member:organization_members!documents_member_id_fkey(
          id,
          profile:profiles!organization_members_profile_id_fkey(full_name, email)
        ),
        uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name, email)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.memberId) {
      query = query.eq('member_id', filters.memberId)
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  /**
   * Get a single document by ID
   */
  async getById(docId, orgId) {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        member:organization_members!documents_member_id_fkey(
          id,
          profile:profiles!organization_members_profile_id_fkey(full_name, email)
        ),
        uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name, email)
      `)
      .eq('id', docId)
      .eq('organization_id', orgId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update document metadata
   */
  async update(docId, orgId, updates) {
    const allowedFields = ['name', 'description', 'category', 'is_sensitive']
    const filteredUpdates = {}

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .update(filteredUpdates)
      .eq('id', docId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a document (both storage file and database record)
   */
  async delete(docId, orgId) {
    // First get the document to find the file URL
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', docId)
      .eq('organization_id', orgId)
      .single()

    if (fetchError) throw fetchError

    if (!doc) {
      throw new Error('Document not found')
    }

    // Extract path from URL and delete from storage
    if (doc.file_url) {
      try {
        // URL format: https://xxx.supabase.co/storage/v1/object/public/documents/orgId/filename
        const urlParts = doc.file_url.split('/documents/')
        if (urlParts[1]) {
          const filePath = urlParts[1]
          console.log('[DocumentsService] Deleting file from storage:', filePath)
          await supabase.storage.from('documents').remove([filePath])
        }
      } catch (storageError) {
        console.error('[DocumentsService] Storage delete error:', storageError)
        // Continue with database delete even if storage delete fails
      }
    }

    // Delete the database record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId)
      .eq('organization_id', orgId)

    if (error) throw error
    return { success: true }
  },

  /**
   * Get documents for a specific member
   */
  async getByMemberId(memberId, orgId) {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name, email)
      `)
      .eq('member_id', memberId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}
