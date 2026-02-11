import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

// Create Supabase client with service role key
// This bypasses Row Level Security for server-side operations
export const supabase = createClient(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Create admin auth client for user management
export const supabaseAdmin = supabase.auth.admin
