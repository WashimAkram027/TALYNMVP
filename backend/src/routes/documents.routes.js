import { Router } from 'express'
import multer from 'multer'
import { documentsController } from '../controllers/documents.controller.js'
import { authenticate, requireOrganization, requireEmployer } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { updateDocumentSchema } from '../utils/validators.js'

const router = Router()

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, PNG, JPG, JPEG
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPG files are allowed.'), false)
    }
  }
})

// Authentication required for all routes
router.use(authenticate)

/**
 * GET /api/documents/my
 * Get documents uploaded by the current user (works without org membership)
 */
router.get('/my', documentsController.getMyDocuments)

// Remaining routes require organization membership
router.use(requireOrganization)

/**
 * POST /api/documents/upload
 * Upload a new document
 * Body (multipart/form-data):
 *   - file: The file to upload
 *   - name: Optional display name
 *   - description: Optional description
 *   - category: contract | policy | tax | identity | payslip | other
 *   - memberId: Optional member to associate with
 *   - isSensitive: Whether the document is sensitive
 */
const VALID_CATEGORIES = ['contract', 'policy', 'tax', 'identity', 'payslip', 'other']

router.post('/upload', requireEmployer, upload.single('file'), (req, res, next) => {
  if (req.body.category && !VALID_CATEGORIES.includes(req.body.category)) {
    return res.status(400).json({ success: false, error: 'Invalid document category' })
  }
  next()
}, documentsController.upload)

/**
 * GET /api/documents
 * Get all documents for the organization
 * Query params: category, memberId, search
 */
router.get('/', documentsController.getAll)

/**
 * GET /api/documents/member/:memberId
 * Get all documents for a specific member
 */
router.get('/member/:memberId', documentsController.getByMember)

/**
 * GET /api/documents/:id/download
 * Get a fresh download URL for a document
 */
router.get('/:id/download', documentsController.download)

/**
 * GET /api/documents/:id
 * Get a single document by ID
 */
router.get('/:id', documentsController.getById)

/**
 * PUT /api/documents/:id
 * Update document metadata
 */
router.put('/:id', requireEmployer, validateBody(updateDocumentSchema), documentsController.update)

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', requireEmployer, documentsController.delete)

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      })
    }
    return res.status(400).json({
      success: false,
      error: error.message
    })
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    })
  }

  next(error)
})

export default router
