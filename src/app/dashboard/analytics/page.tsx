'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, getStageLabel, STAGES } from '@/lib/utils'
import { TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react'

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777']

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const user = session?.user as any

  useEffect(() => {
    if (status === 'authenticated' && user?.role !== 'director') {
      router.push('/dashboard')
      return
    }
    if (status === 'authenticated' && user?.role === 'director') {
      fetch('/api/analytics').then(r => r.json()).then(data => {
        setAnalytics(data)
        setLoading(false)
      })
    }
  }, [status, user?.role])

  if (loading || !analytics) {
    return <div className="flex items-center justify-center h-48 text-gray-400">Loading analytics...</div>
  }

  // Transform stage data for chart
  const stageData = STAGES.map(s => ({
    name: s.label.substring(0, 12) + (s.label.length > 12 ? '...' : ''),
    fullName: s.label,
    count: analytics.stageCount[s.id] || 0,
  })).filter(d => d.count > 0)

  // Lost reasons
  const lostData = Object.entries(analytics.lostReasons || {}).map(([reason, count]) => ({
    name: reason.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    value: count as number,
  }))

  // Monthly revenue
  const revenueData = Object.entries(analytics.monthlyRevenue || {}).map(([month, amount]) => ({
    month,
    amount: amount as number,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Business performance overview</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Deals</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.total}</p>
                <p className="text-xs text-gray-400 mt-1">{analytics.active} active</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50"><Activity className="w-5 h-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.conversionRate}%</p>
                <p className="text-xs text-gray-400 mt-1">{analytics.won} won · {analytics.lost} lost</p>
              </div>
              <div className="p-2.5 rounded-lg bg-green-50"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50"><DollarSign className="w-5 h-5 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(analytics.pipelineValue)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-5xl font-bold text-gray-900">{analytics.pipelineHealth}</span>
            <span className="text-gray-400 mb-2">/100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                analytics.pipelineHealth >= 70 ? 'bg-green-500' :
                analytics.pipelineHealth >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${analytics.pipelineHealth}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>Poor</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Stage */}
        <Card>
          <CardHeader><CardTitle className="text-base">Deals by Stage</CardTitle></CardHeader>
          <CardContent>
            {stageData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stageData} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any) => [value, 'Deals']}
                    labelFormatter={(label: any, payload: any) => {
                      return payload?.[0]?.payload?.fullName || label
                    }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No payment data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueData} margin={{ left: 10 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Heat Score breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Deal Temperature</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Hot', value: analytics.heatScores.hot },
                      { name: 'Warm', value: analytics.heatScores.warm },
                      { name: 'Cold', value: analytics.heatScores.cold },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="#dc2626" />
                    <Cell fill="#d97706" />
                    <Cell fill="#2563eb" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lost Reasons */}
        <Card>
          <CardHeader><CardTitle className="text-base">Lost Deal Reasons</CardTitle></CardHeader>
          <CardContent>
            {lostData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No lost deals recorded</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={lostData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {lostData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Key Metrics Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.pendingTasks}</p>
              <p className="text-sm text-gray-500">Pending Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{analytics.delayedStages}</p>
              <p className="text-sm text-gray-500">Delayed Prod. Stages</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(analytics.totalRevenue)}</p>
              <p className="text-sm text-gray-500">Total Revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(analytics.pipelineValue)}</p>
              <p className="text-sm text-gray-500">Open Pipeline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
