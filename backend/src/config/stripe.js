import Stripe from 'stripe'
import { env } from './env.js'

// Initialize Stripe SDK with secret key
// Returns null if key not configured (dev mode)
export const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey, {
      apiVersion: '2026-02-25.clover'
    })
  : null
