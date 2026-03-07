import axios from 'axios'
import { env } from './env.js'

// Wise API axios instance
// Returns null if token not configured (dev mode)
export const wiseApi = env.wiseApiToken
  ? axios.create({
      baseURL: env.wiseApiUrl || 'https://api.transferwise.com',
      headers: {
        'Authorization': `Bearer ${env.wiseApiToken}`,
        'Content-Type': 'application/json'
      }
    })
  : null
