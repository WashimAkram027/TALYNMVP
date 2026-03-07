import crypto from 'crypto'
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
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` })
    }

    // Return 200 immediately — Stripe retries on non-2xx
    res.status(200).json({ received: true })

    // Process asynchronously
    try {
      await webhooksService.processStripeEvent(event)
    } catch (error) {
      console.error(`Failed to process Stripe event ${event.id}:`, error)
    }
  },

  /**
   * POST /api/webhooks/wise
   * Handles incoming Wise webhook events.
   * Raw body required for RSA-SHA256 signature verification.
   */
  async handleWiseWebhook(req, res) {
    const signature = req.headers['x-signature-sha256'] || req.headers['x-signature']

    if (!signature) {
      console.error('Wise webhook: missing signature header')
      return res.status(400).json({ error: 'Missing signature header' })
    }

    // Verify signature using Wise's public key
    if (env.wiseWebhookPublicKey) {
      try {
        const verifier = crypto.createVerify('RSA-SHA256')
        verifier.update(req.body)
        const isValid = verifier.verify(env.wiseWebhookPublicKey, signature, 'base64')

        if (!isValid) {
          console.error('Wise webhook signature verification failed')
          return res.status(400).json({ error: 'Invalid signature' })
        }
      } catch (err) {
        console.error('Wise webhook signature verification error:', err.message)
        return res.status(400).json({ error: 'Signature verification failed' })
      }
    }

    // Parse the raw body
    let event
    try {
      event = JSON.parse(req.body.toString())
    } catch (err) {
      console.error('Wise webhook: invalid JSON body')
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    // Return 200 immediately
    res.status(200).json({ received: true })

    // Process asynchronously
    try {
      await webhooksService.processWiseEvent(event)
    } catch (error) {
      console.error(`Failed to process Wise event:`, error)
    }
  }
}
