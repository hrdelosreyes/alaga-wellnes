'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminNav } from '@/components/layout/admin-nav'
import { UserPlus, Trash2, Users, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type UserRow = {
  user_id: string
  role: 'admin' | 'staff'
  created_at: string
  email?: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users,     setUsers]     = useState<UserRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [newEmail,  setNewEmail]  = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [newRole,   setNewRole]   = useState<'admin' | 'staff'>('staff')
  const [adding,    setAdding]    = useState(false)
  const [removing,  setRemoving]  = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/admin/login'); return }
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
      if (roleRow?.role !== 'admin') { router.replace('/admin/login'); return }
      fetchUsers()
    }
    checkAuth()
  }, [router])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const { users } = await res.json()
      setUsers(users ?? [])
    }
    setLoading(false)
  }

  async function addUser() {
    setError(null)
    setSuccess(null)
    if (!newEmail || !newPass) { setError('Email and password are required.'); return }
    if (newPass.length < 8) { setError('Password must be at least 8 characters.'); return }

    setAdding(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPass, role: newRole }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create user.')
    } else {
      setSuccess(`${newEmail} added as ${newRole}.`)
      setNewEmail('')
      setNewPass('')
      setNewRole('staff')
      setShowAdd(false)
      fetchUsers()
    }
    setAdding(false)
  }

  async function removeUser(userId: string) {
    if (!confirm('Remove this user\'s portal access? They will no longer be able to sign in.')) return
    setRemoving(userId)
    const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.user_id !== userId))
    }
    setRemoving(null)
  }

  async function changeRole(userId: string, role: 'admin' | 'staff') {
    const supabase = createClient()
    await supabase.from('user_roles').update({ role }).eq('user_id', userId)
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role } : u))
  }

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={fetchUsers} refreshing={loading} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#2C2420]">Portal Users</h2>
          <button
            onClick={() => { setShowAdd(true); setError(null); setSuccess(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#C4714A] text-white rounded-xl text-sm font-semibold hover:bg-[#b3603a] transition-colors"
          >
            <UserPlus size={15} /> Add user
          </button>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">{success}</div>
        )}

        {/* Add user form */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-6 mb-6">
            <h3 className="font-bold text-[#2C2420] mb-4">New portal user</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="staff@alagawellness.care"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5">Temporary password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5">Role</label>
                <div className="flex gap-3">
                  {(['staff', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setNewRole(r)}
                      className={cn(
                        'flex-1 py-3 rounded-xl border text-sm font-semibold capitalize transition-colors',
                        newRole === r
                          ? 'bg-[#2C2420] text-white border-[#2C2420]'
                          : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#2C2420]'
                      )}
                    >
                      {r === 'admin' ? '🔑 Admin' : '👤 Staff'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#8C7B70] mt-2">
                  {newRole === 'admin'
                    ? 'Full access — bookings, therapists, payments, users.'
                    : 'Therapist management only — no payments or user management.'}
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={addUser}
                  disabled={adding}
                  className="flex-1 py-3 bg-[#C4714A] text-white rounded-xl text-sm font-semibold hover:bg-[#b3603a] transition-colors disabled:opacity-50"
                >
                  {adding ? 'Creating…' : 'Create user'}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setError(null) }}
                  className="px-5 py-3 border border-[#EDE5DF] text-[#8C7B70] rounded-xl text-sm hover:border-[#2C2420] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users list */}
        {loading ? (
          <div className="text-center py-20 text-[#8C7B70]">Loading…</div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-[#8C7B70]">No portal users yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map(u => (
              <div key={u.user_id} className="bg-white rounded-2xl border border-[#EDE5DF] px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#F2D9CC] flex items-center justify-center text-[#C4714A] flex-shrink-0">
                  {u.role === 'admin' ? <ShieldCheck size={18} /> : <Users size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#2C2420] truncate">{u.email ?? u.user_id}</p>
                  <p className="text-xs text-[#8C7B70] mt-0.5">
                    Added {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <select
                  value={u.role}
                  onChange={e => changeRole(u.user_id, e.target.value as 'admin' | 'staff')}
                  className="border border-[#EDE5DF] rounded-lg px-2 py-1.5 text-sm text-[#2C2420] focus:outline-none focus:border-[#C4714A] bg-white"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => removeUser(u.user_id)}
                  disabled={removing === u.user_id}
                  className="p-2 text-[#C8BDB8] hover:text-red-500 transition-colors disabled:opacity-40"
                  title="Remove access"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
