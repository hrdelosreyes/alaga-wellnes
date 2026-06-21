import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  return data?.role === 'admin' ? user : null
}

// GET — list all portal users with emails
export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sc = serviceClient()

  // Fetch roles
  const { data: roles } = await sc.from('user_roles').select('user_id, role, created_at').order('created_at')

  // Fetch auth users to get emails
  const { data: { users: authUsers } } = await sc.auth.admin.listUsers()
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email]))

  const users = (roles ?? []).map(r => ({
    user_id:    r.user_id,
    role:       r.role,
    created_at: r.created_at,
    email:      emailMap[r.user_id] ?? undefined,
  }))

  return NextResponse.json({ users })
}

// POST — create new portal user
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, password, role } = await req.json()
  if (!email || !password || !role) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  if (!['admin', 'staff'].includes(role)) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })

  const sc = serviceClient()

  // Create the auth user
  const { data, error } = await sc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Assign role
  await sc.from('user_roles').insert({ user_id: data.user.id, role })

  return NextResponse.json({ user_id: data.user.id })
}

// DELETE — remove portal access
export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId.' }, { status: 400 })

  // Prevent self-deletion
  if (userId === admin.id) return NextResponse.json({ error: 'Cannot remove your own account.' }, { status: 400 })

  const sc = serviceClient()
  await sc.from('user_roles').delete().eq('user_id', userId)
  await sc.auth.admin.deleteUser(userId)

  return NextResponse.json({ ok: true })
}
