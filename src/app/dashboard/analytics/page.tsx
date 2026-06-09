'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, STAGES } from '@/lib/utils'
import { TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react'

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777']

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const user = session?.user as any

  useEffect(() => {
    if (status === 'authenticated' && user?.role !== 'director') { router.push('/dashboard'); return }
    if (status === 'authenticated' && user?.role === 'director') {
      fetch('/api/analytics').then(r => r.json()).then(data => { setAnalytics(data); setLoading(false) })
    }
  }, [status, user?.role])

  if (loading || !analytics) return <div className="flex items-center justify-center h-48 text-gray-400">Loading analytics...</div>

  const stageData = STAGES.map(s => ({ name: s.label.substring(0, 12) + (s.label.length > 12 ? '...' : ''), fullName: s.label, count: analytics.stageCount[s.id] || 0 })).filter(d => d.count > 0)
  const lostData = Object.entries(analytics.lostReasons || {}).map(([reason, count]) => ({ name: reason.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), value: count as number }))
  const revenueData = Object.entries(analytics.monthlyRevenue || {}).map(([month, amount]) => ({ month, amount: amount as number }))

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Analytics</h1><p className="text-gray-500 mt-1">Business performance overview</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">Total Deals</p><p className="text-3xl font-bold text-gray-900 mt-1">{analytics.total}</p><p className="text-xs text-gray-400 mt-1">{analytics.active} active</p></div><div className="p-2.5 rounded-lg bg-blue-50"><Activity className="w-5 h-5 text-blue-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">Conversion Rate</p><p className="text-3xl font-bold text-gray-900 mt-1">{analytics.conversionRate}%</p><p className="text-xs text-gray-400 mt-1">{analytics.won} won · {analytics.lost} lost</p></div><div className="p-2.5 rounded-lg bg-green-50"><TrendingUp className="w-5 h-5 text-green-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">Total Revenue</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(analytics.totalRevenue)}</p></div><div className="p-2.5 rounded-lg bg-purple-50"><DollarSign className="w-5 h-5 text-purple-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">Pipeline Value</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(analytics.pipelineValue)}</p></div><div className="p-2.5 rounded-lg bg-amber-50"><AlertTriangle className="w-5 h-5 text-amber-600" /></div></div></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Deals by Stage</CardTitle></CardHeader>
          <CardContent>{stageData.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, 'Deals']} labelFormatter={(l: any, p: any) => p?.[0]?.payload?.fullName || l} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>{revenueData.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No payment data yet</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData} margin={{ left: 10 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lost Deal Reasons</CardTitle></CardHeader>
          <CardContent>{lostData.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No lost deals recorded</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={lostData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {lostData.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          )}</CardContent>
        </Card>
      </div>
    </div>
  )
}
