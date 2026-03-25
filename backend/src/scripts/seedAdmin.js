import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@talynx.org'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPass123!'
const ADMIN_FIRST_NAME = 'Talyn'
const ADMIN_LAST_NAME = 'Admin'

async function seedAdmin() {
  console.log(`Seeding super_admin: ${ADMIN_EMAIL}`)

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      role: 'admin'
    }
  })

  if (authError) {
    if (authError.code === 'email_exists' || authError.message.includes('already')) {
      console.log('User already exists, looking up...')

      // Look up profile by email
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', ADMIN_EMAIL)
        .single()

      if (existing) {
        // Profile exists, just ensure admin role
        await ensureProfileIsAdmin(existing.id)
        await ensureAdminRole(existing.id)
        return
      }

      // Profile doesn't exist — look up auth user by listing users
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const authUser = users?.find(u => u.email === ADMIN_EMAIL)
      if (authUser) {
        console.log('Found auth user:', authUser.id, '— creating profile...')
        await createProfile(authUser.id)
        await ensureAdminRole(authUser.id)
        return
      }

      console.error('Could not find auth user for', ADMIN_EMAIL)
      process.exit(1)
    }
    console.error('Auth error:', authError)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('Auth user created:', userId)

  // 2. Upsert profile with admin role
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: ADMIN_EMAIL,
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      role: 'admin',
      status: 'active',
      email_verified: true,
      onboarding_completed: true
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Profile error:', profileError)
    process.exit(1)
  }

  console.log('Profile created/updated with role=admin')

  await ensureAdminRole(userId)
}

async function createProfile(userId) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: ADMIN_EMAIL,
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      role: 'admin',
      status: 'active',
      email_verified: true,
      onboarding_completed: true
    }, { onConflict: 'id' })

  if (error) {
    console.error('Profile creation error:', error)
    process.exit(1)
  }
  console.log('Profile created with role=admin')
}

async function ensureProfileIsAdmin(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin', status: 'active', email_verified: true, onboarding_completed: true })
    .eq('id', userId)

  if (error) {
    console.error('Profile update error:', error)
    process.exit(1)
  }
  console.log('Profile updated to role=admin')
}

async function ensureAdminRole(userId) {
  // 3. Insert admin_roles entry
  const { error: roleError } = await supabase
    .from('admin_roles')
    .upsert({
      profile_id: userId,
      role: 'super_admin',
      is_active: true
    }, { onConflict: 'profile_id' })

  if (roleError) {
    console.error('Admin role error:', roleError)
    process.exit(1)
  }

  console.log('Admin role assigned: super_admin')
  console.log('\nAdmin seeded successfully!')
  console.log(`  Email: ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log('  Role: super_admin')
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
