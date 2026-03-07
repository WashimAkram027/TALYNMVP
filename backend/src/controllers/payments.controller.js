import { paymentsService } from '../services/payments.service.js'
import { wiseService } from '../services/wise.service.js'
import { supabase } from '../config/supabase.js'
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
  },

  /**
   * POST /api/payments/bank-details
   * Submit bank details for the current employee (creates Wise recipient)
   */
  async submitBankDetails(req, res, next) {
    try {
      const userId = req.user.id

      // Only employees (candidates) can submit bank details — employers use Stripe
      if (req.user.role === 'employer') {
        return res.status(403).json({ success: false, message: 'Only employees can submit bank details' })
      }

      // Get the employee's membership
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id, organization_id')
        .eq('profile_id', userId)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return res.status(400).json({ success: false, message: 'No active membership found' })
      }

      const recipient = await wiseService.createRecipient(
        req.body,
        membership.id,
        membership.organization_id
      )

      return successResponse(res, recipient, 'Bank details saved successfully')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/payments/bank-details
   * Get bank details for the current employee
   */
  async getBankDetails(req, res, next) {
    try {
      const userId = req.user.id

      // Get the employee's membership
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id, organization_id')
        .eq('profile_id', userId)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return successResponse(res, null, 'No active membership found')
      }

      const recipient = await wiseService.getRecipientByMemberId(
        membership.id,
        membership.organization_id
      )

      return successResponse(res, recipient, recipient ? 'Bank details found' : 'No bank details on file')
    } catch (error) {
      next(error)
    }
  }
}
