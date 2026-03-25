import Stripe from 'stripe'
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

  // Handle Stripe errors (before generic checks to avoid false matches on err.code)
  if (err instanceof Stripe.errors.StripeError) {
    const statusCode = err.statusCode || 500
    // Never expose raw Stripe error details to clients in production
    const message = err instanceof Stripe.errors.StripeAuthenticationError
      ? 'Payment service configuration error. Please contact support.'
      : err instanceof Stripe.errors.StripeRateLimitError
        ? 'Payment service temporarily unavailable. Please try again shortly.'
        : err instanceof Stripe.errors.StripeConnectionError
          ? 'Unable to reach payment service. Please try again.'
          : err.message || 'Payment processing error'
    return res.status(statusCode >= 500 ? 502 : statusCode).json({
      success: false,
      data: null,
      message,
      error: env.isDev ? { type: err.type, code: err.code, requestId: err.requestId } : null
    })
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
