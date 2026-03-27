import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const env = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Email (Resend)
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'Talyn <noreply@resend.dev>',

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Admin
  adminEmail: process.env.ADMIN_EMAIL || 'admin@talynx.org',
  adminFrontendUrl: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',

  // Anvil (PDF generation)
  anvilApiKey: process.env.ANVIL_API_KEY,

  // Scheduler
  payrollPullCron: process.env.PAYROLL_PULL_CRON || '0 9 * * 1-5',

  // Cron secret (for Railway cron → backend endpoint auth)
  cronSecret: process.env.CRON_SECRET,

  // Helpers
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production'
}

// Validate required environment variables
export function validateEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('Missing required environment variables:')
    missing.forEach(key => console.error(`  - ${key}`))

    if (env.isProd) {
      process.exit(1)
    } else {
      console.warn('\nRunning in development mode with missing env vars.')
      console.warn('Some features may not work correctly.\n')
    }
  }
}
