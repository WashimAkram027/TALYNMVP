import Stripe from 'stripe'
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
   * Uses conditional update to prevent race conditions creating duplicate customers.
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

    // Store on organization — use IS NULL guard to prevent race condition
    // If another request already set stripe_customer_id, this update matches 0 rows
    const { data: updated, error: updateError } = await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', orgId)
      .is('stripe_customer_id', null)
      .select('stripe_customer_id')
      .single()

    if (updateError || !updated) {
      // Another request won the race — fetch the existing customer ID
      // and clean up the orphaned Stripe customer we just created
      const { data: refetch } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', orgId)
        .single()

      if (refetch?.stripe_customer_id) {
        // Clean up orphaned customer (fire-and-forget)
        stripe.customers.del(customer.id).catch(err =>
          console.warn('Failed to clean up orphaned Stripe customer:', err.message)
        )
        return refetch.stripe_customer_id
      }
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
    // Use setup intent ID as a temporary placeholder for the payment method ID.
    // The webhook handler will replace it with the actual pm_* ID on success.
    const { error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        organization_id: orgId,
        stripe_payment_method_id: `pending_${setupIntent.id}`,
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
   * Retrieves bank details from Stripe API (not from the webhook payload,
   * which may not contain them), then updates the payment_methods row.
   */
  async handleSetupIntentSucceeded(setupIntentId, pmId) {
    // Retrieve bank details from the PaymentMethod on Stripe
    let bankName = null
    let lastFour = null
    if (pmId && stripe) {
      try {
        const pm = await stripe.paymentMethods.retrieve(pmId)
        if (pm.us_bank_account) {
          bankName = pm.us_bank_account.bank_name || null
          lastFour = pm.us_bank_account.last4 || null
        }
      } catch (err) {
        console.error('Failed to retrieve PaymentMethod from Stripe:', err.message)
        // Continue — we can still activate the method without display details
      }
    }

    // Find the row matching this setup intent
    const { data: existing, error: findError } = await supabase
      .from('payment_methods')
      .select('id, organization_id')
      .eq('stripe_setup_intent_id', setupIntentId)
      .single()

    if (findError || !existing) {
      console.error('No payment_methods row for setup_intent:', setupIntentId)
      return
    }

    // Deactivate any other default methods for this org, then set the new one
    // as default in a single logical operation. The .neq guard prevents unsetting
    // the row we are about to activate.
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('organization_id', existing.organization_id)
      .eq('is_default', true)
      .neq('id', existing.id)

    // Update the payment method to active
    const { error: updateError } = await supabase
      .from('payment_methods')
      .update({
        stripe_payment_method_id: pmId,
        status: 'active',
        bank_name: bankName,
        last_four: lastFour,
        is_default: true,
        mandate_status: 'active',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Failed to update payment method on success:', updateError)
      throw updateError
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
   * Creates a PaymentIntent with idempotency key to prevent duplicate charges.
   *
   * Uses optimistic locking: only transitions draft → processing via a
   * conditional update, so concurrent requests cannot both succeed.
   */
  async processPayrollRun(runId, orgId) {
    if (!stripe) throw new BadRequestError('Stripe is not configured')

    // 1. Atomically claim the run — only update if currently draft
    const { data: claimed, error: claimError } = await supabase
      .from('payroll_runs')
      .update({
        status: 'processing',
        payment_status: 'pending'
      })
      .eq('id', runId)
      .eq('organization_id', orgId)
      .eq('status', 'draft')
      .select('*')
      .single()

    if (claimError || !claimed) {
      // Either not found or already moved out of draft
      const { data: existing } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', runId)
        .eq('organization_id', orgId)
        .single()

      if (!existing) throw new NotFoundError('Payroll run not found')
      throw new BadRequestError(`Payroll run must be in draft status to process (current: ${existing.status})`)
    }

    const run = claimed

    try {
      // 2. Sum all items' net_pay → cents (using integer arithmetic to avoid float issues)
      const { data: items, error: itemsError } = await supabase
        .from('payroll_items')
        .select('net_pay')
        .eq('payroll_run_id', runId)

      if (itemsError) throw new BadRequestError('Failed to fetch payroll items')
      if (!items || items.length === 0) throw new BadRequestError('Payroll run has no items')

      // Convert each item's net_pay to cents individually to minimize floating point error
      const totalCents = items.reduce((sum, item) => {
        const pay = Number(item.net_pay) || 0
        return sum + Math.round(pay * 100)
      }, 0)

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

      // 4. Create PaymentIntent with idempotency key to prevent duplicate charges
      const idempotencyKey = `payroll_${runId}_${totalCents}`

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        customer: org.stripe_customer_id,
        payment_method: paymentMethod.stripe_payment_method_id,
        payment_method_types: ['us_bank_account'],
        off_session: true,
        confirm: true,
        description: `Payroll run ${runId} — ${run.pay_period_start} to ${run.pay_period_end}`,
        metadata: {
          organization_id: orgId,
          payroll_run_id: runId,
          pay_period_start: run.pay_period_start,
          pay_period_end: run.pay_period_end
        }
      }, {
        idempotencyKey
      })

      // 5. Record the PaymentIntent on the payroll run
      const { error: updateError } = await supabase
        .from('payroll_runs')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'ach_processing',
          total_pull_amount_cents: totalCents
        })
        .eq('id', runId)

      if (updateError) {
        console.error('Failed to update payroll run after PI creation:', updateError)
      }

      // 6. Record the payment transaction
      await supabase
        .from('payment_transactions')
        .insert({
          organization_id: orgId,
          payroll_run_id: runId,
          stripe_payment_intent_id: paymentIntent.id,
          type: 'ach_debit',
          amount_cents: totalCents,
          currency: 'usd',
          status: paymentIntent.status === 'processing' ? 'processing' : 'pending',
          idempotency_key: idempotencyKey
        })
        .single()
        .then(({ error }) => {
          if (error) console.error('Failed to record payment transaction:', error)
        })

      return { paymentIntentId: paymentIntent.id, status: paymentIntent.status }
    } catch (error) {
      // Differentiate Stripe errors from application errors
      if (error instanceof Stripe.errors.StripeError) {
        const isRetryable = error instanceof Stripe.errors.StripeConnectionError
          || error instanceof Stripe.errors.StripeRateLimitError
          || error instanceof Stripe.errors.StripeAPIError

        if (error instanceof Stripe.errors.StripeAuthenticationError) {
          // Bad API key — do NOT silently revert, this needs operator attention
          console.error('Stripe authentication error — check API keys:', error.message)
          await supabase
            .from('payroll_runs')
            .update({ status: 'draft', payment_status: 'failed' })
            .eq('id', runId)
            .eq('status', 'processing')
          throw new BadRequestError('Payment service configuration error. Please contact support.')
        }

        if (isRetryable) {
          // Network/rate limit/server error — revert to draft so employer can retry
          console.warn(`Stripe transient error (${error.type}): ${error.message}`)
          await supabase
            .from('payroll_runs')
            .update({ status: 'draft', payment_status: 'failed' })
            .eq('id', runId)
            .eq('status', 'processing')
          throw new BadRequestError('Payment service temporarily unavailable. Please try again shortly.')
        }

        // StripeInvalidRequestError, StripeCardError, etc. — payment was rejected
        console.error(`Stripe payment error (${error.type}): ${error.message}`)
        await supabase
          .from('payroll_runs')
          .update({ status: 'draft', payment_status: 'failed' })
          .eq('id', runId)
          .eq('status', 'processing')
        throw new BadRequestError(error.message || 'Payment failed. Please check your payment method and try again.')
      }

      // Non-Stripe error (DB failure, validation, etc.) — revert to draft
      await supabase
        .from('payroll_runs')
        .update({ status: 'draft', payment_status: 'failed' })
        .eq('id', runId)
        .eq('status', 'processing')
      throw error
    }
  },

  /**
   * Handle payment_intent.succeeded webhook.
   * Marks run as succeeded (matches DB CHECK constraint).
   */
  async handlePaymentIntentSucceeded(paymentIntentId, runId) {
    const { error } = await supabase
      .from('payroll_runs')
      .update({
        payment_status: 'succeeded',
        funded_at: new Date().toISOString()
      })
      .eq('id', runId)

    if (error) {
      console.error('Failed to update payroll run on PI succeeded:', error)
      throw error
    }

    // Update the payment transaction record
    await supabase
      .from('payment_transactions')
      .update({
        status: 'succeeded',
        completed_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
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
      throw error
    }

    // Update the payment transaction record
    await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        error_message: errorMsg || 'Payment failed'
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
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
      throw updateError
    }
  },

  /**
   * Handle charge.dispute.created webhook.
   * Marks the payroll run and payment transaction as disputed,
   * and inserts a dispute-type audit record.
   * Disputes are irreversible — the run status is NOT reverted to draft.
   */
  async handleChargeDisputeCreated(dispute, runId, organizationId) {
    const paymentIntentId = dispute.payment_intent

    // 1. Update payroll_runs.payment_status to 'disputed'
    const { error: runUpdateError } = await supabase
      .from('payroll_runs')
      .update({ payment_status: 'disputed' })
      .eq('id', runId)

    if (runUpdateError) {
      console.error('Failed to update payroll run on dispute:', runUpdateError)
      throw runUpdateError
    }

    // 2. Update the original payment_transactions record status to 'disputed'
    await supabase
      .from('payment_transactions')
      .update({
        status: 'disputed',
        error_message: `Dispute: ${dispute.reason || 'unknown'}`,
        completed_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntentId)

    // 3. Insert a dispute-type audit record (uses dispute.id as unique key, not pi_xxx)
    if (!dispute.id) {
      console.error('Dispute event missing dispute.id, skipping audit record')
      return
    }

    await supabase
      .from('payment_transactions')
      .insert({
        organization_id: organizationId,
        payroll_run_id: runId,
        stripe_payment_intent_id: dispute.id,
        type: 'dispute',
        amount_cents: dispute.amount || 0,
        currency: dispute.currency || 'usd',
        status: 'disputed',
        error_message: `Reason: ${dispute.reason || 'unknown'}. Stripe status: ${dispute.status || 'unknown'}`
      })
      .then(({ error }) => {
        if (error) console.error('Failed to insert dispute transaction record:', error)
      })
  },

  /**
   * Handle charge.refunded webhook.
   * Updates the payroll run and payment transaction to reflect the refund,
   * and inserts a refund-type audit record.
   */
  async handleChargeRefunded(charge, runId, organizationId) {
    const paymentIntentId = charge.payment_intent

    // 1. Update payroll_runs.payment_status to 'refunded'
    const { error: runUpdateError } = await supabase
      .from('payroll_runs')
      .update({ payment_status: 'refunded' })
      .eq('id', runId)

    if (runUpdateError) {
      console.error('Failed to update payroll run on refund:', runUpdateError)
      throw runUpdateError
    }

    // 2. Update the original payment_transactions record status to 'refunded'
    await supabase
      .from('payment_transactions')
      .update({
        status: 'refunded',
        error_message: `Refunded: ${charge.amount_refunded || 0} cents`,
        completed_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntentId)

    // 3. Insert a refund-type audit record
    // Use the charge ID as the unique key (different from pi_xxx)
    if (!charge.id) {
      console.error('Charge event missing charge.id, skipping refund audit record')
      return
    }

    await supabase
      .from('payment_transactions')
      .insert({
        organization_id: organizationId,
        payroll_run_id: runId,
        stripe_payment_intent_id: charge.id,
        type: 'refund',
        amount_cents: charge.amount_refunded || 0,
        currency: charge.currency || 'usd',
        status: 'refunded',
        error_message: charge.refunded ? 'Full refund' : 'Partial refund'
      })
      .then(({ error }) => {
        if (error) console.error('Failed to insert refund transaction record:', error)
      })
  }
}
