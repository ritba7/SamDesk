'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft, CheckSquare, Clock, FileText, Plus,
  Flame, Thermometer, Snowflake, ChevronRight,
  Activity, DollarSign, Factory, User, Calendar,
  MessageSquare, Phone, AlertCircle, Check, X, Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, getStageColor, getStageLabel, STAGES, PRODUCTION_STAGES } from '@/lib/utils'
import { generateQuote } from '@/lib/generateQuote'
import { generatePI } from '@/lib/generatePI'
import { generateTDS } from '@/lib/generateTDS'

interface Deal {
  id: string
  dealNumber: string
  customerName: string
  customerCompany: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  customerState?: string
  material?: string
  motorType?: string
  motorBrand?: string
  motorBrandOther?: string
  outerWidth?: number
  outerHeight?: number
  outerDepth?: number
  innerWidth?: number
  innerHeight?: number
  innerDepth?: number
  specNotes?: string
  freightPaidBy?: string
  installationType?: string
  stage: string
  heatScore: string
  quotedAmount?: number
  advanceAmount?: number
  advanceReceived: boolean
  balanceAmount?: number
  balancePaid: boolean
  gstRate?: number
  expectedDispatch?: string
  actualDispatch?: string
  assignedTo?: { id: string; name: string; role: string }
  createdBy: { name: string; role: string }
  activities: any[]
  tasks: any[]
  documents: any[]
  productionStages: any[]
  quotes: any[]
  payments: any[]
  lostReason?: string
  lostNotes?: string
  createdAt: string
  updatedAt: string
}

const STAGE_FLOW = [
  'inquiry', 'tds_sent', 'quote_sent', 'follow_up', 'po_received',
  'po_vetted', 'pi_sent', 'approval_pending', 'production',
  'dispatch_ready', 'dispatched', 'feedback_pending', 'closed_won'
]

function HeatBadge({ score }: { score: string }) {
  if (score === 'hot') return <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><Flame className="w-3 h-3" /> Hot</span>
  if (score === 'warm') return <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Thermometer className="w-3 h-3" /> Warm</span>
  return <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><Snowflake className="w-3 h-3" /> Cold</span>
}

