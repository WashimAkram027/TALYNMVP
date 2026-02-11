/**
 * Request validation middleware using Zod schemas
 */

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body
        : source === 'query' ? req.query
        : source === 'params' ? req.params
        : req.body

      const result = schema.safeParse(data)

      if (!result.success) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Validation failed',
          error: result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        })
      }

      // Replace with parsed/transformed data
      if (source === 'body') req.body = result.data
      else if (source === 'query') req.query = result.data
      else if (source === 'params') req.params = result.data

      next()
    } catch (error) {
      next(error)
    }
  }
}

export const validateBody = (schema) => validate(schema, 'body')
export const validateQuery = (schema) => validate(schema, 'query')
export const validateParams = (schema) => validate(schema, 'params')
