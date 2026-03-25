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

export default router
