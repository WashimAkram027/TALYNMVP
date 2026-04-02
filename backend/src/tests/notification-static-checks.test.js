/**
 * Notification Static Analysis Checks
 *
 * Verifies that alert(), setFeedback, setToast, and custom toast patterns
 * have been fully removed from the codebase and replaced with sonner.
 *
 * Usage:
 *   cd backend && node --test src/tests/notification-static-checks.test.js
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'child_process'
import { resolve, join } from 'path'
import { readFileSync, readdirSync } from 'fs'

const ROOT = resolve(import.meta.dirname, '..', '..', '..')
const FRONTEND_PAGES = join(ROOT, 'frontend', 'src', 'pages')
const ADMIN_PAGES = join(ROOT, 'admin-frontend', 'src', 'pages')

// Read all .jsx/.js files in a directory and search for pattern
function grepDir(pattern, dir) {
  const regex = new RegExp(pattern)
  const matches = []
  let files
  try { files = readdirSync(dir) } catch { return matches }
  for (const f of files) {
    if (!f.endsWith('.jsx') && !f.endsWith('.js')) continue
    try {
      const content = readFileSync(join(dir, f), 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          matches.push({ file: f, line: i + 1, text: lines[i].trim() })
        }
      }
    } catch { /* skip unreadable */ }
  }
  return matches
}

function fileContains(pattern, filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return new RegExp(pattern).test(content)
  } catch { return false }
}

// ═══════════════════════════════════════════════════════════════
// 1. No alert() calls remain
// ═══════════════════════════════════════════════════════════════

describe('Static Check — alert() removal', () => {
  it('no alert() calls in frontend/src/pages/', () => {
    const matches = grepDir('\\balert\\(', FRONTEND_PAGES)
    if (matches.length > 0) {
      const detail = matches.map(m => `  ${m.file}:${m.line}: ${m.text}`).join('\n')
      assert.fail(`Found alert() in ${matches.length} location(s):\n${detail}`)
    }
  })

  it('no alert() calls in admin-frontend/src/pages/', () => {
    const matches = grepDir('\\balert\\(', ADMIN_PAGES)
    if (matches.length > 0) {
      const detail = matches.map(m => `  ${m.file}:${m.line}: ${m.text}`).join('\n')
      assert.fail(`Found alert() in ${matches.length} location(s):\n${detail}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. No useState feedback patterns remain
// ═══════════════════════════════════════════════════════════════

describe('Static Check — useState feedback removal', () => {
  it('no setFeedback calls in frontend/src/pages/', () => {
    const matches = grepDir('setFeedback', FRONTEND_PAGES)
    if (matches.length > 0) {
      const detail = matches.map(m => `  ${m.file}:${m.line}: ${m.text}`).join('\n')
      assert.fail(`Found setFeedback in ${matches.length} location(s):\n${detail}`)
    }
  })

  it('no setProfileSuccess/setPasswordSuccess/setBankSuccess in frontend/src/pages/', () => {
    for (const pattern of ['setProfileSuccess', 'setPasswordSuccess', 'setBankSuccess', 'setProfileError', 'setPasswordError']) {
      const matches = grepDir(pattern, FRONTEND_PAGES)
      if (matches.length > 0) {
        const detail = matches.map(m => `  ${m.file}:${m.line}: ${m.text}`).join('\n')
        assert.fail(`Found ${pattern} in ${matches.length} location(s):\n${detail}`)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. No custom toast patterns remain in admin
// ═══════════════════════════════════════════════════════════════

describe('Static Check — admin custom toast removal', () => {
  it('no setToast calls in admin-frontend/src/pages/', () => {
    const matches = grepDir('setToast', ADMIN_PAGES)
    if (matches.length > 0) {
      const detail = matches.map(m => `  ${m.file}:${m.line}: ${m.text}`).join('\n')
      assert.fail(`Found setToast in ${matches.length} location(s):\n${detail}`)
    }
  })

  it('no showToast calls in admin-frontend/src/pages/', () => {
    const matches = grepDir('showToast', ADMIN_PAGES)
    if (matches.length > 0) {
      const detail = matches.map(m => `  ${m.file}:${m.line}: ${m.text}`).join('\n')
      assert.fail(`Found showToast in ${matches.length} location(s):\n${detail}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Sonner import present in key files
// ═══════════════════════════════════════════════════════════════

describe('Static Check — sonner imports present', () => {
  const spotCheckFiles = [
    'Dashboard.jsx',
    'People.jsx',
    'Payroll.jsx',
    'BillingInvoices.jsx',
    'Settings.jsx',
    'Documents.jsx'
  ]

  for (const file of spotCheckFiles) {
    it(`${file} imports sonner`, () => {
      const found = fileContains('from.*sonner', join(FRONTEND_PAGES, file))
      assert.ok(found, `${file} should import from sonner`)
    })
  }
})
