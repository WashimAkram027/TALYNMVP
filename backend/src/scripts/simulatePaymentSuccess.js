/**
 * Simulate Payment Success
 *
 * Mimics what the Stripe payment_intent.succeeded webhook does:
 * marks invoice as paid, payroll run as completed, payroll items as paid,
 * generates receipt PDF and payslip PDFs for all employees.
 *
 * Use this when Stripe webhooks can't fire (no `stripe listen` running).
 *
 * Usage:
 *   node src/scripts/simulatePaymentSuccess.js <employer-email>
 *
 * Example:
 *   node src/scripts/simulatePaymentSuccess.js akramwashim027@gmail.com
 */

import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const employerEmail = process.argv[2]

if (!employerEmail) {
  console.error('Usage: node src/scripts/simulatePaymentSuccess.js <employer-email>')
  process.exit(1)
}

async function run() {
  console.log(`\nSimulating payment success for: ${employerEmail}\n`)

  // 1. Find employer + org
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('email', employerEmail)
    .eq('role', 'employer')
    .single()

  if (!profile) {
    console.error('Employer not found')
    process.exit(1)
  }

  const orgId = profile.organization_id

  // 2. Find the latest actionable invoice (pending, approved, or processing)
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount_cents, payroll_run_id, organization_id')
    .eq('organization_id', orgId)
    .eq('type', 'billing')
    .in('status', ['pending', 'approved', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!invoice) {
    console.error('No pending/approved/processing invoice found for this org.')
    console.error('Run the cron first: curl -X POST http://localhost:3001/api/cron/generate-invoices -H "x-cron-secret: YOUR_SECRET"')
    process.exit(1)
  }

  const amount = `$${((invoice.total_amount_cents || 0) / 100).toFixed(2)}`
  console.log(`  Invoice: ${invoice.invoice_number} (${invoice.status}) — ${amount}`)
  console.log(`  Payroll Run: ${invoice.payroll_run_id || 'NONE'}`)

  // 3. Mark invoice as paid
  const { error: invErr } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', invoice.id)

  if (invErr) {
    console.error('Failed to update invoice:', invErr.message)
    process.exit(1)
  }
  console.log(`  ✓ Invoice → paid`)

  // 4. Update payment transaction (if exists)
  const { data: txn } = await supabase
    .from('payment_transactions')
    .update({
      status: 'succeeded',
      completed_at: new Date().toISOString()
    })
    .eq('invoice_id', invoice.id)
    .select('id')

  if (txn && txn.length > 0) {
    console.log(`  ✓ Payment transaction → succeeded`)
  } else {
    console.log(`  - No payment transaction found (skipped)`)
  }

  // 5. Mark payroll run as completed + payroll items as paid
  if (invoice.payroll_run_id) {
    await supabase
      .from('payroll_runs')
      .update({
        status: 'completed',
        payment_status: 'succeeded',
        funded_at: new Date().toISOString()
      })
      .eq('id', invoice.payroll_run_id)
    console.log(`  ✓ Payroll run → completed (payment_status: succeeded)`)

    const { data: updatedItems } = await supabase
      .from('payroll_items')
      .update({ status: 'paid' })
      .eq('payroll_run_id', invoice.payroll_run_id)
      .select('id')

    console.log(`  ✓ Payroll items → paid (${updatedItems?.length || 0} items)`)
  }

  // 6. Generate receipt PDF (uses the real service)
  console.log(`\n  Generating PDFs...\n`)

  try {
    // Dynamic import to use the compiled service
    const { invoiceGenerationService } = await import('../services/invoiceGeneration.service.js')

    // Receipt PDF
    try {
      const result = await invoiceGenerationService.generateReceiptPdf(invoice.id, orgId)
      console.log(`  ✓ Receipt PDF generated: ${result.pdfUrl || 'buffer only'}`)
    } catch (err) {
      console.error(`  ✗ Receipt PDF failed: ${err.message}`)
    }

    // 7. Generate payslip PDFs for each employee
    if (invoice.payroll_run_id) {
      const { data: items } = await supabase
        .from('payroll_items')
        .select('member_id, member:organization_members!payroll_items_member_id_fkey(profile:profiles!organization_members_profile_id_fkey(full_name))')
        .eq('payroll_run_id', invoice.payroll_run_id)

      for (const item of items || []) {
        try {
          const result = await invoiceGenerationService.generatePayslipPdf(
            invoice.payroll_run_id,
            item.member_id,
            orgId
          )
          console.log(`  ✓ Payslip PDF: ${result.memberName} → ${result.pdfUrl || 'buffer only'}`)
        } catch (err) {
          console.error(`  ✗ Payslip PDF failed for member ${item.member_id}: ${err.message}`)
        }
      }
    }
  } catch (err) {
    console.error(`  PDF generation setup failed: ${err.message}`)
    console.error(`  Make sure compiled components exist: npm run build:components`)
  }

  // 8. Summary
  console.log(`\n  ══════════════════════════════════════`)
  console.log(`  Payment simulation complete!`)
  console.log(`  Invoice ${invoice.invoice_number} is now PAID`)
  console.log(`  Employee payslips are available at /employee/payroll`)
  console.log(`  Employer receipt is available at /billing`)
  console.log(`  ══════════════════════════════════════\n`)
}

run().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
