/**
 * Test PDF Template Generator — Full Pipeline
 *
 * Uses real database records and the actual backend services to test
 * the complete PDF generation flow:
 *   DB fetch → HTML build → Anvil API → Supabase Storage upload → DB update
 *
 * Also saves PDFs locally to generated-pdfs/ for visual inspection.
 *
 * Usage:
 *   cd backend && node src/scripts/testPdfTemplates.js
 */

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from '../config/supabase.js'
import { invoiceGenerationService } from '../services/invoiceGeneration.service.js'
import { quoteService } from '../services/quote.service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '../../../generated-pdfs')

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

/* ─── Helpers ─── */

function savePdf(name, buffer) {
  const filePath = path.join(OUTPUT_DIR, `${name}.pdf`)
  fs.writeFileSync(filePath, buffer)
  const sizeKb = (buffer.length / 1024).toFixed(1)
  console.log(`    → Saved locally: ${name}.pdf (${sizeKb} KB)`)
}

/* ─── Find Latest Records ─── */

async function findLatestInvoice() {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, organization_id, invoice_number')
    .eq('type', 'billing')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

async function findLatestPayrollItem() {
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('id, organization_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (runError || !run) return null

  const { data: item, error: itemError } = await supabase
    .from('payroll_items')
    .select('member_id')
    .eq('payroll_run_id', run.id)
    .limit(1)
    .single()

  if (itemError || !item) return null

  return { runId: run.id, memberId: item.member_id, orgId: run.organization_id }
}

async function findLatestQuote() {
  const { data, error } = await supabase
    .from('eor_quotes')
    .select('id, organization_id, quote_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

/* ─── Clear Cache ─── */

async function clearInvoiceCache(invoiceId) {
  await supabase
    .from('invoices')
    .update({ pdf_url: null, receipt_pdf_url: null })
    .eq('id', invoiceId)
}

async function clearPayslipCache(runId, memberId) {
  await supabase
    .from('payroll_items')
    .update({ payslip_pdf_url: null })
    .eq('payroll_run_id', runId)
    .eq('member_id', memberId)
}

async function clearQuoteCache(quoteId) {
  await supabase
    .from('eor_quotes')
    .update({ pdf_url: null })
    .eq('id', quoteId)
}

/* ─── Main ─── */

async function main() {
  console.log('=== PDF Full Pipeline Test ===\n')
  console.log(`Output: ${OUTPUT_DIR}\n`)

  // Check Anvil is configured
  if (!process.env.ANVIL_API_KEY) {
    console.error('ANVIL_API_KEY not set. Cannot generate PDFs.')
    process.exit(1)
  }

  let ok = 0, fail = 0, skip = 0

  // ── 1. Invoice & Receipt ──
  console.log('─── Invoices & Receipts ───')
  const invoice = await findLatestInvoice()

  if (!invoice) {
    console.log('  No billing invoices found in database. Skipping invoice & receipt tests.\n')
    skip += 3
  } else {
    console.log(`  Found invoice: ${invoice.invoice_number} (${invoice.id.substring(0, 8)}...)`)
    console.log(`  Org: ${invoice.organization_id.substring(0, 8)}...`)

    // Clear cache to force full pipeline
    await clearInvoiceCache(invoice.id)
    console.log('  Cache cleared (pdf_url, receipt_pdf_url)')

    // Invoice (detail)
    try {
      process.stdout.write('  Generating invoice-detail...')
      const result = await invoiceGenerationService.generateInvoicePdf(
        invoice.id, invoice.organization_id, 'detail'
      )
      console.log(' OK')
      console.log(`    → Storage: ${result.pdfUrl || 'upload failed'}`)
      savePdf('invoice-detail', result.pdfBuffer)
      ok++
    } catch (err) {
      console.log(` FAILED: ${err.message}`)
      fail++
    }

    // Invoice (summary) — clear cache again since detail just set pdf_url
    await clearInvoiceCache(invoice.id)

    try {
      process.stdout.write('  Generating invoice-summary...')
      const result = await invoiceGenerationService.generateInvoicePdf(
        invoice.id, invoice.organization_id, 'summary'
      )
      console.log(' OK')
      console.log(`    → Storage: ${result.pdfUrl || 'upload failed'}`)
      savePdf('invoice-summary', result.pdfBuffer)
      ok++
    } catch (err) {
      console.log(` FAILED: ${err.message}`)
      fail++
    }

    // Receipt (detail) — clear cache again
    await clearInvoiceCache(invoice.id)

    try {
      process.stdout.write('  Generating receipt-detail...')
      const result = await invoiceGenerationService.generateReceiptPdf(
        invoice.id, invoice.organization_id, 'detail'
      )
      console.log(' OK')
      console.log(`    → Storage: ${result.pdfUrl || 'upload failed'}`)
      savePdf('receipt-detail', result.pdfBuffer)
      ok++
    } catch (err) {
      console.log(` FAILED: ${err.message}`)
      fail++
    }
  }

  // ── 2. Payslip ──
  console.log('\n─── Payslip ───')
  const payroll = await findLatestPayrollItem()

  if (!payroll) {
    console.log('  No payroll runs with items found in database. Skipping payslip test.\n')
    skip++
  } else {
    console.log(`  Found payroll run: ${payroll.runId.substring(0, 8)}...`)
    console.log(`  Member: ${payroll.memberId.substring(0, 8)}...`)
    console.log(`  Org: ${payroll.orgId.substring(0, 8)}...`)

    // Clear cache
    await clearPayslipCache(payroll.runId, payroll.memberId)
    console.log('  Cache cleared (payslip_pdf_url)')

    try {
      process.stdout.write('  Generating payslip...')
      const result = await invoiceGenerationService.generatePayslipPdf(
        payroll.runId, payroll.memberId, payroll.orgId
      )
      console.log(` OK (${result.memberName})`)
      console.log(`    → Storage: ${result.pdfUrl || 'upload failed'}`)
      savePdf('payslip', result.pdfBuffer)
      ok++
    } catch (err) {
      console.log(` FAILED: ${err.message}`)
      fail++
    }
  }

  // ── 3. Quote ──
  console.log('\n─── Quote ───')
  const quote = await findLatestQuote()

  if (!quote) {
    console.log('  No EOR quotes found in database. Skipping quote test.\n')
    skip++
  } else {
    console.log(`  Found quote: ${quote.quote_number} (${quote.id.substring(0, 8)}...)`)
    console.log(`  Org: ${quote.organization_id.substring(0, 8)}...`)

    // Clear cache
    await clearQuoteCache(quote.id)
    console.log('  Cache cleared (pdf_url)')

    try {
      process.stdout.write('  Generating quote...')
      const result = await quoteService.generateQuotePdf(
        quote.id, quote.organization_id
      )
      console.log(' OK')
      console.log(`    → Storage: ${result.pdfUrl || 'upload failed'}`)
      savePdf('quote', result.pdfBuffer)
      ok++
    } catch (err) {
      console.log(` FAILED: ${err.message}`)
      fail++
    }
  }

  // ── Summary ──
  console.log(`\n=== Done: ${ok} generated, ${fail} failed, ${skip} skipped ===`)
  if (ok > 0) console.log(`Open PDFs: ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