function LogPaymentButton({ dealId, onSaved }: { dealId: string, onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ type: 'advance', amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.amount) return
    setSaving(true)
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, type: form.type, amount: parseFloat(form.amount), date: new Date(form.date).toISOString(), notes: form.notes })
    })
    setOpen(false)
    setForm({ type: 'advance', amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
    setSaving(false)
    onSaved()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Log Payment</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Log Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white">
                  <option value="advance">Advance</option>
                  <option value="balance">Balance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount (₹)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                  placeholder="0" className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !form.amount}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NewQuoteButton({ dealId, onSaved }: { dealId: string, onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.amount) return
    setSaving(true)
    await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, amount: parseFloat(form.amount), notes: form.notes })
    })
    setOpen(false)
    setForm({ amount: '', notes: '' })
    setSaving(false)
    onSaved()
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" /> New Quote Version</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900">New Quote Version</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount (₹, ex-GST)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                  placeholder="0" className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Changes from previous version..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !form.amount}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function DealDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'meeting'>('note')
  const [savingNote, setSavingNote] = useState(false)
  const [stageLoading, setStageLoading] = useState(false)
  const [showLostDropdown, setShowLostDropdown] = useState(false)
  const [lostReason, setLostReason] = useState('')

  const user = session?.user as any
  const role = user?.role

  const fetchDeal = async () => {
    const res = await fetch(`/api/deals/${id}`)
    if (res.ok) setDeal(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchDeal() }, [id])

  const changeStage = async (newStage: string) => {
    if (!deal) return
    setStageLoading(true)
    const res = await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage })
    })
    if (res.ok) await fetchDeal()
    setStageLoading(false)
  }

  const markLost = async (reason: string) => {
    if (!deal) return
    setStageLoading(true)
    await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'closed_lost', lostReason: reason })
    })
    setShowLostDropdown(false)
    setLostReason('')
    await fetchDeal()
    setStageLoading(false)
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSavingNote(true)
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: id, type: noteType, content: note })
    })
    setNote('')
    await fetchDeal()
    setSavingNote(false)
  }

  const markTaskDone = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' })
    })
    await fetchDeal()
  }

  const updateProductionStage = async (stageId: string, status: string) => {
    await fetch(`/api/production/${stageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    await fetchDeal()
  }

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>
  if (!deal) return <div className="text-center py-12"><p className="text-gray-400">Deal not found</p><Link href="/dashboard/deals"><Button className="mt-4" variant="outline">Back to Deals</Button></Link></div>

  const currentIdx = STAGE_FLOW.indexOf(deal.stage)
  const nextStage = currentIdx >= 0 && currentIdx < STAGE_FLOW.length - 1 ? STAGE_FLOW[currentIdx + 1] : null
  const isLost = deal.stage === 'closed_lost'
  const isWon = deal.stage === 'closed_won'

  const canEdit = ['director', 'vp', 'accounts'].includes(role)
  const canUpdateProduction = ['director', 'manufacturing'].includes(role)

  const totalPaid = deal.payments.reduce((sum, p) => sum + p.amount, 0)
  const pendingTasks = deal.tasks.filter(t => t.status === 'pending')

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/deals">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{deal.customerName}</h1>
              <HeatBadge score={deal.heatScore} />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(deal.stage)}`}>
                {getStageLabel(deal.stage)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="font-mono">{deal.dealNumber}</span>
              <span>&middot;</span>
              <span>{deal.customerCompany}</span>
              {deal.customerState && <><span>&middot;</span><span>{deal.customerState}</span></>}
            </div>
          </div>
        </div>

        {/* Stage progression */}
        {canEdit && !isLost && !isWon && (
          <div className="flex items-center gap-2 relative">
            {nextStage && (
              <Button
                onClick={() => changeStage(nextStage)}
                disabled={stageLoading}
                size="sm"
              >
                Move to {getStageLabel(nextStage)} <ChevronRight className="w-3 h-3" />
              </Button>
            )}
            {!isLost && (
              <div className="relative">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowLostDropdown(v => !v)}
                >
                  Mark as Lost
                </Button>
                {showLostDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <p className="text-xs text-gray-500 px-3 py-1.5 border-b">Select reason:</p>
                    {['Price', 'Competition', 'Project Cancelled', 'No Response', 'Other'].map(reason => (
                      <button
                        key={reason}
                        className="w-full text-left text-sm px-3 py-2 hover:bg-red-50 hover:text-red-700 transition-colors"
                        onClick={() => markLost(reason)}
                      >
                        {reason}
                      </button>
                    ))}
                    <button
                      className="w-full text-left text-xs px-3 py-1.5 text-gray-400 hover:text-gray-600 border-t"
                      onClick={() => setShowLostDropdown(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage progress bar */}
      {!isLost && (
        <div className="overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {STAGE_FLOW.map((stage, idx) => {
              const isCompleted = idx < currentIdx
              const isCurrent = idx === currentIdx
              const isUpcoming = idx > currentIdx
              return (
                <div key={stage} className="flex items-center">
                  <div
                    className={`flex flex-col items-center cursor-pointer group ${canEdit && !isLost ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => canEdit && !isLost && changeStage(stage)}
                    title={getStageLabel(stage)}
                  >
                    <div className={`w-3 h-3 rounded-full transition-colors ${
                      isCompleted ? 'bg-green-500' :
                      isCurrent ? 'bg-blue-600' :
                      'bg-gray-200'
                    }`} />
                    <span className={`text-xs mt-1 whitespace-nowrap ${
                      isCurrent ? 'text-blue-600 font-medium' :
                      isCompleted ? 'text-green-600' :
                      'text-gray-400'
                    }`}>{getStageLabel(stage)}</span>
                  </div>
                  {idx < STAGE_FLOW.length - 1 && (
                    <div className={`w-6 h-0.5 flex-shrink-0 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isLost && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Deal Closed Lost</p>
          {deal.lostReason && <p className="text-red-600 text-sm mt-1">Reason: {deal.lostReason}</p>}
          {deal.lostNotes && <p className="text-red-500 text-sm mt-1">{deal.lostNotes}</p>}
          {canEdit && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => changeStage('inquiry')}>
              Reopen Deal
            </Button>
          )}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Quoted Amount</p>
            <p className="text-lg font-bold text-gray-900">{deal.quotedAmount ? formatCurrency(deal.quotedAmount) : '—'}</p>
            {deal.gstRate && <p className="text-xs text-gray-400">GST {deal.gstRate}%</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Received</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Tasks</p>
            <p className="text-lg font-bold text-amber-600">{pendingTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Expected Dispatch</p>
            <p className="text-lg font-bold text-gray-900">{deal.expectedDispatch ? formatDate(deal.expectedDispatch) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity ({deal.activities.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Stage Advancement */}
          {canEdit && !isLost && !isWon && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Stage Advancement</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {nextStage ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        Current: <span className={`font-medium px-1.5 py-0.5 rounded text-xs ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Next: <span className="font-medium text-blue-600">{getStageLabel(nextStage)}</span>
                      </p>
                    </div>
                    <Button
                      onClick={() => changeStage(nextStage)}
                      disabled={stageLoading}
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Move to {getStageLabel(nextStage)}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Deal is at the final active stage.</p>
                )}
                <div className="relative">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowLostDropdown(v => !v)}
                  >
                    Mark as Lost
                  </Button>
                  {showLostDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                      <p className="text-xs text-gray-500 px-3 py-1.5 border-b">Select reason:</p>
                      {['Price', 'Competition', 'Project Cancelled', 'No Response', 'Other'].map(reason => (
                        <button
                          key={reason}
                          className="w-full text-left text-sm px-3 py-2 hover:bg-red-50 hover:text-red-700 transition-colors"
                          onClick={() => markLost(reason)}
                        >
                          {reason}
                        </button>
                      ))}
                      <button
                        className="w-full text-left text-xs px-3 py-1.5 text-gray-400 hover:text-gray-600 border-t"
                        onClick={() => setShowLostDropdown(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Customer Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {deal.customerEmail && <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{deal.customerEmail}</span></div>}
                {deal.customerPhone && <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{deal.customerPhone}</span></div>}
                {deal.customerState && <div className="flex justify-between"><span className="text-gray-500">State</span><span>{deal.customerState}</span></div>}
                {deal.customerAddress && <div><span className="text-gray-500">Address</span><p className="mt-0.5 text-gray-700">{deal.customerAddress}</p></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Product Specs</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {deal.material && <div className="flex justify-between"><span className="text-gray-500">Material</span><span className="uppercase">{deal.material}</span></div>}
                {deal.motorType && <div className="flex justify-between"><span className="text-gray-500">Motor</span><span className="uppercase">{deal.motorType} - {deal.motorBrand === 'other' ? deal.motorBrandOther : deal.motorBrand}</span></div>}
                {deal.outerWidth && <div className="flex justify-between"><span className="text-gray-500">Outer (W×H×D)</span><span>{deal.outerWidth}×{deal.outerHeight}×{deal.outerDepth} mm</span></div>}
                {deal.innerWidth && <div className="flex justify-between"><span className="text-gray-500">Inner (W×H×D)</span><span>{deal.innerWidth}×{deal.innerHeight}×{deal.innerDepth} mm</span></div>}
                {deal.freightPaidBy && <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="capitalize">{deal.freightPaidBy}</span></div>}
                {deal.installationType && <div className="flex justify-between"><span className="text-gray-500">Installation</span><span className="capitalize">{deal.installationType}</span></div>}
                {deal.specNotes && <div><span className="text-gray-500">Notes</span><p className="mt-0.5 text-gray-700">{deal.specNotes}</p></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Assignment & Dates</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Created by</span><span>{deal.createdBy.name}</span></div>
                {deal.assignedTo && <div className="flex justify-between"><span className="text-gray-500">Assigned to</span><span>{deal.assignedTo.name}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDate(deal.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Updated</span><span>{formatDate(deal.updatedAt)}</span></div>
                {deal.expectedDispatch && <div className="flex justify-between"><span className="text-gray-500">Expected Dispatch</span><span>{formatDate(deal.expectedDispatch)}</span></div>}
                {deal.actualDispatch && <div className="flex justify-between"><span className="text-gray-500">Actual Dispatch</span><span>{formatDate(deal.actualDispatch)}</span></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Financial Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {deal.quotedAmount && <div className="flex justify-between"><span className="text-gray-500">Quoted (ex-GST)</span><span className="font-medium">{formatCurrency(deal.quotedAmount)}</span></div>}
                {deal.quotedAmount && deal.gstRate && (
                  <div className="flex justify-between"><span className="text-gray-500">Total (incl. GST {deal.gstRate}%)</span><span className="font-medium">{formatCurrency(deal.quotedAmount * (1 + deal.gstRate / 100))}</span></div>
                )}
                <div className="border-t pt-2 mt-2">
                  {deal.advanceAmount && <div className="flex justify-between"><span className="text-gray-500">Advance</span><span>{formatCurrency(deal.advanceAmount)} {deal.advanceReceived ? '✓' : '(pending)'}</span></div>}
                  {deal.balanceAmount && <div className="flex justify-between"><span className="text-gray-500">Balance</span><span>{formatCurrency(deal.balanceAmount)} {deal.balancePaid ? '✓' : '(pending)'}</span></div>}
                  <div className="flex justify-between font-medium mt-1"><span className="text-gray-700">Total Received</span><span className="text-green-700">{formatCurrency(totalPaid)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          {/* Log Note / Call */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Log Note / Call</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex gap-2">
                {(['note', 'call', 'meeting'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNoteType(t)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors capitalize ${
                      noteType === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {t === 'note' ? '📝 Note' : t === 'call' ? '📞 Call' : '🤝 Meeting'}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    placeholder={
                      noteType === 'call' ? 'Summarize the call...' :
                      noteType === 'meeting' ? 'Summarize the meeting...' :
                      'Add a note or update...'
                    }
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={addNote} disabled={savingNote || !note.trim()}>
                  {savingNote ? 'Saving...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <div className="space-y-3">
            {deal.activities.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No activity yet</p>
            ) : deal.activities.map((act: any) => (
              <div key={act.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    act.type === 'stage_change' ? 'bg-blue-100' :
                    act.type === 'note' ? 'bg-gray-100' :
                    act.type === 'payment' ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    {act.type === 'stage_change' ? <ChevronRight className="w-4 h-4 text-blue-600" /> :
                     act.type === 'note' ? <MessageSquare className="w-4 h-4 text-gray-600" /> :
                     act.type === 'payment' ? <DollarSign className="w-4 h-4 text-green-600" /> :
                     <Activity className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div className="w-px flex-1 bg-gray-200 my-1" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{act.user?.name}</span>
                    <span className="text-xs text-gray-400">{formatDate(act.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{act.content}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4 space-y-3">
          {deal.tasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No tasks for this deal</p>
          ) : (
            <>
              {deal.tasks.filter((t: any) => t.status === 'pending').map((task: any) => (
                <div key={task.id} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white">
                  <button
                    onClick={() => markTaskDone(task.id)}
                    className="w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-3 h-3 text-green-600 opacity-0 hover:opacity-100" />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>{task.assignedTo?.name}</span>
                      {task.dueDate && (
                        <span className={new Date(task.dueDate) < new Date() ? 'text-red-500 font-medium' : ''}>
                          Due {formatDate(task.dueDate)}
                        </span>
                      )}
                      <span className="capitalize">{task.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
              {deal.tasks.filter((t: any) => t.status === 'done').length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                    {deal.tasks.filter((t: any) => t.status === 'done').length} completed tasks
                  </summary>
                  <div className="mt-2 space-y-2">
                    {deal.tasks.filter((t: any) => t.status === 'done').map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 opacity-60">
                        <Check className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-gray-600 line-through">{task.title}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="mt-4">
          {deal.productionStages.length === 0 ? (
            <div className="text-center py-8">
              <Factory className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Production stages will appear when deal enters production</p>
              {canEdit && deal.stage !== 'production' && (
                <Button className="mt-4" size="sm" onClick={() => changeStage('production')}>
                  Move to Production
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {deal.productionStages.map((stage: any) => {
                const meta = PRODUCTION_STAGES.find(p => p.key === stage.stageName)
                return (
                  <div key={stage.id} className={`flex items-center gap-4 p-4 rounded-lg border ${
                    stage.status === 'completed' ? 'border-green-200 bg-green-50' :
                    stage.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                    stage.status === 'delayed' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-white'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      stage.status === 'completed' ? 'bg-green-500' :
                      stage.status === 'in_progress' ? 'bg-blue-500' :
                      stage.status === 'delayed' ? 'bg-red-500' :
                      'bg-gray-200'
                    }`}>
                      {stage.status === 'completed' ? <Check className="w-4 h-4 text-white" /> :
                       stage.status === 'in_progress' ? <Activity className="w-4 h-4 text-white" /> :
                       stage.status === 'delayed' ? <AlertCircle className="w-4 h-4 text-white" /> :
                       <Clock className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{meta?.label || stage.stageName}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                        {stage.plannedEnd && <span>Planned: {formatDate(stage.plannedEnd)}</span>}
                        {stage.actualStart && <span>Started: {formatDate(stage.actualStart)}</span>}
                        {stage.actualEnd && <span>Completed: {formatDate(stage.actualEnd)}</span>}
                      </div>
                    </div>
                    {canUpdateProduction && (
                      <div className="flex gap-2">
                        {stage.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => updateProductionStage(stage.id, 'in_progress')}>
                            Start
                          </Button>
                        )}
                        {stage.status === 'in_progress' && (
                          <>
                            <Button size="sm" variant="success" onClick={() => updateProductionStage(stage.id, 'completed')}>
                              Complete
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => updateProductionStage(stage.id, 'delayed')}>
                              Delay
                            </Button>
                          </>
                        )}
                        {stage.status === 'delayed' && (
                          <Button size="sm" variant="outline" onClick={() => updateProductionStage(stage.id, 'in_progress')}>
                            Resume
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          {/* Status flags */}
          <div className="flex gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${deal.advanceReceived ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {deal.advanceReceived ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              Advance {deal.advanceReceived ? 'Received' : 'Pending'}
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${deal.balancePaid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {deal.balancePaid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              Balance {deal.balancePaid ? 'Paid' : 'Pending'}
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Payment Summary</CardTitle>
                {canEdit && <LogPaymentButton dealId={deal.id as string} onSaved={fetchDeal} />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Quoted</span>
                  <span className="font-medium">{deal.quotedAmount ? formatCurrency(deal.quotedAmount) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Received</span>
                  <span className="font-medium text-green-700">{formatCurrency(totalPaid)}</span>
                </div>
                {deal.quotedAmount && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-500">Outstanding</span>
                    <span className={`font-medium ${deal.quotedAmount - totalPaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.max(0, deal.quotedAmount - totalPaid))}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {deal.payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No payments recorded</p>
          ) : (
            <div className="space-y-2">
              {deal.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">{payment.type} &middot; {formatDate(payment.date)}</p>
                    {payment.notes && <p className="text-xs text-gray-400 mt-0.5">{payment.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          {/* Quote History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Quote History</CardTitle>
                {canEdit && <NewQuoteButton dealId={deal.id as string} onSaved={fetchDeal} />}
              </div>
            </CardHeader>
            <CardContent>
              {deal.quotes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No quotes recorded yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="pb-2 text-left font-medium">Version</th>
                      <th className="pb-2 text-left font-medium">Amount</th>
                      <th className="pb-2 text-left font-medium">Date</th>
                      <th className="pb-2 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deal.quotes.map((q: any) => (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="py-2 font-medium">v{q.version}</td>
                        <td className="py-2 font-medium text-gray-900">{formatCurrency(q.amount)}</td>
                        <td className="py-2 text-gray-500">{formatDate(q.createdAt)}</td>
                        <td className="py-2 text-gray-400 text-xs">{q.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Document Generation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 bg-white">
                  <FileText className="w-8 h-8 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Technical Data Sheet (TDS)</p>
                    <p className="text-xs text-gray-500 mt-0.5">Generate a TDS PDF with product specifications. Sent to customers before quoting.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateTDS(deal)}
                    className="flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Generate TDS
                  </Button>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 bg-white">
                  <FileText className="w-8 h-8 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Quotation</p>
                    <p className="text-xs text-gray-500 mt-0.5">Generate a quote PDF in SAM PRODUCTS format with technical specifications and pricing.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => generateQuote(deal)}
                    className="flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Generate Quote
                  </Button>
                </div>

                {(STAGE_FLOW.indexOf(deal.stage) >= STAGE_FLOW.indexOf('pi_sent') || deal.stage === 'pi_sent') && (
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 bg-white">
                    <FileText className="w-8 h-8 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Proforma Invoice (PI)</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Generate a PI with {deal.customerState === 'Uttar Pradesh' ? 'CGST + SGST (9% + 9%)' : 'IGST (18%)'} — HSN 84145930.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePI(deal)}
                      className="flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Generate PI
                    </Button>
                  </div>
                )}
              </div>

              {deal.documents && deal.documents.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Existing Documents</p>
                  <div className="space-y-2">
                    {deal.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 flex-1">{doc.name || doc.type}</span>
                        <span className="text-xs text-gray-400">{formatDate(doc.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
