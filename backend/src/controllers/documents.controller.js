import { documentsService } from '../services/documents.service.js'
import { supabase } from '../config/supabase.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse
} from '../utils/response.js'

/**
 * Documents Controller
 * Handles HTTP requests for document management
 */
export const documentsController = {
  /**
   * POST /api/documents/upload
   * Upload a new document
   */
  async upload(req, res) {
    try {
      console.log('[DocumentsController] Upload request received')
      console.log('[DocumentsController] File:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file')
      console.log('[DocumentsController] Body:', req.body)

      if (!req.file) {
        return badRequestResponse(res, 'No file provided')
      }

      const metadata = {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category || 'other',
        memberId: req.body.memberId || null,
        isSensitive: req.body.isSensitive
      }

      // Verify the target member belongs to the caller's organization
      if (metadata.memberId) {
        const { data: targetMember, error: memberErr } = await supabase
          .from('organization_members')
          .select('id')
          .eq('id', metadata.memberId)
          .eq('organization_id', req.user.organizationId)
          .single()

        if (memberErr || !targetMember) {
          return forbiddenResponse(res, 'Member does not belong to your organization')
        }
      }

      const document = await documentsService.upload(
        req.user.organizationId,
        req.file,
        metadata,
        req.user.id
      )

      return createdResponse(res, document, 'Document uploaded successfully')
    } catch (error) {
      console.error('[DocumentsController] Upload error:', error)
      return errorResponse(res, 'Failed to upload document', 500, error)
    }
  },

  /**
   * GET /api/documents
   * Get all documents for the organization
   */
  async getAll(req, res) {
    try {
      const filters = {
        category: req.query.category,
        memberId: req.query.memberId,
        search: req.query.search
      }

      const documents = await documentsService.getAll(req.user.organizationId, filters)

      return successResponse(res, documents)
    } catch (error) {
      console.error('[DocumentsController] GetAll error:', error)
      return errorResponse(res, 'Failed to get documents', 500, error)
    }
  },

  /**
   * GET /api/documents/:id
   * Get a single document by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params

      const document = await documentsService.getById(id, req.user.organizationId)

      if (!document) {
        return notFoundResponse(res, 'Document not found')
      }

      return successResponse(res, document)
    } catch (error) {
      console.error('[DocumentsController] GetById error:', error)
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Document not found')
      }
      return errorResponse(res, 'Failed to get document', 500, error)
    }
  },

  /**
   * PUT /api/documents/:id
   * Update document metadata
   */
  async update(req, res) {
    try {
      const { id } = req.params

      const document = await documentsService.update(id, req.user.organizationId, req.body)

      if (!document) {
        return notFoundResponse(res, 'Document not found')
      }

      return successResponse(res, document, 'Document updated successfully')
    } catch (error) {
      console.error('[DocumentsController] Update error:', error)
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Document not found')
      }
      return errorResponse(res, 'Failed to update document', 500, error)
    }
  },

  /**
   * DELETE /api/documents/:id
   * Delete a document
   */
  async delete(req, res) {
    try {
      const { id } = req.params

      await documentsService.delete(id, req.user.organizationId)

      return successResponse(res, null, 'Document deleted successfully')
    } catch (error) {
      console.error('[DocumentsController] Delete error:', error)
      if (error.message === 'Document not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to delete document', 500, error)
    }
  },

  /**
   * GET /api/documents/member/:memberId
   * Get all documents for a specific member
   */
  async getByMember(req, res) {
    try {
      const { memberId } = req.params

      const documents = await documentsService.getByMemberId(memberId, req.user.organizationId)

      return successResponse(res, documents)
    } catch (error) {
      console.error('[DocumentsController] GetByMember error:', error)
      return errorResponse(res, 'Failed to get member documents', 500, error)
    }
  }
}
