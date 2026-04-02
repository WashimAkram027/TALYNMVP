import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ORG_ID = '7bfd018b-25a0-4cde-b31c-0857df375c66'
const EMPLOYER_PROFILE_ID = '2aefe58f-ed76-4f30-b75d-e4bd04db6a65'
const PASSWORD = 'Test123!'

const employees = [
  { firstName: 'Aarav', lastName: 'Sharma', email: 'aarav.sharma@test.com', jobTitle: 'Software Engineer', department: 'Engineering' },
  { firstName: 'Priya', lastName: 'Gurung', email: 'priya.gurung@test.com', jobTitle: 'QA Analyst', department: 'Engineering' },
  { firstName: 'Rajan', lastName: 'Thapa', email: 'rajan.thapa@test.com', jobTitle: 'DevOps Engineer', department: 'Infrastructure' },
  { firstName: 'Sita', lastName: 'Poudel', email: 'sita.poudel@test.com', jobTitle: 'Product Designer', department: 'Design' },
  { firstName: 'Bikash', lastName: 'Rai', email: 'bikash.rai@test.com', jobTitle: 'Data Analyst', department: 'Analytics' },
]

async function seed() {
  for (const emp of employees) {
    console.log(`\nSeeding ${emp.firstName} ${emp.lastName} (${emp.email})...`)

    // 1. Create auth user via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emp.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: emp.firstName, last_name: emp.lastName, role: 'candidate' }
    })

    if (authError) {
      console.error(`  Auth error: ${authError.message}`)
      continue
    }

    const userId = authData.user.id
    console.log(`  Auth user created: ${userId}`)

    // 2. Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: emp.email,
      first_name: emp.firstName,
      last_name: emp.lastName,
      role: 'candidate',
      status: 'active',
      email_verified: true,
      onboarding_completed: true,
      onboarding_step: 5,
      organization_id: ORG_ID,
      pending_bank_details: { bank_name: 'Nepal Bank', account_number: '123456789' + employees.indexOf(emp) }
    })
    if (profileError) console.error(`  Profile error: ${profileError.message}`)
    else console.log('  Profile created')

    // 3. Create EOR quote
    const quoteNum = `TQ-2026-T0${employees.indexOf(emp) + 1}`
    const { data: quote, error: quoteError } = await supabase.from('eor_quotes').insert({
      organization_id: ORG_ID, quote_number: quoteNum, status: 'accepted',
      employee_email: emp.email, employee_first_name: emp.firstName, employee_last_name: emp.lastName,
      job_title: emp.jobTitle, department: emp.department, employment_type: 'full_time', start_date: '2026-03-01',
      annual_salary: 173300, salary_currency: 'NPR', pay_frequency: 'monthly', periods_per_year: 12,
      monthly_gross_salary: 14441, employer_ssf_rate: 0.2000, employer_ssf_amount: 2888,
      employee_ssf_rate: 0.1100, employee_ssf_amount: 1589, estimated_net_salary: 12852,
      platform_fee_amount: 100, platform_fee_currency: 'USD',
      total_monthly_cost_local: 17329, total_annual_cost_local: 207948,
      config_snapshot: { country_code: 'NPL', employer_ssf_rate: 0.2, employee_ssf_rate: 0.11, platform_fee_amount: 100 },
      country_code: 'NPL', valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      accepted_at: new Date().toISOString(), accepted_by: EMPLOYER_PROFILE_ID,
      terms_accepted_at: new Date().toISOString(), generated_by: EMPLOYER_PROFILE_ID
    }).select().single()

    if (quoteError) console.error(`  Quote error: ${quoteError.message}`)
    else console.log(`  Quote created: ${quoteNum}`)

    // 4. Create organization member
    const { data: member, error: memberError } = await supabase.from('organization_members').insert({
      organization_id: ORG_ID, profile_id: userId, invitation_email: emp.email,
      first_name: emp.firstName, last_name: emp.lastName, member_role: 'employee', status: 'active',
      job_title: emp.jobTitle, department: emp.department, employment_type: 'full_time',
      salary_amount: 1733, salary_currency: 'NPR', pay_frequency: 'monthly', start_date: '2026-03-01',
      quote_id: quote?.id || null, quote_verified: true, invited_at: new Date().toISOString(), joined_at: new Date().toISOString(),
      pan_number: `PAN00${employees.indexOf(emp) + 1}TEST`, ssf_number: `SSF00${employees.indexOf(emp) + 1}TEST`,
      bank_name: 'Nepal Bank', bank_account_number: '123456789' + employees.indexOf(emp)
    }).select().single()

    if (memberError) console.error(`  Member error: ${memberError.message}`)
    else console.log(`  Member created: ${member.id}`)

    // 5. Create identity document
    if (member) {
      const { error: docError } = await supabase.from('documents').insert({
        organization_id: ORG_ID, member_id: member.id,
        name: `${emp.firstName}_${emp.lastName}_Citizenship.pdf`,
        file_url: 'seeded://test-doc', file_type: 'application/pdf', file_size: 50000,
        category: 'identity', is_sensitive: true, uploaded_by: userId
      })
      if (docError) console.error(`  Document error: ${docError.message}`)
      else console.log('  Identity document created')
    }
  }

  // 6. Seed time-off policies (if not exist)
  const { data: existingPolicies } = await supabase.from('time_off_policies')
    .select('id').eq('organization_id', ORG_ID)

  let policyIds = {}
  if (!existingPolicies?.length) {
    const { data: policies } = await supabase.from('time_off_policies').insert([
      { organization_id: ORG_ID, name: 'Annual Leave', description: 'Standard paid annual leave', days_per_year: 18, carry_over_days: 5, is_paid: true, requires_approval: true, is_active: true },
      { organization_id: ORG_ID, name: 'Sick Leave', description: 'Paid sick leave', days_per_year: 12, carry_over_days: 0, is_paid: true, requires_approval: true, is_active: true },
      { organization_id: ORG_ID, name: 'Unpaid Leave', description: 'Unpaid personal leave', days_per_year: 10, carry_over_days: 0, is_paid: false, requires_approval: true, is_active: true },
    ]).select()
    if (policies) {
      policyIds.annual = policies.find(p => p.name === 'Annual Leave')?.id
      policyIds.sick = policies.find(p => p.name === 'Sick Leave')?.id
      console.log('\nTime-off policies created')
    }
  } else {
    console.log('\nTime-off policies already exist, skipping')
    // Fetch existing
    const { data: allPolicies } = await supabase.from('time_off_policies').select('id, name').eq('organization_id', ORG_ID)
    policyIds.annual = allPolicies?.find(p => p.name === 'Annual Leave')?.id
    policyIds.sick = allPolicies?.find(p => p.name === 'Sick Leave')?.id
  }

  // 7. Create time-off balances for all members
  if (policyIds.annual || policyIds.sick) {
    const { data: members } = await supabase.from('organization_members')
      .select('id').eq('organization_id', ORG_ID).eq('member_role', 'employee')

    for (const m of members || []) {
      if (policyIds.annual) {
        await supabase.from('time_off_balances').upsert({
          member_id: m.id, policy_id: policyIds.annual, year: 2026, total_days: 18, used_days: 0, pending_days: 0, carry_over_days: 0
        }, { onConflict: 'member_id,policy_id,year', ignoreDuplicates: true })
      }
      if (policyIds.sick) {
        await supabase.from('time_off_balances').upsert({
          member_id: m.id, policy_id: policyIds.sick, year: 2026, total_days: 12, used_days: 0, pending_days: 0, carry_over_days: 0
        }, { onConflict: 'member_id,policy_id,year', ignoreDuplicates: true })
      }
    }
    console.log('Time-off balances created for all employees')
  }

  console.log('\n--- DONE ---')
  console.log('All employees use password: Test123!')
}

seed().catch(console.error)
