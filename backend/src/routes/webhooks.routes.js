import { Router } from 'express'
import express from 'express'
import { webhooksController } from '../controllers/webhooks.controller.js'

const router = Router()

// POST /api/webhooks/stripe
// Uses raw body parsing for Stripe signature verification
// No authenticate middleware — Stripe calls this directly
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  webhooksController.handleStripeWebhook
)

// POST /api/webhooks/wise
// Uses raw body parsing for RSA-SHA256 signature verification
// No authenticate middleware — Wise calls this directly
router.post(
  '/wise',
  express.raw({ type: 'application/json' }),
  webhooksController.handleWiseWebhook
)

export default router
