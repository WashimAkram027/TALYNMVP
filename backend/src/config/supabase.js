import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

const url = env.supabaseUrl || 'https://placeholder.supabase.co'
const serviceKey = env.supabaseServiceKey || 'placeholder-key'

// Main client — service_role, never call .auth.signInWithPassword() on this
export const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Auth-only client — used ONLY for signInWithPassword / credential checks
// Separate instance so it doesn't pollute the main client's session state
export const supabaseAuth = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create admin auth client for user management
export const supabaseAdmin = supabase.auth.admin
