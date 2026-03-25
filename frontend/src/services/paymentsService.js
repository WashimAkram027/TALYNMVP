import api from './api'

export const paymentsService = {
  /**
   * GET /payments/config - Stripe publishable key
   */
  async getConfig() {
    const response = await api.get('/payments/config')
    return response.data
  },

  /**
   * POST /payments/setup-intent - Create SetupIntent for bank linking
   */
  async createSetupIntent(billingEmail) {
    const response = await api.post('/payments/setup-intent', {
      billingEmail: billingEmail || undefined
    })
    return response.data
  },

  /**
   * GET /payments/methods - List all payment methods
   */
  async getPaymentMethods() {
    const response = await api.get('/payments/methods')
    return response.data
  },

  /**
   * GET /payments/methods/active - Get default active payment method
   */
  async getActivePaymentMethod() {
    const response = await api.get('/payments/methods/active')
    return response.data
  }
}
