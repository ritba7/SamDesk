'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Task {
  id: string
  title: string
  status: string
  dueDate: string | null
  type: string
  assignedTo: { name: string; role: string } | null
  deal: { dealNumber: string; customerName: string } | null
  createdAt: string
}

interface UserWorkload {
  id: string
  name: string
  role: string
  overdue: Task[]
  pending: Task[]
  done: Task[]
}

const ROLE_LABELS: Record<string, string> = {
  director: 'Director',
  vp: 'VP / Assistant',
  accounts: 'Accounts',
  manufacturing: 'Manufacturing',
  design: 'Design',
  sales: 'Sales',
}

export default function WorkloadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workloads, setWorkloads] = useState<UserWorkload[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    const user = session?.user as any
    if (status === 'authenticated' && user?.role !== 'director') router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, tasksRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/tasks?all=true'),
        ])
        const users = await usersRes.json()
        const tasks: Task[] = await tasksRes.json()

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const grouped: UserWorkload[] = users.map((u: any) => {
          const userTasks = tasks.filter((t: Task) => t.assignedTo?.name === u.name)
          const overdue = userTasks.filter(t => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < today)
          const pending = userTasks.filter(t => t.status === 'pending' && (!t.dueDate || new Date(t.dueDate) >= today))
          const done = userTasks.filter(t => t.status === 'completed')
          return { id: u.id, name: u.name, role: u.role, overdue, pending, done }
        })

        setWorkloads(grouped)
      } finally {
        setLoading(false)
      }
    }
    if (status === 'authenticated') load()
  }, [status])

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading workload data...</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" /> Team Workload
        </h1>
        <p className="text-slate-500 text-sm mt-1">Live task distribution across all team members</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Team</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{workloads.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Overdue Tasks</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{workloads.reduce((s, w) => s + w.overdue.length, 0)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-100">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending Tasks</p>
          <p className="text-3xl font-bold text-amber-700 mt-1">{workloads.reduce((s, w) => s + w.pending.length, 0)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Completed</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{workloads.reduce((s, w) => s + w.done.length, 0)}</p>
        </div>
      </div>

      {/* Per-user breakdown */}
      <div className="space-y-3">
        {workloads.map(w => (
          <div key={w.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              onClick={() => toggle(w.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {w.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">{w.name}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[w.role] || w.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {w.overdue.length > 0 && (
                  <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                    <AlertCircle className="w-4 h-4" /> {w.overdue.length} overdue
                  </span>
                )}
                <span className="flex items-center gap-1 text-amber-600 text-sm">
                  <Clock className="w-4 h-4" /> {w.pending.length} pending
                </span>
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" /> {w.done.length} done
                </span>
                {expanded[w.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expanded[w.id] && (
              <div className="border-t border-gray-100 px-4 pb-4">
                {[...w.overdue, ...w.pending, ...w.done].length === 0 ? (
                  <p className="text-slate-400 text-sm py-3">No tasks assigned.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {[
                      { label: 'Overdue', tasks: w.overdue, color: 'text-red-600', bg: 'bg-red-50' },
                      { label: 'Pending', tasks: w.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Completed', tasks: w.done, color: 'text-green-600', bg: 'bg-green-50' },
                    ].map(({ label, tasks, color, bg }) => tasks.length > 0 && (
                      <div key={label}>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${color}`}>{label}</p>
                        {tasks.map(t => (
                          <div key={t.id} className={`${bg} rounded-lg px-3 py-2 mb-1`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-slate-700 font-medium leading-snug">{t.title}</p>
                              {t.dueDate && (
                                <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(t.dueDate)}</span>
                              )}
                            </div>
                            {t.deal && (
                              <p className="text-xs text-slate-500 mt-0.5">{t.deal.dealNumber} · {t.deal.customerName}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
