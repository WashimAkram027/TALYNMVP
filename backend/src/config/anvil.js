import Anvil from '@anvilco/anvil'
import { env } from './env.js'

// Initialize Anvil client for PDF generation
// Returns null if API key not configured (dev mode)
export const anvilClient = env.anvilApiKey
  ? new Anvil({ apiKey: env.anvilApiKey })
  : null
