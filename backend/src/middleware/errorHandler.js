import { env } from '../config/env.js'
import { AppError, ValidationError } from '../utils/errors.js'

/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error in development
  if (env.isDev) {
    console.error('Error:', err)
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      data: null,
      message: 'Validation failed',
      error: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    })
  }

  // Handle custom validation errors
  if (err instanceof ValidationError) {
    return res.status(422).json({
      success: false,
      data: null,
      message: 'Validation failed',
      error: err.errors
    })
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
      error: env.isDev ? err.stack : null
    })
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Invalid token',
      error: null
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Token expired',
      error: null
    })
  }

  // Handle Supabase errors
  if (err.code && err.message) {
    const statusCode = err.code === 'PGRST116' ? 404 : 400
    return res.status(statusCode).json({
      success: false,
      data: null,
      message: err.message,
      error: env.isDev ? err.details : null
    })
  }

  // Default error response
  return res.status(500).json({
    success: false,
    data: null,
    message: env.isDev ? err.message : 'Internal server error',
    error: env.isDev ? err.stack : null
  })
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    message: `Route ${req.method} ${req.path} not found`,
    error: null
  })
}
