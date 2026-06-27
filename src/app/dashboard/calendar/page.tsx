'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CalEvent {
  id: string
  date: string
  type: string
  title: string
  sub?: string
  role?: string
  dealId?: string
  amount?: number
  direction?: 'in' | 'out'
}

const TYPE_META: Record<string, { label: string; pill: string; dot: string; badge: string }> = {
  task:        { label: 'Task',        pill: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-800' },
  payment_in:  { label: 'Payment In',  pill: 'bg-green-100 text-green-800', dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800' },
  payment_out: { label: 'Payment Out', pill: 'bg-red-100 text-red-800',     dot: 'bg-red-500',    badge: 'bg-red-100 text-red-800' },
  deadline:    { label: 'Deadline',    pill: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-800' },
  dispatch:    { label: 'Dispatch',    pill: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
  production:  { label: 'Production',  pill: 'bg-slate-200 text-slate-800', dot: 'bg-slate-500',  badge: 'bg-slate-200 text-slate-800' },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const [events, setEvents] = useState<CalEvent[]>([])
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(d => Array.isArray(d) && setEvents(d)).catch(() => {})
  }, [])

  // Group events by local YYYY-MM-DD
  const byDay: Record<string, CalEvent[]> = {}
  for (const e of events) {
    const key = localKey(new Date(e.date))
    ;(byDay[key] = byDay[key] || []).push(e)
  }

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = localKey(new Date())

  // Build grid cells
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  // Month summary
  const monthEvents = events.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month })
  const taskCount = monthEvents.filter(e => e.type === 'task').length
  const inSum = monthEvents.filter(e => e.type === 'payment_in').reduce((s, e) => s + (e.amount || 0), 0)
  const outSum = monthEvents.filter(e => e.type === 'payment_out').reduce((s, e) => s + (e.amount || 0), 0)
  const deadlineCount = monthEvents.filter(e => e.type === 'deadline').length

  const title = role === 'director'
    ? 'Company Calendar — all deadlines, payments & tasks'
    : 'My Calendar'

  const selectedEvents = selectedDay ? (byDay[selectedDay] || []) : []

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <CalendarDays className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(TYPE_META).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`w-3 h-3 rounded-full ${m.dot}`} /> {m.label}
          </span>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-slate-500">Tasks</p>
          <p className="text-lg font-bold text-blue-600">{taskCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-slate-500">Payments In</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(inSum)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-slate-500">Payments Out</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(outSum)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-slate-500">Deadlines</p>
          <p className="text-lg font-bold text-amber-600">{deadlineCount}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-800">{MONTHS[month]} {year}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)) }} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">Today</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DOW.map(d => <div key={d} className="px-2 py-2 text-xs font-semibold text-slate-500 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="min-h-[90px] border-b border-r border-gray-100 bg-gray-50/50" />
            const key = localKey(cell)
            const dayEvents = byDay[key] || []
            const isToday = key === todayKey
            return (
              <button key={i} onClick={() => setSelectedDay(key)}
                className="min-h-[90px] border-b border-r border-gray-100 p-1.5 text-left hover:bg-blue-50/40 transition-colors align-top">
                <div className={`text-xs font-semibold mb-1 inline-flex items-center justify-center w-5 h-5 rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{cell.getDate()}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(e => {
                    const m = TYPE_META[e.type] || TYPE_META.task
                    return <div key={e.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${m.pill}`} title={e.title}>{e.title}</div>
                  })}
                  {dayEvents.length > 3 && <div className="text-[10px] text-slate-500 px-1">+{dayEvents.length - 3} more</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDay(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-800">{new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h3>
              <button onClick={() => setSelectedDay(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {selectedEvents.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No events this day.</p>}
              {selectedEvents.map(e => {
                const m = TYPE_META[e.type] || TYPE_META.task
                const body = (
                  <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 leading-snug">{e.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${m.badge}`}>{m.label}</span>
                    </div>
                    {e.sub && <p className="text-xs text-slate-500 mt-1">{e.sub}</p>}
                    {typeof e.amount === 'number' && (
                      <p className={`text-xs font-semibold mt-1 ${e.direction === 'out' ? 'text-red-600' : 'text-green-600'}`}>
                        {e.direction === 'out' ? '- ' : e.direction === 'in' ? '+ ' : ''}{formatCurrency(e.amount)}
                      </p>
                    )}
                  </div>
                )
                return e.dealId
                  ? <Link key={e.id} href={`/dashboard/deals/${e.dealId}`} className="block">{body}</Link>
                  : <div key={e.id}>{body}</div>
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
