'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, CheckSquare, AlertTriangle, DollarSign,
  Clock, ArrowRight, Flame, Thermometer, Snowflake,
  Factory, Package, FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStageColor, getStageLabel, ROLES } from '@/lib/utils'

interface Deal {
  id: string
  dealNumber: string
  customerName: string
  stage: string
  heatScore: string
  quotedAmount?: number
  assignedTo?: { name: string }
  updatedAt: string
  tasks: any[]
  productionStages: any[]
}

interface Task {
  id: string
  title: string
  type: string
  dueDate?: string
  status: string
  deal?: { dealNumber: string; customerName: string }
}

function StatCard({ title, value, icon: Icon, color = 'blue', sub }: { title: string; value: string | number; icon: any; color?: string; sub?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HeatBadge({ score }: { score: string }) {
  if (score === 'hot') return <span className="flex items-center gap-1 text-xs text-red-600"><Flame className="w-3 h-3" /> Hot</span>
  if (score === 'warm') return <span className="flex items-center gap-1 text-xs text-amber-600"><Thermometer className="w-3 h-3" /> Warm</span>
  return <span className="flex items-center gap-1 text-xs text-blue-600"><Snowflake className="w-3 h-3" /> Cold</span>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const user = session?.user as any
  const role = user?.role

  useEffect(() => {
    if (!role) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [dealsRes, tasksRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/tasks'),
        ])
        const dealsData = await dealsRes.json()
        const tasksData = await tasksRes.json()
        setDeals(Array.isArray(dealsData) ? dealsData : [])
        setTasks(Array.isArray(tasksData) ? tasksData : [])

        if (role === 'director') {
          const analyticsRes = await fetch('/api/analytics')
          if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [role])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  const activeDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
  const overdueTasksCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length
  const todaysTasks = tasks.filter(t => {
    if (!t.dueDate) return false
    const due = new Date(t.dueDate)
    const today = new Date()
    return due.toDateString() === today.toDateString()
  })

  if (role === 'director') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Director Dashboard</h1>
          <p className="text-gray-500 mt-1">Business overview and pipeline health</p>
        </div>

        {analytics && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Deals" value={analytics.total} icon={FileText} />
              <StatCard title="Won" value={analytics.won} icon={TrendingUp} color="green" sub={`${analytics.conversionRate}% rate`} />
              <StatCard title="Active Pipeline" value={analytics.active} icon={Flame} color="amber" />
              <StatCard title="Pipeline Value" value={formatCurrency(analytics.pipelineValue)} icon={DollarSign} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pipeline Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-gray-900">{analytics.pipelineHealth}</span>
                    <span className="text-gray-400 mb-1">/100</span>
                  </div>
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${analytics.pipelineHealth >= 70 ? 'bg-green-500' : analytics.pipelineHealth >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${analytics.pipelineHealth}%` }}
                    />
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Delayed production stages</span>
                      <span className={analytics.delayedStages > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{analytics.delayedStages}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Pending tasks</span>
                      <span className={analytics.pendingTasks > 10 ? 'text-amber-600 font-medium' : 'text-gray-700'}>{analytics.pendingTasks}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deal Temperature</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Flame className="w-5 h-5 text-red-500" />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hot</span>
                          <span className="font-medium">{analytics.heatScores.hot}</span>
                        </div>
                        <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${analytics.total > 0 ? (analytics.heatScores.hot / analytics.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Thermometer className="w-5 h-5 text-amber-500" />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Warm</span>
                          <span className="font-medium">{analytics.heatScores.warm}</span>
                        </div>
                        <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${analytics.total > 0 ? (analytics.heatScores.warm / analytics.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Snowflake className="w-5 h-5 text-blue-500" />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cold</span>
                          <span className="font-medium">{analytics.heatScores.cold}</span>
                        </div>
                        <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${analytics.total > 0 ? (analytics.heatScores.cold / analytics.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">Total payments received</p>
                  <div className="mt-4">
                    <Link href="/dashboard/analytics">
                      <Button variant="outline" size="sm" className="w-full">
                        View Full Analytics <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Pending tasks for director */}
        {tasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending Tasks</CardTitle>
              <Link href="/dashboard/tasks"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                    <CheckSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      {task.deal && <p className="text-xs text-gray-400">{task.deal.dealNumber} &middot; {task.deal.customerName}</p>}
                    </div>
                    {task.dueDate && (
                      <span className={`text-xs ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent deals */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Deals</CardTitle>
            <Link href="/dashboard/deals"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3" /></Button></Link>
          </CardHeader>
          <CardContent>
            {activeDeals.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No active deals</p>
            ) : (
              <div className="space-y-2">
                {activeDeals.slice(0, 6).map(deal => (
                  <Link key={deal.id} href={`/dashboard/deals/${deal.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{deal.customerName}</span>
                          <HeatBadge score={deal.heatScore} />
                        </div>
                        <p className="text-xs text-gray-400">{deal.dealNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {deal.quotedAmount && <span className="text-sm text-gray-600">{formatCurrency(deal.quotedAmount)}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (role === 'manufacturing') {
    const productionDeals = deals.filter(d => ['production', 'dispatch_ready'].includes(d.stage))
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manufacturing Dashboard</h1>
          <p className="text-gray-500 mt-1">Active production orders</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="In Production" value={productionDeals.length} icon={Factory} color="blue" />
          <StatCard title="Pending Tasks" value={tasks.length} icon={CheckSquare} color="amber" />
          <StatCard title="Overdue Tasks" value={overdueTasksCount} icon={AlertTriangle} color="red" />
        </div>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">My Tasks</CardTitle>
            <Link href="/dashboard/tasks"><Button variant="ghost" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No pending tasks</p>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <CheckSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.deal && <p className="text-xs text-gray-500">{task.deal.dealNumber}</p>}
                      {task.dueDate && <p className={`text-xs mt-0.5 ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>Due {formatDate(task.dueDate)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Production Orders</CardTitle>
            <Link href="/dashboard/production"><Button variant="ghost" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent>
            {productionDeals.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No active production orders</p>
            ) : (
              <div className="space-y-3">
                {productionDeals.slice(0, 4).map(deal => {
                  const stages = deal.productionStages || []
                  const completed = stages.filter((s: any) => s.status === 'completed').length
                  const total = stages.length || 1
                  const pct = Math.round((completed / total) * 100)
                  return (
                    <Link key={deal.id} href={`/dashboard/deals/${deal.id}`}>
                      <div className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{deal.customerName}</span>
                          <span className="text-xs text-gray-400">{deal.dealNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{completed}/{total} stages complete</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // VP, Accounts, Design
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {role === 'vp' ? 'VP Dashboard' : role === 'accounts' ? 'Accounts Dashboard' : 'Design Dashboard'}
        </h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Active Deals" value={activeDeals.length} icon={FileText} />
        <StatCard title="Pending Tasks" value={tasks.length} icon={CheckSquare} color="amber" />
        <StatCard title="Overdue" value={overdueTasksCount} icon={AlertTriangle} color="red" />
      </div>

      {todaysTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Due Today ({todaysTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaysTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <CheckSquare className="w-4 h-4 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.deal && <p className="text-xs text-gray-500">{task.deal.dealNumber} &middot; {task.deal.customerName}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Tasks</CardTitle>
          <Link href="/dashboard/tasks"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3" /></Button></Link>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No pending tasks</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <CheckSquare className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.deal && <p className="text-xs text-gray-400">{task.deal.dealNumber}</p>}
                  </div>
                  {task.dueDate && (
                    <span className={`text-xs ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Deals</CardTitle>
          <Link href="/dashboard/deals"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3" /></Button></Link>
        </CardHeader>
        <CardContent>
          {activeDeals.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No active deals</p>
          ) : (
            <div className="space-y-2">
              {activeDeals.slice(0, 5).map(deal => (
                <Link key={deal.id} href={`/dashboard/deals/${deal.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{deal.customerName}</span>
                      </div>
                      <p className="text-xs text-gray-400">{deal.dealNumber}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
