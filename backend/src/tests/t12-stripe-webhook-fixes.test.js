/**
 * T12: Stripe Webhook Fixes (Refund/Dispute Gaps) — Tests
 *
 * Verifies that the webhook service handles refunds and disputes for
 * both payroll runs and invoices, with proper fallback logic, partial
 * refund detection, and email notifications.
 *
 * Usage:
 *   cd backend && node --test src/tests/t12-stripe-webhook-fixes.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - invoice_status enum must include 'refunded' and 'disputed'
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'
import { paymentsService } from '../services/payments.service.js'
import { emailService } from '../services/email.service.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ═══════════════════════════════════════════════════════════════
// 1. Verify invoice_status enum includes 'refunded' and 'disputed'
// ═══════════════════════════════════════════════════════════════

describe('T12-1: invoice_status enum values', () => {
  it('includes "refunded" status', async () => {
    // Query a non-existent invoice with status = 'refunded' to verify
    // the enum accepts it (no enum error). We use an update with a
    // filter that matches nothing; if the enum doesn't include 'refunded'
    // Supabase returns an error.
    const { error } = await supabase
      .from('invoices')
      .select('id')
      .eq('status', 'refunded')
      .limit(1)

    assert.ok(!error, `invoice_status must accept 'refunded'. Error: ${error?.message}`)
    console.log('    Confirmed: invoice_status enum includes "refunded"')
  })

  it('includes "disputed" status', async () => {
    const { error } = await supabase
      .from('invoices')
      .select('id')
      .eq('status', 'disputed')
      .limit(1)

    assert.ok(!error, `invoice_status must accept 'disputed'. Error: ${error?.message}`)
    console.log('    Confirmed: invoice_status enum includes "disputed"')
  })

  it('includes standard statuses (draft, paid, pending)', async () => {
    for (const status of ['draft', 'paid', 'pending']) {
      const { error } = await supabase
        .from('invoices')
        .select('id')
        .eq('status', status)
        .limit(1)

      assert.ok(!error, `invoice_status must accept '${status}'. Error: ${error?.message}`)
    }

    console.log('    Confirmed: standard statuses (draft, paid, pending) present')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Verify charge.refunded handler has invoice fallback
// ═══════════════════════════════════════════════════════════════

describe('T12-2: charge.refunded handler — invoice fallback', () => {
  let webhookSource

  it('reads webhooks.service.js source', () => {
    const filePath = resolve(process.cwd(), 'src', 'services', 'webhooks.service.js')
    webhookSource = readFileSync(filePath, 'utf-8')

    assert.ok(webhookSource.length > 0, 'webhooks.service.js must exist and have content')
    console.log('    File read: ' + webhookSource.length + ' chars')
  })

  it('charge.refunded case exists in switch', () => {
    assert.ok(
      webhookSource.includes("'charge.refunded'") || webhookSource.includes('"charge.refunded"'),
      'Webhook service must handle charge.refunded event'
    )

    console.log('    Confirmed: charge.refunded case present in switch')
  })

  it('charge.refunded queries payroll_runs by stripe_payment_intent_id', () => {
    // Find the charge.refunded section and verify it queries payroll_runs
    const refundedIndex = webhookSource.indexOf("'charge.refunded'")
    assert.ok(refundedIndex > -1, 'Must have charge.refunded handler')

    // Look in the code after the case statement for payroll_runs query
    const sectionAfter = webhookSource.substring(refundedIndex, refundedIndex + 1500)
    assert.ok(
      sectionAfter.includes('payroll_runs') && sectionAfter.includes('stripe_payment_intent_id'),
      'charge.refunded must query payroll_runs by stripe_payment_intent_id'
    )

    console.log('    Confirmed: queries payroll_runs first')
  })

  it('charge.refunded falls back to invoices table', () => {
    const refundedIndex = webhookSource.indexOf("'charge.refunded'")
    const sectionAfter = webhookSource.substring(refundedIndex, refundedIndex + 5000)

    assert.ok(
      sectionAfter.includes("from('invoices')") || sectionAfter.includes('invoices'),
      'charge.refunded must fall back to invoices table'
    )
    assert.ok(
      sectionAfter.includes('handleInvoiceChargeRefunded'),
      'Must call handleInvoiceChargeRefunded for invoice fallback'
    )

    console.log('    Confirmed: falls back to invoices table with handleInvoiceChargeRefunded')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Verify charge.dispute.created handler has invoice fallback
// ═══════════════════════════════════════════════════════════════

describe('T12-3: charge.dispute.created handler — invoice fallback', () => {
  let webhookSource

  it('reads webhooks.service.js source', () => {
    const filePath = resolve(process.cwd(), 'src', 'services', 'webhooks.service.js')
    webhookSource = readFileSync(filePath, 'utf-8')
    assert.ok(webhookSource.length > 0)
  })

  it('charge.dispute.created case exists in switch', () => {
    assert.ok(
      webhookSource.includes("'charge.dispute.created'") || webhookSource.includes('"charge.dispute.created"'),
      'Webhook service must handle charge.dispute.created event'
    )

    console.log('    Confirmed: charge.dispute.created case present')
  })

  it('charge.dispute.created queries payroll_runs first', () => {
    const disputeIndex = webhookSource.indexOf("'charge.dispute.created'")
    assert.ok(disputeIndex > -1)

    const sectionAfter = webhookSource.substring(disputeIndex, disputeIndex + 1500)
    assert.ok(
      sectionAfter.includes('payroll_runs') && sectionAfter.includes('stripe_payment_intent_id'),
      'charge.dispute.created must query payroll_runs first'
    )

    console.log('    Confirmed: queries payroll_runs by stripe_payment_intent_id first')
  })

  it('charge.dispute.created falls back to invoices table', () => {
    const disputeIndex = webhookSource.indexOf("'charge.dispute.created'")
    const sectionAfter = webhookSource.substring(disputeIndex, disputeIndex + 3000)

    assert.ok(
      sectionAfter.includes("from('invoices')") || sectionAfter.includes('invoices'),
      'charge.dispute.created must fall back to invoices table'
    )
    assert.ok(
      sectionAfter.includes('handleInvoiceChargeDisputeCreated'),
      'Must call handleInvoiceChargeDisputeCreated for invoice fallback'
    )

    console.log('    Confirmed: falls back to invoices with handleInvoiceChargeDisputeCreated')
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Verify charge.dispute.closed handler exists
// ═══════════════════════════════════════════════════════════════

describe('T12-4: charge.dispute.closed handler', () => {
  let webhookSource

  it('reads webhooks.service.js source', () => {
    const filePath = resolve(process.cwd(), 'src', 'services', 'webhooks.service.js')
    webhookSource = readFileSync(filePath, 'utf-8')
    assert.ok(webhookSource.length > 0)
  })

  it('charge.dispute.closed case exists in switch', () => {
    assert.ok(
      webhookSource.includes("'charge.dispute.closed'") || webhookSource.includes('"charge.dispute.closed"'),
      'Webhook service must handle charge.dispute.closed event'
    )

    console.log('    Confirmed: charge.dispute.closed case present in switch')
  })

  it('handles "won" dispute outcome', () => {
    const closedIndex = webhookSource.indexOf("'charge.dispute.closed'") !== -1
      ? webhookSource.indexOf("'charge.dispute.closed'")
      : webhookSource.indexOf('"charge.dispute.closed"')
    assert.ok(closedIndex > -1)

    const sectionAfter = webhookSource.substring(closedIndex, closedIndex + 4000)
    assert.ok(
      sectionAfter.includes("'won'") || sectionAfter.includes('"won"'),
      'charge.dispute.closed must handle won dispute outcome'
    )

    console.log('    Confirmed: handles "won" dispute outcome')
  })

  it('handles "lost" dispute outcome via handleDisputeClosed', () => {
    const closedIndex = webhookSource.indexOf("'charge.dispute.closed'") !== -1
      ? webhookSource.indexOf("'charge.dispute.closed'")
      : webhookSource.indexOf('"charge.dispute.closed"')
    const sectionAfter = webhookSource.substring(closedIndex, closedIndex + 4000)

    assert.ok(
      sectionAfter.includes('handleDisputeClosed'),
      'Must call handleDisputeClosed from payments service'
    )

    console.log('    Confirmed: delegates to handleDisputeClosed')
  })

  it('looks up both payroll_runs and invoices', () => {
    const closedIndex = webhookSource.indexOf("'charge.dispute.closed'")
    const sectionAfter = webhookSource.substring(closedIndex, closedIndex + 2000)

    assert.ok(
      sectionAfter.includes('payroll_runs'),
      'Must query payroll_runs table'
    )
    assert.ok(
      sectionAfter.includes('invoices'),
      'Must query invoices table'
    )

    console.log('    Confirmed: looks up both payroll_runs and invoices')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Verify partial refund detection
// ═══════════════════════════════════════════════════════════════

describe('T12-5: Partial refund detection in payments service', () => {
  let paymentsSource

  it('reads payments.service.js source', () => {
    const filePath = resolve(process.cwd(), 'src', 'services', 'payments.service.js')
    paymentsSource = readFileSync(filePath, 'utf-8')

    assert.ok(paymentsSource.length > 0, 'payments.service.js must exist and have content')
    console.log('    File read: ' + paymentsSource.length + ' chars')
  })

  it('handleChargeRefunded compares amount_refunded vs amount', () => {
    assert.ok(
      paymentsSource.includes('amount_refunded') && paymentsSource.includes('charge.amount'),
      'handleChargeRefunded must compare charge.amount_refunded with charge.amount'
    )

    console.log('    Confirmed: compares amount_refunded vs amount')
  })

  it('sets "partially_refunded" for partial refunds', () => {
    assert.ok(
      paymentsSource.includes('partially_refunded'),
      'Must set status to "partially_refunded" for partial refunds'
    )

    console.log('    Confirmed: "partially_refunded" status used')
  })

  it('detects full refund when amount_refunded >= amount', () => {
    assert.ok(
      paymentsSource.includes('amount_refunded >= charge.amount') ||
      paymentsSource.includes('amount_refunded >= charge.amount'),
      'Must check if charge.amount_refunded >= charge.amount for full refund'
    )

    console.log('    Confirmed: full refund detection logic present')
  })

  it('handleInvoiceChargeRefunded also detects partial refunds', () => {
    // Find the handleInvoiceChargeRefunded method
    const methodIndex = paymentsSource.indexOf('handleInvoiceChargeRefunded')
    assert.ok(methodIndex > -1, 'handleInvoiceChargeRefunded must exist')

    const sectionAfter = paymentsSource.substring(methodIndex, methodIndex + 800)
    assert.ok(
      sectionAfter.includes('amount_refunded') && sectionAfter.includes('partially_refunded'),
      'handleInvoiceChargeRefunded must also detect partial refunds'
    )

    console.log('    Confirmed: invoice refund handler also detects partial refunds')
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Verify new payment service methods exist
// ═══════════════════════════════════════════════════════════════

describe('T12-6: Payment service methods for invoice refund/dispute', () => {
  it('handleInvoiceChargeRefunded is a function', () => {
    assert.equal(typeof paymentsService.handleInvoiceChargeRefunded, 'function',
      'handleInvoiceChargeRefunded must be a function')

    console.log('    Confirmed: handleInvoiceChargeRefunded exists')
  })

  it('handleInvoiceChargeDisputeCreated is a function', () => {
    assert.equal(typeof paymentsService.handleInvoiceChargeDisputeCreated, 'function',
      'handleInvoiceChargeDisputeCreated must be a function')

    console.log('    Confirmed: handleInvoiceChargeDisputeCreated exists')
  })

  it('handleDisputeClosed is a function', () => {
    assert.equal(typeof paymentsService.handleDisputeClosed, 'function',
      'handleDisputeClosed must be a function')

    console.log('    Confirmed: handleDisputeClosed exists')
  })

  it('handleChargeRefunded is a function', () => {
    assert.equal(typeof paymentsService.handleChargeRefunded, 'function',
      'handleChargeRefunded must be a function')

    console.log('    Confirmed: handleChargeRefunded exists')
  })

  it('handleChargeDisputeCreated is a function', () => {
    assert.equal(typeof paymentsService.handleChargeDisputeCreated, 'function',
      'handleChargeDisputeCreated must be a function')

    console.log('    Confirmed: handleChargeDisputeCreated exists')
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Verify invoice-specific email methods exist
// ═══════════════════════════════════════════════════════════════

describe('T12-7: Email service — invoice refund/dispute methods', () => {
  it('sendInvoiceRefundedEmail is a function', () => {
    assert.equal(typeof emailService.sendInvoiceRefundedEmail, 'function',
      'sendInvoiceRefundedEmail must be a function on emailService')

    console.log('    Confirmed: sendInvoiceRefundedEmail exists')
  })

  it('sendInvoiceDisputedEmail is a function', () => {
    assert.equal(typeof emailService.sendInvoiceDisputedEmail, 'function',
      'sendInvoiceDisputedEmail must be a function on emailService')

    console.log('    Confirmed: sendInvoiceDisputedEmail exists')
  })

  it('sendDisputeResolvedEmail is a function', () => {
    assert.equal(typeof emailService.sendDisputeResolvedEmail, 'function',
      'sendDisputeResolvedEmail must be a function on emailService')

    console.log('    Confirmed: sendDisputeResolvedEmail exists')
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Verify webhook idempotency handling
// ═══════════════════════════════════════════════════════════════

describe('T12-8: Webhook idempotency', () => {
  let webhookSource

  it('reads webhooks.service.js source', () => {
    const filePath = resolve(process.cwd(), 'src', 'services', 'webhooks.service.js')
    webhookSource = readFileSync(filePath, 'utf-8')
    assert.ok(webhookSource.length > 0)
  })

  it('inserts into webhook_events for idempotency', () => {
    assert.ok(
      webhookSource.includes('webhook_events'),
      'Must insert into webhook_events table'
    )

    console.log('    Confirmed: uses webhook_events for idempotency tracking')
  })

  it('handles duplicate events via unique constraint (23505)', () => {
    assert.ok(
      webhookSource.includes('23505'),
      'Must handle PostgreSQL unique violation code 23505 for duplicate events'
    )

    console.log('    Confirmed: catches 23505 unique violation for duplicate events')
  })

  it('marks events as completed or failed', () => {
    assert.ok(
      webhookSource.includes("status: 'completed'") || webhookSource.includes('status: \'completed\''),
      'Must mark events as completed on success'
    )
    assert.ok(
      webhookSource.includes("status: 'failed'") || webhookSource.includes('status: \'failed\''),
      'Must mark events as failed on error'
    )

    console.log('    Confirmed: marks events as completed/failed')
  })
})

// ═══════════════════════════════════════════════════════════════
// MANUAL TEST CHECKLIST — T12: Stripe Webhook Fixes
// ═══════════════════════════════════════════════════════════════
//
// 1. Start Stripe CLI: stripe listen --forward-to localhost:3001/api/webhooks/stripe
// 2. Trigger synthetic refund: stripe trigger charge.refunded
// 3. VERIFY: No errors in backend logs, webhook marked completed
// 4. Find a paid invoice with stripe_payment_intent_id
// 5. Initiate a real refund from Stripe Dashboard for that PI
// 6. VERIFY: Invoice status updated to 'refunded'
// 7. VERIFY: payment_transactions has new 'refund' type record
// 8. VERIFY: Refund notification emails sent (check email_logs)
// 9. Test dispute: stripe trigger charge.dispute.created
// 10. VERIFY: Handler processes without error
// 11. Test dispute closed: verify charge.dispute.closed handler exists
//
// ═══════════════════════════════════════════════════════════════
