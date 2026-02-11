/**
 * Standardized API response helpers
 */

export function successResponse(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    error: null
  })
}

export function errorResponse(res, message = 'An error occurred', statusCode = 500, error = null) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: error?.message || error || message
  })
}

export function createdResponse(res, data, message = 'Created successfully') {
  return successResponse(res, data, message, 201)
}

export function noContentResponse(res) {
  return res.status(204).send()
}

export function badRequestResponse(res, message = 'Bad request', error = null) {
  return errorResponse(res, message, 400, error)
}

export function unauthorizedResponse(res, message = 'Unauthorized') {
  return errorResponse(res, message, 401)
}

export function forbiddenResponse(res, message = 'Forbidden') {
  return errorResponse(res, message, 403)
}

export function notFoundResponse(res, message = 'Not found') {
  return errorResponse(res, message, 404)
}

export function conflictResponse(res, message = 'Conflict') {
  return errorResponse(res, message, 409)
}

export function validationErrorResponse(res, errors) {
  return res.status(422).json({
    success: false,
    data: null,
    message: 'Validation failed',
    error: errors
  })
}
