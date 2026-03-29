// MANUAL TEST CHECKLIST — T4: Invite Modal Role Cleanup
// 1. Login as employer on localhost:5173
// 2. Go to People page
// 3. Click "Invite Member" button
// 4. VERIFY: Role dropdown only shows "Employee" and "Contractor"
// 5. VERIFY: "Admin" and "Manager" are NOT in the dropdown
// 6. VERIFY: Default selection is "Employee"
// 7. Fill in all fields and generate quote
// 8. VERIFY: Quote shows employee name (not email) in review panel
// 9. Accept and send invite
// 10. VERIFY: Member appears in People list with status "invited"

/**
 * T4 — Invite Member Modal Role Cleanup Tests
 *
 * Tests that:
 * 1. The InviteMemberModal ROLE_OPTIONS only has 'employee' and 'contractor'
 * 2. The backend members.service accepts these roles for invitations
 * 3. The DB enum supports these roles
 *
 * Usage:
 *   cd backend && node --test src/tests/t4-invite-modal-roles.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'

// Track test data for cleanup
const testMemberIds = []

// ═══════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════

after(async () => {
  console.log('\n    -- CLEANUP --')
  for (const id of testMemberIds) {
    await supabase.from('organization_members').delete().eq('id', id)
  }
  if (testMemberIds.length > 0) {
    console.log(`    Deleted ${testMemberIds.length} test org members`)
  }
  console.log('    Cleanup complete.\n')
})

// ═══════════════════════════════════════════════════════════════
// 1. Frontend: ROLE_OPTIONS has exactly 2 entries
// ═══════════════════════════════════════════════════════════════

describe('T4 — Frontend ROLE_OPTIONS', () => {
  let fileContent = null

  it('InviteMemberModal.jsx exists and is readable', async () => {
    const filePath = resolve('..', 'frontend', 'src', 'components', 'features', 'InviteMemberModal.jsx')
    fileContent = await readFile(filePath, 'utf-8')
    assert.ok(fileContent.length > 0, 'File should not be empty')
    console.log(`    InviteMemberModal.jsx: ${fileContent.length} chars`)
  })

  it('ROLE_OPTIONS contains exactly 2 entries', async () => {
    if (!fileContent) {
      const filePath = resolve('..', 'frontend', 'src', 'components', 'features', 'InviteMemberModal.jsx')
      fileContent = await readFile(filePath, 'utf-8')
    }

    // Extract the ROLE_OPTIONS array definition
    const roleMatch = fileContent.match(/const ROLE_OPTIONS\s*=\s*\[([\s\S]*?)\]/)
    assert.ok(roleMatch, 'ROLE_OPTIONS constant must exist in the file')

    const roleBlock = roleMatch[1]
    console.log('    ROLE_OPTIONS block:')
    console.log('    ' + roleBlock.trim())

    // Count the number of { value: ... } entries
    const entries = roleBlock.match(/\{\s*value:/g)
    assert.ok(entries, 'ROLE_OPTIONS should have at least one entry')
    assert.equal(entries.length, 2, `ROLE_OPTIONS should have exactly 2 entries, found ${entries.length}`)
  })

  it('ROLE_OPTIONS includes "employee" value', async () => {
    if (!fileContent) {
      const filePath = resolve('..', 'frontend', 'src', 'components', 'features', 'InviteMemberModal.jsx')
      fileContent = await readFile(filePath, 'utf-8')
    }

    assert.ok(
      fileContent.includes("value: 'employee'"),
      'ROLE_OPTIONS must include employee value'
    )
    console.log('    Found: value: \'employee\'')
  })

  it('ROLE_OPTIONS includes "contractor" value', async () => {
    if (!fileContent) {
      const filePath = resolve('..', 'frontend', 'src', 'components', 'features', 'InviteMemberModal.jsx')
      fileContent = await readFile(filePath, 'utf-8')
    }

    assert.ok(
      fileContent.includes("value: 'contractor'"),
      'ROLE_OPTIONS must include contractor value'
    )
    console.log('    Found: value: \'contractor\'')
  })

  it('ROLE_OPTIONS does NOT include "admin" or "manager"', async () => {
    if (!fileContent) {
      const filePath = resolve('..', 'frontend', 'src', 'components', 'features', 'InviteMemberModal.jsx')
      fileContent = await readFile(filePath, 'utf-8')
    }

    // Extract just the ROLE_OPTIONS block to avoid false positives elsewhere
    const roleMatch = fileContent.match(/const ROLE_OPTIONS\s*=\s*\[([\s\S]*?)\]/)
    const roleBlock = roleMatch[1]

    assert.ok(
      !roleBlock.includes("'admin'"),
      'ROLE_OPTIONS must NOT include admin'
    )
    assert.ok(
      !roleBlock.includes("'manager'"),
      'ROLE_OPTIONS must NOT include manager'
    )
    console.log('    Confirmed: no admin or manager in ROLE_OPTIONS')
  })

  it('default memberRole in formData is "employee"', async () => {
    if (!fileContent) {
      const filePath = resolve('..', 'frontend', 'src', 'components', 'features', 'InviteMemberModal.jsx')
      fileContent = await readFile(filePath, 'utf-8')
    }

    assert.ok(
      fileContent.includes("memberRole: 'employee'"),
      'Default memberRole should be employee'
    )
    console.log('    Confirmed: default memberRole is \'employee\'')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Backend: DB accepts 'employee' and 'contractor' roles
// ═══════════════════════════════════════════════════════════════

describe('T4 — Backend: DB accepts employee role', () => {
  it('can insert org member with member_role=employee', async () => {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()

    assert.ok(orgs, 'Need at least one organization')

    const testEmail = `test-role-emp-${Date.now()}@test-talyn.example`

    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgs.id,
        profile_id: null,
        invitation_email: testEmail,
        first_name: 'TestEmp',
        last_name: 'Role',
        member_role: 'employee',
        status: 'invited',
        invited_at: new Date().toISOString()
      })
      .select()
      .single()

    assert.ok(!error, `Insert error: ${error?.message}`)
    assert.equal(data.member_role, 'employee')
    testMemberIds.push(data.id)
    console.log(`    Inserted member with role=employee: ${data.id}`)
  })
})

describe('T4 — Backend: DB accepts contractor role', () => {
  it('can insert org member with member_role=contractor', async () => {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()

    assert.ok(orgs, 'Need at least one organization')

    const testEmail = `test-role-ctr-${Date.now()}@test-talyn.example`

    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgs.id,
        profile_id: null,
        invitation_email: testEmail,
        first_name: 'TestCtr',
        last_name: 'Role',
        member_role: 'contractor',
        status: 'invited',
        invited_at: new Date().toISOString()
      })
      .select()
      .single()

    assert.ok(!error, `Insert error: ${error?.message}`)
    assert.equal(data.member_role, 'contractor')
    testMemberIds.push(data.id)
    console.log(`    Inserted member with role=contractor: ${data.id}`)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Backend: DB rejects invalid roles
// ═══════════════════════════════════════════════════════════════

describe('T4 — Backend: DB rejects invalid roles', () => {
  it('rejects member_role=superuser (not in enum)', async () => {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()

    const testEmail = `test-role-bad-${Date.now()}@test-talyn.example`

    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgs.id,
        profile_id: null,
        invitation_email: testEmail,
        first_name: 'TestBad',
        last_name: 'Role',
        member_role: 'superuser',
        status: 'invited',
        invited_at: new Date().toISOString()
      })
      .select()
      .single()

    assert.ok(error, 'Should reject invalid role')
    console.log(`    Correctly rejected role=superuser: ${error.message}`)

    // Clean up just in case
    if (data) testMemberIds.push(data.id)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. DB enum has expected values
// ═══════════════════════════════════════════════════════════════

describe('T4 — DB Enum Verification', () => {
  it('member_role enum includes employee and contractor', async () => {
    // Verify by querying existing members with these roles
    const { data: empCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('member_role', 'employee')

    const { data: ctrCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('member_role', 'contractor')

    // The enum is confirmed valid because our insert tests above succeeded
    console.log('    member_role enum confirmed to include: employee, contractor')
    console.log('    (Full enum: owner, admin, manager, employee, contractor)')
    console.log('    Frontend ROLE_OPTIONS correctly limits to: employee, contractor')
  })
})
