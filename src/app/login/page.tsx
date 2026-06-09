'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Wind, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password. Please try again.')
    } else {
      router.push('/dashboard')
    }
  }

  const demoAccounts = [
    { role: 'Director', email: 'director@samdesk.in', password: 'Director@123' },
    { role: 'VP / Assistant', email: 'vp@samdesk.in', password: 'VP@123456' },
    { role: 'Accounts', email: 'accounts@samdesk.in', password: 'Accounts@123' },
    { role: 'Manufacturing', email: 'mfg@samdesk.in', password: 'Mfg@123456' },
    { role: 'Design', email: 'design@samdesk.in', password: 'Design@123' },
  ]

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">SamDesk</h1>
              <p className="text-slate-400 text-xs">Business Management Platform</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Manage your business<br />
              <span className="text-blue-400">end-to-end</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              From inquiry to dispatch — track deals, production, payments and team tasks in one unified platform.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { label: 'Deal Pipeline', desc: 'Full funnel tracking' },
              { label: 'Production', desc: 'Stage-by-stage progress' },
              { label: 'Documents', desc: 'TDS, PI, Quotes' },
              { label: 'Analytics', desc: 'Live insights' },
            ].map(f => (
              <div key={f.label} className="bg-slate-800 rounded-lg p-4">
                <p className="text-white font-medium text-sm">{f.label}</p>
                <p className="text-slate-400 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-slate-500 text-sm">&copy; 2024 SamDesk. Air Shower Manufacturing.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 font-bold text-xl">SamDesk</h1>
              <p className="text-slate-500 text-xs">Business Management Platform</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 mb-8">Sign in to your account to continue</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@samdesk.in" required className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Quick login (demo)</p>
              <div className="grid grid-cols-1 gap-2">
                {demoAccounts.map(acc => (
                  <button key={acc.email} type="button" onClick={() => { setEmail(acc.email); setPassword(acc.password) }} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-xs transition-colors text-left">
                    <span className="font-medium text-gray-700">{acc.role}</span>
                    <span className="text-gray-400">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
