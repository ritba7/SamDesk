'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Phone, RefreshCw, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, getStageLabel } from '@/lib/utils'

interface FollowUpDeal {
  id: string
  dealNumber: string
  customerName: string
  customerPhone?: string
  stage: string
  updatedAt: string
  tasks: any[]
  activities: any[]
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function isTodayOrOverdue(date: string) {
  const d = new Date(date)
  const now = new Date()
  d.setHours(23, 59, 59, 999)
  return d <= now
}

function isWithinWeek(date: string) {
  const d = new Date(date)
  const weekLater = new Date()
  weekLater.setDate(weekLater.getDate() + 7)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d >= today && d <= weekLater
}

function LogCallRow({ deal, onLogged }: { deal: FollowUpDeal, onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleLog = async () => {
    if (!note.trim()) return
    setSaving(true)
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: deal.id, type: 'call', content: note })
    })
    setNote('')
    setOpen(false)
    setSaving(false)
    onLogged()
  }

  const lastNote = deal.activities?.[0]?.content || '—'

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{deal.customerName}</span>
            <span className="text-xs font-mono text-gray-400">{deal.dealNumber}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700`}>{getStageLabel(deal.stage)}</span>
          </div>
          {deal.customerPhone && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
              <Phone className="w-3.5 h-3.5" />
              <a href={`tel:${deal.customerPhone}`} className="hover:text-blue-600">{deal.customerPhone}</a>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1 truncate">Last: {lastNote}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>
          <Phone className="w-3.5 h-3.5 mr-1" /> Log Call
        </Button>
      </div>
      {open && (
        <div className="flex gap-2 mt-2">
          <Textarea
            placeholder="Note about this call..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="flex-1"
          />
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={handleLog} disabled={saving || !note.trim()}>
              {saving ? '...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FollowUpsPage() {
  const { data: session } = useSession()
  const [deals, setDeals] = useState<FollowUpDeal[]>([])
  const [loading, setLoading] = useState(true)

  const user = session?.user as any
  const role = user?.role

  const allowed = ['director', 'vp', 'accounts'].includes(role)

  const fetchDeals = async () => {
    const res = await fetch('/api/deals')
    const data = await res.json()
    setDeals(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchDeals() }, [])

  if (!allowed) return (
    <div className="text-center py-12 text-gray-400">You do not have access to this page.</div>
  )

  // "Call Today" — deals with follow-up tasks due today or overdue
  const callToday = deals.filter(d =>
    d.tasks?.some((t: any) => t.status === 'pending' && t.type === 'follow_up' && t.dueDate && isTodayOrOverdue(t.dueDate))
  )

  // "This Week" — follow-up tasks due within 7 days (but not today/overdue)
  const thisWeek = deals.filter(d =>
    !callToday.find(c => c.id === d.id) &&
    d.tasks?.some((t: any) => t.status === 'pending' && t.type === 'follow_up' && t.dueDate && isWithinWeek(t.dueDate))
  )

  // "Reactivation" — deals in same stage for 30+ days with no recent activity
  const reactivation = deals.filter(d => {
    const closed = ['closed_won', 'closed_lost']
    if (closed.includes(d.stage)) return false
    return daysSince(d.updatedAt) >= 30
  })

  const Section = ({ title, icon: Icon, items, emptyMsg, showDays }: {
    title: string, icon: React.ElementType, items: FollowUpDeal[], emptyMsg: string, showDays?: boolean
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4" />
          {title}
          <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{emptyMsg}</p>
        ) : items.map(deal => (
          <div key={deal.id} className="space-y-1">
            <LogCallRow deal={deal} onLogged={fetchDeals} />
            {showDays && (
              <p className="text-xs text-gray-400 pl-4">{daysSince(deal.updatedAt)} days since last activity</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-gray-500 mt-1">Manage your outreach and reactivations</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDeals}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          <Section
            title="Call Today"
            icon={Phone}
            items={callToday}
            emptyMsg="No follow-ups due today"
          />
          <Section
            title="This Week"
            icon={Calendar}
            items={thisWeek}
            emptyMsg="No follow-ups due this week"
          />
          <Section
            title="Reactivation (30+ days idle)"
            icon={Clock}
            items={reactivation}
            emptyMsg="No cold deals to reactivate"
            showDays
          />
        </>
      )}
    </div>
  )
}
