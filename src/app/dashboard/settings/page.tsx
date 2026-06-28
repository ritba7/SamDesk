'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Lock, User, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ROLES } from '@/lib/utils'

const inputCls = 'w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function SettingsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

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
    </div>
  )
}
