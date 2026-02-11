import { Router } from 'express'
import multer from 'multer'
import { profileController } from '../controllers/profile.controller.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import {
  completeEmployerSchema,
  completeCandidateSchema,
  updateProfileSchema
} from '../utils/validators.js'
import { z } from 'zod'

const router = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for avatars/resumes
  },
  fileFilter: (req, file, cb) => {
    // Avatar: images only
    if (req.path === '/avatar') {
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('Invalid file type. Only PNG, JPG, GIF, and WebP images are allowed.'), false)
      }
    }
    // Resume: PDF and docs
    else if (req.path === '/resume') {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false)
      }
    } else {
      cb(null, true)
    }
  }
})

// All routes require authentication
router.use(authenticate)

// Profile routes
router.get('/', profileController.getProfile)
router.put('/', validateBody(updateProfileSchema), profileController.updateProfile)

// Onboarding completion
router.post('/complete-employer', validateBody(completeEmployerSchema), profileController.completeEmployer)
router.post('/complete-candidate', validateBody(completeCandidateSchema), profileController.completeCandidate)

// Email check
router.post('/check-email',
  validateBody(z.object({ email: z.string().email() })),
  profileController.checkEmail
)

// File uploads with multer
router.post('/avatar', upload.single('file'), profileController.uploadAvatar)
router.post('/resume', upload.single('file'), profileController.uploadResume)

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
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
