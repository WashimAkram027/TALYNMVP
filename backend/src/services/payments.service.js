import { env } from '../config/env.js'
import { stripe } from '../config/stripe.js'
import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const paymentsService = {
  /**
   * Get public payment configuration (Stripe publishable key)
   */
  getConfig() {
    return {
      publishableKey: env.stripePublishableKey || null
    }
  },

  /**
   * Create or retrieve a Stripe Customer for the organization.
   * Stores stripe_customer_id on the organizations row.
   */
  async ensureStripeCustomer(orgId, orgName, billingEmail) {
    if (!stripe) throw new BadRequestError('Stripe is not configured')

    // Check if org already has a Stripe customer
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name, billing_email')
      .eq('id', orgId)
      .single()

    if (orgError) throw new BadRequestError('Organization not found')

    if (org.stripe_customer_id) {
      return org.stripe_customer_id
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      name: orgName || org.name,
      email: billingEmail || org.billing_email,
      metadata: { organization_id: orgId }
    })

    // Store on organization
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', orgId)

    if (updateError) {
      console.error('Failed to store stripe_customer_id:', updateError)
      throw new BadRequestError('Failed to link Stripe customer')
    }

    return customer.id
  },

  /**
   * Create a SetupIntent for us_bank_account with Financial Connections.
   * Inserts a payment_methods row with status pending_verification.
   * Returns the clientSecret for the frontend.
   */
  async createSetupIntent(orgId) {
    if (!stripe) throw new BadRequestError('Stripe is not configured')

    // Get org info for customer creation
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, billing_email, owner_id')
      .eq('id', orgId)
      .single()

    if (orgError || !org) throw new BadRequestError('Organization not found')

    // Get owner email as fallback billing email
    let billingEmail = org.billing_email
    if (!billingEmail) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', org.owner_id)
        .single()
      billingEmail = ownerProfile?.email
    }

    // Ensure Stripe customer exists
    const customerId = await this.ensureStripeCustomer(orgId, org.name, billingEmail)

    // Create SetupIntent for US bank account with Financial Connections
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['us_bank_account'],
      customer: customerId,
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method']
          }
        }
      },
      metadata: { organization_id: orgId }
    })

    // Insert a pending payment_methods row
    const { error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        organization_id: orgId,
        stripe_payment_method_id: setupIntent.id, // temporary, updated on webhook
        stripe_setup_intent_id: setupIntent.id,
        type: 'us_bank_account',
        status: 'pending_verification',
        is_default: false
      })

    if (insertError) {
      console.error('Failed to insert payment_methods row:', insertError)
      // Non-fatal — webhook will reconcile
    }

    return { clientSecret: setupIntent.client_secret }
  },

  /**
   * List all payment methods for an organization.
   */
  async getPaymentMethods(orgId) {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw new BadRequestError('Failed to fetch payment methods')
    return data || []
  },

  /**
   * Get the default active payment method for an organization.
   */
  async getActivePaymentMethod(orgId) {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_default', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      throw new BadRequestError('Failed to fetch active payment method')
    }

    return data || null
  },

  /**
   * Handle setup_intent.succeeded webhook.
   * Updates the payment_methods row to active with bank details.
   */
  async handleSetupIntentSucceeded(setupIntentId, pmId, bankName, lastFour) {
    // Update the row matching this setup intent
    const { data: existing, error: findError } = await supabase
      .from('payment_methods')
      .select('id, organization_id')
      .eq('stripe_setup_intent_id', setupIntentId)
      .single()

    if (findError || !existing) {
      console.error('No payment_methods row for setup_intent:', setupIntentId)
      return
    }

    // Deactivate any other default methods for this org
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('organization_id', existing.organization_id)
      .eq('is_default', true)

    // Update the payment method to active
    const { error: updateError } = await supabase
      .from('payment_methods')
      .update({
        stripe_payment_method_id: pmId,
        status: 'active',
        bank_name: bankName || null,
        last_four: lastFour || null,
        is_default: true,
        mandate_status: 'active',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Failed to update payment method on success:', updateError)
    }

    // Also update default_payment_method_id on the organization
    await supabase
      .from('organizations')
      .update({ default_payment_method_id: existing.id })
      .eq('id', existing.organization_id)
  },

  // ─── ACH Pull (PaymentIntent) ────────────────────────────────

  /**
   * Process a payroll run via Stripe ACH pull.
   * Creates a PaymentIntent, charges the employer's linked bank account.
   */
  async processPayrollRun(runId, orgId) {
    if (!stripe) throw new BadRequestError('Stripe is not configured')

    // 1. Fetch the payroll run — must be draft
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', runId)
      .eq('organization_id', orgId)
      .single()

    if (runError || !run) throw new NotFoundError('Payroll run not found')
    if (run.status !== 'draft') throw new BadRequestError('Payroll run must be in draft status to process')

    // 2. Sum all items' net_pay → cents
    const { data: items, error: itemsError } = await supabase
      .from('payroll_items')
      .select('net_pay')
      .eq('payroll_run_id', runId)

    if (itemsError) throw new BadRequestError('Failed to fetch payroll items')
    if (!items || items.length === 0) throw new BadRequestError('Payroll run has no items')

    const totalCents = Math.round(
      items.reduce((sum, item) => sum + (item.net_pay || 0), 0) * 100
    )

    if (totalCents <= 0) throw new BadRequestError('Payroll total must be greater than zero')

    // 3. Get the active payment method + stripe customer
    const paymentMethod = await this.getActivePaymentMethod(orgId)
    if (!paymentMethod) throw new BadRequestError('No active payment method. Please link a bank account first.')

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single()

    if (!org?.stripe_customer_id) throw new BadRequestError('No Stripe customer found for organization')

    // 4. Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      customer: org.stripe_customer_id,
      payment_method: paymentMethod.stripe_payment_method_id,
      payment_method_types: ['us_bank_account'],
      off_session: true,
      confirm: true,
      metadata: {
        organization_id: orgId,
        payroll_run_id: runId
      }
    })

    // 5. Update the payroll run
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'ach_processing',
        total_pull_amount_cents: totalCents,
        status: 'processing'
      })
      .eq('id', runId)

    if (updateError) {
      console.error('Failed to update payroll run after PI creation:', updateError)
    }

    return { paymentIntentId: paymentIntent.id, status: paymentIntent.status }
  },

  /**
   * Handle payment_intent.succeeded webhook.
   * Marks run as funded. Admin notified separately.
   */
  async handlePaymentIntentSucceeded(paymentIntentId, runId) {
    const { error } = await supabase
      .from('payroll_runs')
      .update({
        payment_status: 'funded',
        funded_at: new Date().toISOString()
      })
      .eq('id', runId)

    if (error) {
      console.error('Failed to update payroll run on PI succeeded:', error)
    }

  },

  /**
   * Handle payment_intent.payment_failed webhook.
   * Reverts run to draft so employer can retry.
   */
  async handlePaymentIntentFailed(paymentIntentId, runId, errorMsg) {
    const { error } = await supabase
      .from('payroll_runs')
      .update({
        payment_status: 'failed',
        status: 'draft'
      })
      .eq('id', runId)

    if (error) {
      console.error('Failed to update payroll run on PI failed:', error)
    }
  },

  /**
   * Handle setup_intent.setup_failed webhook.
   * Marks the payment_methods row as failed.
   */
  async handleSetupIntentFailed(setupIntentId, errorMessage) {
    const { error: updateError } = await supabase
      .from('payment_methods')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_setup_intent_id', setupIntentId)

    if (updateError) {
      console.error('Failed to update payment method on failure:', updateError)
    }
  }
}
