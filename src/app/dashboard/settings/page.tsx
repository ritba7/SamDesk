'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Lock, User, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ROLES } from '@/lib/utils'

const inputCls = 'w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function SettingsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isDirector = user?.role === 'director'

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Director: reset team member password
  const [users, setUsers] = useState<any[]>([])
  const [resetForm, setResetForm] = useState({ targetUserId: '', newPassword: '' })
  const [resetSaving, setResetSaving] = useState(false)
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (isDirector) {
      fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []))
    }
  }, [isDirector])

  const submit = async () => {
    setMsg(null)
    if (form.newPassword !== form.confirmPassword) {
      setMsg({ type: 'err', text: 'New password and confirmation do not match' })
      return
    }
    if (form.newPassword.length < 8) {
      setMsg({ type: 'err', text: 'New password must be at least 8 characters' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: 'Password updated successfully.' })
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setMsg({ type: 'err', text: data.error || 'Failed to update password' })
      }
    } finally {
      setSaving(false)
    }
  }

  const submitReset = async () => {
    setResetMsg(null)
    if (!resetForm.targetUserId) {
      setResetMsg({ type: 'err', text: 'Select a team member' })
      return
    }
    if (resetForm.newPassword.length < 8) {
      setResetMsg({ type: 'err', text: 'New password must be at least 8 characters' })
      return
    }
    setResetSaving(true)
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: resetForm.targetUserId, newPassword: resetForm.newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setResetMsg({ type: 'ok', text: data.message || 'Password reset successfully.' })
        setResetForm({ targetUserId: '', newPassword: '' })
      } else {
        setResetMsg({ type: 'err', text: data.error || 'Failed to reset password' })
      }
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Account</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{user?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="font-medium">{ROLES[user?.role] || user?.role}</span></div>
        </CardContent>
      </Card>

      {!isDirector && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> Password</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Contact the Director to change your password.</p>
          </CardContent>
        </Card>
      )}

      {isDirector && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className={labelCls}>Current Password</label>
                <input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>New Password (min 8 characters)</label>
                <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className={inputCls} />
              </div>
              {msg && (
                <div className={`flex items-center gap-2 text-sm rounded-lg p-2.5 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {msg.text}
                </div>
              )}
              <Button onClick={submit} disabled={saving || !form.currentPassword || !form.newPassword}>
                {saving ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Reset Team Member Password</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className={labelCls}>Team Member</label>
                <select value={resetForm.targetUserId} onChange={e => setResetForm(f => ({ ...f, targetUserId: e.target.value }))} className={inputCls}>
                  <option value="">Select user…</option>
                  {users.filter(u => u.id !== user?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({ROLES[u.role] || u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>New Password (min 8 characters)</label>
                <input type="password" value={resetForm.newPassword} onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))} className={inputCls} />
              </div>
              {resetMsg && (
                <div className={`flex items-center gap-2 text-sm rounded-lg p-2.5 ${resetMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resetMsg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {resetMsg.text}
                </div>
              )}
              <Button onClick={submitReset} disabled={resetSaving || !resetForm.targetUserId || !resetForm.newPassword}>
                {resetSaving ? 'Resetting...' : 'Reset Password'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
