import { stripe } from '../config/stripe.js'
import { env } from '../config/env.js'
import { webhooksService } from '../services/webhooks.service.js'

export const webhooksController = {
  /**
   * POST /api/webhooks/stripe
   * Handles incoming Stripe webhook events.
   * Raw body required for signature verification.
   */
  async handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature']

    if (!sig) {
      console.error('Stripe webhook: missing signature header')
      return res.status(400).json({ error: 'Missing stripe-signature header' })
    }

    if (!stripe) {
      console.error('Stripe webhook: Stripe SDK not configured')
      return res.status(500).json({ error: 'Stripe not configured' })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        env.stripeWebhookSecret
      )
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err.message)
      return res.status(400).json({ error: 'Webhook signature verification failed' })
    }

    // Process the event BEFORE returning 200 so failures trigger Stripe retries
    try {
      await webhooksService.processStripeEvent(event)
      return res.status(200).json({ received: true })
    } catch (error) {
      console.error(`Failed to process Stripe event ${event.id}:`, error)
      // Return 500 so Stripe retries the webhook delivery
      return res.status(500).json({ error: 'Webhook processing failed' })
    }
  }
}
