'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { CheckSquare, Clock, AlertCircle, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function TasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all')
  const [showDone, setShowDone] = useState(false)
  const user = session?.user as any

  const fetchTasks = async () => {
    setLoading(true)
    const url = user?.role === 'director' ? '/api/tasks?all=true' : '/api/tasks'
    const res = await fetch(url)
    const data = await res.json()
    setTasks(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => {
    if (user) fetchTasks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role])

  const markDone = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) })
    await fetchTasks()
  }

  const now = new Date()
  const today = now.toDateString()

  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')

  const filtered = pendingTasks.filter(t => {
    if (filter === 'today') return t.dueDate && new Date(t.dueDate).toDateString() === today
    if (filter === 'overdue') return t.dueDate && new Date(t.dueDate) < now
    return true
  })

  const overdueCount = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now).length
  const todayCount = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today).length
  const typeColors: Record<string, string> = { follow_up: 'bg-blue-100 text-blue-700', document: 'bg-purple-100 text-purple-700', call: 'bg-green-100 text-green-700', other: 'bg-gray-100 text-gray-700' }

  const TaskRow = ({ task }: { task: any }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < now
    const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === today
    const isDone = task.status === 'done'
    return (
      <div className={`flex items-start gap-3 p-4 rounded-lg border bg-white ${ isDone ? 'border-gray-100 opacity-60' : isOverdue ? 'border-red-200 bg-red-50/30' : isDueToday ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200' }`}>
        {!isDone && (
          <button onClick={() => markDone(task.id)} className="w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors">
            <Check className="w-3 h-3 text-transparent hover:text-green-600" />
          </button>
        )}
        {isDone && <div className="w-5 h-5 rounded border-2 border-green-400 bg-green-100 flex-shrink-0 mt-0.5 flex items-center justify-center"><Check className="w-3 h-3 text-green-600" /></div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${typeColors[task.type] || typeColors.other}`}>{task.type.replace('_', ' ')}</span>
          </div>
          {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            {task.deal && <Link href={`/dashboard/deals/${task.deal.id}`} className="text-blue-500 hover:text-blue-700 hover:underline">{task.deal.dealNumber} · {task.deal.customerName}</Link>}
            {(user?.role === 'director') && task.assignedTo && <span>Assigned: {task.assignedTo.name}</span>}
            {task.dueDate && !isDone && <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : isDueToday ? 'text-amber-600 font-medium' : ''}`}>{isOverdue && <AlertCircle className="w-3 h-3" />}{isDueToday && <Clock className="w-3 h-3" />}{isOverdue ? 'Overdue' : isDueToday ? 'Today' : ''} · {formatDate(task.dueDate)}</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Tasks</h1><p className="text-gray-500 mt-1">{pendingTasks.length} pending · {doneTasks.length} completed</p></div>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'today', 'overdue'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? (f === 'overdue' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? `All (${pendingTasks.length})` : f === 'today' ? `Due Today (${todayCount})` : `Overdue (${overdueCount})`}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading tasks...</div> : (
        <>
          {/* Pending tasks */}
          {filtered.length === 0 ? (
            <div className="text-center py-12"><CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">{filter === 'today' ? 'No tasks due today' : filter === 'overdue' ? 'No overdue tasks' : 'No pending tasks'}</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}

          {/* Completed tasks (collapsible) */}
          {doneTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors mb-3"
              >
                {showDone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showDone ? 'Hide' : 'Show'} Completed Tasks ({doneTasks.length})
              </button>
              {showDone && (
                <div className="space-y-2">
                  {doneTasks.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
