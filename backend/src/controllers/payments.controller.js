import { paymentsService } from '../services/payments.service.js'
import { successResponse } from '../utils/response.js'

export const paymentsController = {
  /**
   * GET /api/payments/config
   * Returns Stripe publishable key for frontend initialization
   */
  async getConfig(req, res, next) {
    try {
      const config = paymentsService.getConfig()
      return successResponse(res, config, 'Payment config retrieved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/payments/setup-intent
   * Creates a Stripe SetupIntent for US bank account linking
   */
  async createSetupIntent(req, res, next) {
    try {
      const orgId = req.user.organizationId
      const result = await paymentsService.createSetupIntent(orgId)
      return successResponse(res, result, 'Setup intent created')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/payments/confirm-setup
   * Synchronously confirms a SetupIntent and activates the payment method
   */
  async confirmSetup(req, res, next) {
    try {
      const orgId = req.user.organizationId
      const { setupIntentId } = req.body
      const method = await paymentsService.confirmSetupIntent(orgId, setupIntentId)
      return successResponse(res, method, 'Payment method activated')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/payments/methods
   * Returns all payment methods for the org
   */
  async getPaymentMethods(req, res, next) {
    try {
      const orgId = req.user.organizationId
      const methods = await paymentsService.getPaymentMethods(orgId)
      return successResponse(res, methods, 'Payment methods retrieved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/payments/methods/active
   * Returns the default active payment method or null
   */
  async getActivePaymentMethod(req, res, next) {
    try {
      const orgId = req.user.organizationId
      const method = await paymentsService.getActivePaymentMethod(orgId)
      return successResponse(res, method, method ? 'Active payment method found' : 'No active payment method')
    } catch (error) {
      next(error)
    }
  }
}
