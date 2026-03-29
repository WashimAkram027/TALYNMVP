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

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      })

    if (uploadError) {
      console.error('[DocumentsService] Storage upload failed:', uploadError)
      throw uploadError
    }

    // Generate signed URL (not public) for secure access
    const { data: signedData } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year

    const fileUrl = signedData?.signedUrl || filePath

    // Create document record in database
    const documentRecord = {
      organization_id: orgId,
      member_id: metadata.memberId || null,
      name: metadata.name || file.originalname,
      description: metadata.description || null,
      file_url: fileUrl,
      file_type: file.mimetype,
      file_size: file.size,
      category: metadata.category || 'other',
      is_sensitive: metadata.isSensitive === 'true' || metadata.isSensitive === true,
      uploaded_by: uploadedBy
    }

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

    return data
  },

  /**
   * Get all documents for an organization with optional filters
   */
  async getAll(orgId, filters = {}) {
    // 1. Query org-level documents (member_id IS NULL).
    //    Employee-specific docs have member_id set and are accessed via getByMemberId.
    const isEntityFilter = filters.category === 'entity'
    let docs = []

    if (!isEntityFilter) {
      let query = supabase
        .from('documents')
        .select(`
          *,
          uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name, email)
        `)
        .eq('organization_id', orgId)
        .is('member_id', null)
        .order('created_at', { ascending: false })

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.search) query = query.ilike('name', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      docs = data || []
    }

    // 2. Also fetch entity documents (employer onboarding step 2: W9, articles, etc.)
    let entityDocs = []
    if (!filters.category || isEntityFilter) {
      let entityQuery = supabase
        .from('entity_documents')
        .select(`
          *,
          uploaded_by_profile:profiles!entity_documents_uploaded_by_fkey(full_name, email)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (filters.search) entityQuery = entityQuery.ilike('file_name', `%${filters.search}%`)

      const { data: eDocs, error: eError } = await entityQuery
      if (!eError && eDocs) {
        entityDocs = eDocs.map(ed => ({
          id: ed.id,
          name: ed.file_name,
          description: `Entity document: ${ed.doc_type.replace(/_/g, ' ')}`,
          file_url: ed.file_url,
          file_type: ed.file_type,
          file_size: ed.file_size,
          category: 'entity',
          is_sensitive: true,
          organization_id: ed.organization_id,
          member_id: null,
          uploaded_by: ed.uploaded_by,
          uploaded_by_profile: ed.uploaded_by_profile,
          created_at: ed.created_at,
          updated_at: ed.updated_at,
          _source: 'entity_documents',
          doc_type: ed.doc_type
        }))
      }
    }

    // 3. Merge and sort by created_at desc
    const all = [...docs, ...entityDocs]
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return all
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
   * Get a fresh download URL for a document.
   * Handles both public URLs and signed URLs (regenerates if needed).
   */
  async getDownloadUrl(docId, orgId) {
    // Try documents table first
    let doc = null
    const { data, error } = await supabase
      .from('documents')
      .select('id, name, file_url, organization_id')
      .eq('id', docId)
      .eq('organization_id', orgId)
      .single()

    if (!error && data) {
      doc = data
    } else {
      // Not in documents table — check entity_documents (onboarding step 2 docs)
      const { data: entityDoc, error: eErr } = await supabase
        .from('entity_documents')
        .select('id, file_name, file_url, organization_id')
        .eq('id', docId)
        .eq('organization_id', orgId)
        .single()

      if (!eErr && entityDoc) {
        doc = { id: entityDoc.id, name: entityDoc.file_name, file_url: entityDoc.file_url, organization_id: entityDoc.organization_id }
      }
    }

    if (!doc) return null

    const fileUrl = doc.file_url
    if (!fileUrl) return null

    // If it's a public URL, return as-is
    if (fileUrl.includes('/object/public/')) {
      return { url: fileUrl, name: doc.name }
    }

    // If it's a signed URL, extract the storage path and bucket, then generate a fresh one
    // Format: .../storage/v1/object/sign/{bucket}/{path}?token=...
    const signMatch = fileUrl.match(/\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/)
    if (signMatch) {
      const bucket = signMatch[1]
      const storagePath = decodeURIComponent(signMatch[2])
      const { data: signedData, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 60) // 1 hour expiry

      if (!error && signedData?.signedUrl) {
        return { url: signedData.signedUrl, name: doc.name }
      }
    }

    // Fallback: return stored URL as-is
    return { url: fileUrl, name: doc.name }
  },

  /**
   * Get documents for a specific member (also includes self-uploaded docs with no member_id)
   */
  async getByMemberId(memberId, orgId, userId = null) {
    let query = supabase
      .from('documents')
      .select(`
        *,
        uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (userId) {
      // Fetch docs assigned to this member OR self-uploaded with no member assignment
      // Always scoped to the organization to prevent cross-org access
      query = query
        .or(`member_id.eq.${memberId},and(uploaded_by.eq.${userId},member_id.is.null)`)
      if (orgId) query = query.eq('organization_id', orgId)
    } else {
      query = query.eq('member_id', memberId)
      if (orgId) query = query.eq('organization_id', orgId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }
}
