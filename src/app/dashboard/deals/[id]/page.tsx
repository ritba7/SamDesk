'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft, CheckSquare, Clock, FileText, Plus,
  Flame, Thermometer, Snowflake, ChevronRight,
  Activity, DollarSign, Factory, Calendar,
  MessageSquare, AlertCircle, Check, Download,
  Shield, Phone, Mail as MailIcon, Pencil, Copy, TrendingUp, Edit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, getStageColor, getStageLabel, STAGES, PRODUCTION_STAGES } from '@/lib/utils'
import { generateQuote } from '@/lib/generateQuote'
import { generatePI } from '@/lib/generatePI'

const STAGE_FLOW = ['inquiry','tds_sent','quote_sent','follow_up','po_received','po_vetted','pi_sent','approval_pending','production','dispatch_ready','dispatched','feedback_pending','closed_won']

function HeatBadge({ score }: { score: string }) {
  if (score === 'hot') return <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><Flame className="w-3 h-3" /> Hot</span>
  if (score === 'warm') return <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Thermometer className="w-3 h-3" /> Warm</span>
  return <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><Snowflake className="w-3 h-3" /> Cold</span>
}

export default function DealDetailPage() {
  const { id } = useParams()
  const { data: session } = useSession()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [stageLoading, setStageLoading] = useState(false)
  const [logType, setLogType] = useState<'call'|'email'|'negotiation'|null>(null)
  const [logContent, setLogContent] = useState('')
  const [loggingActivity, setLoggingActivity] = useState(false)
  const [logOutcome, setLogOutcome] = useState('neutral')
  const [logSubType, setLogSubType] = useState('negotiation')

  // Payment form
  const [paymentForm, setPaymentForm] = useState({ amount: '', type: 'advance', paymentMode: '', utrNumber: '', bankAccount: '', date: new Date().toISOString().split('T')[0], notes: '' })
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [fuAssignee, setFuAssignee] = useState('')
  const [fuDays, setFuDays] = useState(3)
  const [fuNote, setFuNote] = useState('')
  const [fuSaving, setFuSaving] = useState(false)

  // GST quick-fill
  const [gstInput, setGstInput] = useState('')
  const [savingGst, setSavingGst] = useState(false)

  // Quoted amount edit
  const [editingQuote, setEditingQuote] = useState(false)
  const [quoteInput, setQuoteInput] = useState('')
  const [savingQuote, setSavingQuote] = useState(false)

  // Task deadline editing
  const [editingTaskDue, setEditingTaskDue] = useState<string | null>(null)
  const [taskDueInput, setTaskDueInput] = useState('')

  // Production deadline editing
  const [editingProdDue, setEditingProdDue] = useState<string | null>(null)
  const [prodDueInput, setProdDueInput] = useState('')

  // Intro email copy
  const [emailCopied, setEmailCopied] = useState(false)

  const user = session?.user as any
  const role = user?.role

  const fetchDeal = async () => {
    const res = await fetch(`/api/deals/${id}`)
    if (res.ok) setDeal(await res.json())
    setLoading(false)
  }
  useEffect(() => {
    fetchDeal()
    fetch('/api/users').then(r => r.json()).then(u => setUsers(Array.isArray(u) ? u : []))
  }, [id])

  const changeStage = async (newStage: string) => {
    if (!deal) return; setStageLoading(true)
    const res = await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: newStage }) })
    if (res.ok) await fetchDeal()
    setStageLoading(false)
  }

  const addNote = async () => {
    if (!note.trim()) return; setSavingNote(true)
    await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id, type: 'note', content: note }) })
    setNote(''); await fetchDeal(); setSavingNote(false)
  }

  const markTaskDone = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) })
    await fetchDeal()
  }

  const updateTaskDueDate = async (taskId: string, dueDate: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dueDate: new Date(dueDate).toISOString() }) })
    setEditingTaskDue(null)
    await fetchDeal()
  }

  const updateProdDeadline = async (stageId: string, plannedEnd: string) => {
    await fetch(`/api/production/${stageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plannedEnd: new Date(plannedEnd).toISOString() }) })
    setEditingProdDue(null)
    await fetchDeal()
  }

  const logActivity = async () => {
    if (!logContent.trim() || !logType) return
    setLoggingActivity(true)
    const type = logType === 'negotiation' ? logSubType : logType
    const metadata = logType === 'negotiation' ? JSON.stringify({ outcome: logOutcome }) : undefined
    await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id, type, content: logContent, ...(metadata ? { metadata } : {}) }) })
    setLogContent(''); setLogType(null); setLogOutcome('neutral'); setLogSubType('negotiation'); await fetchDeal(); setLoggingActivity(false)
  }

  const submitPayment = async () => {
    if (!paymentForm.amount) return
    setSavingPayment(true)
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: id,
        amount: parseFloat(paymentForm.amount),
        type: paymentForm.type,
        paymentMode: paymentForm.paymentMode || undefined,
        utrNumber: paymentForm.utrNumber || undefined,
        bankAccount: paymentForm.bankAccount || undefined,
        date: new Date(paymentForm.date).toISOString(),
        notes: paymentForm.notes || undefined,
      })
    })
    setPaymentForm({ amount: '', type: 'advance', paymentMode: '', utrNumber: '', bankAccount: '', date: new Date().toISOString().split('T')[0], notes: '' })
    setSavingPayment(false)
    setPaymentSuccess(true)
    setTimeout(() => setPaymentSuccess(false), 2000)
    await fetchDeal()
  }

  const submitFollowUp = async () => {
    if (!fuAssignee || fuDays < 1) return
    setFuSaving(true)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + fuDays)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: id, title: fuNote || `Follow-up — ${deal?.customerName}`, assignedToId: fuAssignee, dueDate: dueDate.toISOString(), type: 'follow_up', status: 'pending' })
    })
    setFuNote(''); setFuAssignee(''); setFuDays(3)
    await fetchDeal()
    setFuSaving(false)
  }

  const updateProductionStage = async (stageId: string, status: string) => {
    await fetch(`/api/production/${stageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await fetchDeal()
  }

  const saveGst = async () => {
    if (!gstInput.trim()) return
    setSavingGst(true)
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gstNumber: gstInput }) })
    // Auto-create reminder task for sales
    const salesUser = users.find((u: any) => u.role === 'sales')
    if (salesUser) {
      const due = new Date(); due.setDate(due.getDate() + 1)
      await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id, title: `Confirm GST number with customer — ${deal?.customerName}`, assignedToId: salesUser.id, dueDate: due.toISOString(), type: 'follow_up' }) })
    }
    setGstInput('')
    setSavingGst(false)
    await fetchDeal()
  }

  const saveQuotedAmount = async () => {
    if (!quoteInput) return
    setSavingQuote(true)
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quotedAmount: parseFloat(quoteInput) }) })
    setSavingQuote(false)
    setEditingQuote(false)
    await fetchDeal()
  }

  const markIntroEmailSent = async () => {
    await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id, type: 'email', content: 'Intro email sent to customer' }) })
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
  const totalPaid = deal.payments.reduce((sum: number, p: any) => sum + p.amount, 0)
  const pendingTasks = deal.tasks.filter((t: any) => t.status === 'pending')

  const hasSpecs = deal.material || deal.motorType || deal.outerWidth || deal.innerWidth || deal.freightPaidBy || deal.installationType || deal.paymentTerms || deal.freightTerms || deal.inspectionTerms

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/deals"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{deal.customerCompany}</h1>
              {canEdit && (
                <Link href={`/dashboard/deals/${id}/edit`}>
                  <button className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                    <Edit className="w-3 h-3" /> Edit Deal
                  </button>
                </Link>
              )}
              <HeatBadge score={deal.heatScore} />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="font-mono">{deal.dealNumber}</span>
              <span>&middot;</span><span>POC: {deal.customerName}</span>
              {deal.customerState && <><span>&middot;</span><span>{deal.customerState}</span></>}
            </div>
          </div>
        </div>
        {canEdit && !isLost && !isWon && (
          <div>
            <div className="flex items-center gap-2">
              {nextStage && <Button onClick={() => changeStage(nextStage)} disabled={stageLoading} size="sm">Move to {getStageLabel(nextStage)} <ChevronRight className="w-3 h-3" /></Button>}
              <Button variant="destructive" size="sm" onClick={() => changeStage('closed_lost')}>Mark Lost</Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setLogType('call')}><Phone className="w-3 h-3 mr-1" />Log Call</Button>
              <Button variant="outline" size="sm" onClick={() => setLogType('email')}><MailIcon className="w-3 h-3 mr-1" />Log Email</Button>
              <Button variant="outline" size="sm" onClick={() => setLogType('negotiation')}><TrendingUp className="w-3 h-3 mr-1" />Log Negotiation</Button>
            </div>
          </div>
        )}
      </div>

      {!isLost && (
        <div className="overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {STAGE_FLOW.map((stage, idx) => {
              const isCompleted = idx < currentIdx; const isCurrent = idx === currentIdx
              return (
                <div key={stage} className="flex items-center">
                  <div className={`flex flex-col items-center ${canEdit && !isLost ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => canEdit && !isLost && changeStage(stage)} title={getStageLabel(stage)}>
                    <div className={`w-3 h-3 rounded-full transition-colors ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    <span className={`text-xs mt-1 whitespace-nowrap ${isCurrent ? 'text-blue-600 font-medium' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>{getStageLabel(stage)}</span>
                  </div>
                  {idx < STAGE_FLOW.length - 1 && <div className={`w-6 h-0.5 flex-shrink-0 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />}
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
          {canEdit && <Button variant="outline" size="sm" className="mt-2" onClick={() => changeStage('inquiry')}>Reopen Deal</Button>}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Quoted Amount</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-gray-900">{deal.quotedAmount ? formatCurrency(deal.quotedAmount) : '—'}</p>
              {canEdit && !editingQuote && (
                <button onClick={() => { setEditingQuote(true); setQuoteInput(deal.quotedAmount ? String(deal.quotedAmount) : '') }} className="text-gray-400 hover:text-blue-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editingQuote && (
              <div className="flex gap-1 mt-1">
                <input type="number" value={quoteInput} onChange={e => setQuoteInput(e.target.value)} className="w-24 h-7 px-2 text-xs border border-gray-300 rounded" placeholder="Amount" />
                <button onClick={saveQuotedAmount} disabled={savingQuote} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">{savingQuote ? '...' : 'Save'}</button>
                <button onClick={() => setEditingQuote(false)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">×</button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Total Received</p><p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Pending Tasks</p><p className="text-lg font-bold text-amber-600">{pendingTasks.length}</p></CardContent></Card>
        {deal.advanceDeadline && !deal.advanceReceived ? (
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Advance Due</p><p className={`text-lg font-bold ${new Date(deal.advanceDeadline) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>{formatDate(deal.advanceDeadline)}</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Expected Dispatch</p><p className="text-lg font-bold text-gray-900">{deal.expectedDispatch ? formatDate(deal.expectedDispatch) : '—'}</p></CardContent></Card>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity ({deal.activities.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* GST banner */}
          {!deal.gstNumber && canEdit && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <p className="text-yellow-800 font-medium text-sm mb-2">GST number not filled — add it now</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gstInput}
                  onChange={e => setGstInput(e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="flex-1 h-9 px-3 rounded-md border border-yellow-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
                />
                <button onClick={saveGst} disabled={savingGst || !gstInput.trim()} className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-60">
                  {savingGst ? 'Saving...' : 'Verify & Save'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Customer Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {deal.customerEmail && <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{deal.customerEmail}</span></div>}
                {deal.customerPhone && <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{deal.customerPhone}</span></div>}
                {deal.customerState && <div className="flex justify-between"><span className="text-gray-500">State</span><span>{deal.customerState}</span></div>}
                {deal.customerAddress && <div><span className="text-gray-500">Address</span><p className="mt-0.5 text-gray-700">{deal.customerAddress}</p></div>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-sm">Product Specs</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {hasSpecs || deal.modelNumber ? (
                  <>
                    {deal.modelNumber && <div className="flex justify-between"><span className="text-gray-500">Model</span><span className="font-mono font-semibold text-blue-700">{deal.modelNumber}</span></div>}
                    {deal.application && <div className="flex justify-between"><span className="text-gray-500">Application</span><span>{deal.application}</span></div>}
                    {deal.numberOfUsers && <div className="flex justify-between"><span className="text-gray-500">Users / Cycle</span><span>{deal.numberOfUsers}</span></div>}
                    {deal.entryType && <div className="flex justify-between"><span className="text-gray-500">Entry Type</span><span className="capitalize">{deal.entryType.replace(/_/g, ' ')}</span></div>}
                    {deal.airFlowTime && <div className="flex justify-between"><span className="text-gray-500">Air Flow Time</span><span>{deal.airFlowTime} sec</span></div>}
                    {deal.doorType && <div className="flex justify-between"><span className="text-gray-500">Door Type</span><span className="capitalize">{deal.doorType.replace(/_/g, ' ')}</span></div>}
                    {deal.material && <div className="flex justify-between"><span className="text-gray-500">Material</span><span className="uppercase">{deal.material}</span></div>}
                    {deal.motorType && <div className="flex justify-between"><span className="text-gray-500">Motor</span><span className="uppercase">{deal.motorType}{deal.motorBrand ? ` — ${deal.motorBrand === 'other' ? deal.motorBrandOther : deal.motorBrand}` : ''}</span></div>}
                    {deal.outerWidth && <div className="flex justify-between"><span className="text-gray-500">Outer (W×H×D)</span><span>{deal.outerWidth}×{deal.outerHeight}×{deal.outerDepth} mm</span></div>}
                    {deal.innerWidth && <div className="flex justify-between"><span className="text-gray-500">Inner (W×H×D)</span><span>{deal.innerWidth}×{deal.innerHeight}×{deal.innerDepth} mm</span></div>}
                    {deal.freightPaidBy && <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="capitalize">{deal.freightPaidBy.replace(/_/g, ' ')}</span></div>}
                    {deal.installationType && <div className="flex justify-between"><span className="text-gray-500">Installation</span><span className="capitalize">{deal.installationType}</span></div>}
                    {deal.paymentTerms && <div className="flex justify-between"><span className="text-gray-500">Payment Terms</span><span className="text-right max-w-[60%]">{deal.paymentTerms}</span></div>}
                    {deal.freightTerms && <div className="flex justify-between"><span className="text-gray-500">Freight Terms</span><span className="text-right max-w-[60%]">{deal.freightTerms}</span></div>}
                    {deal.inspectionTerms && <div className="flex justify-between"><span className="text-gray-500">Inspection</span><span className="capitalize">{deal.inspectionTerms.replace(/_/g, ' ')}</span></div>}
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">Product specs not filled yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Intro Email card */}
          {deal.introEmail && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Intro Email (Auto-drafted)</CardTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(deal.introEmail); setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000) }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Copy className="w-3 h-3" />{emailCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={markIntroEmailSent}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Check className="w-3 h-3" />Mark as Sent
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3 overflow-auto max-h-48">{deal.introEmail}</pre>
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Attachments to send</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Brochure', path: '/docs/SAM-Air-Shower-Brochure.pdf' },
                      { label: 'Client List', path: '/docs/SAM-Products-Client-List.pdf' },
                      { label: 'Company Profile', path: '/docs/SAM-Products-Company-Deck.pdf' },
                    ].map(d => (
                      <a key={d.path} href={d.path} download target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100">
                        <Download className="w-3 h-3" /> {d.label}
                      </a>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending tasks mini-list */}
          {pendingTasks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Pending Tasks</CardTitle>
                  <span className="text-xs text-gray-400">{pendingTasks.length} pending</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingTasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 text-sm">
                    <button onClick={() => markTaskDone(task.id)} className="w-4 h-4 rounded border border-gray-300 hover:border-green-500 flex-shrink-0 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-green-600 opacity-0 hover:opacity-100" />
                    </button>
                    <span className="flex-1 truncate text-gray-800">{task.title}</span>
                    <span className="text-xs text-gray-400">{task.assignedTo?.name}</span>
                    {task.dueDate && <span className={`text-xs ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>{formatDate(task.dueDate)}</span>}
                  </div>
                ))}
                {pendingTasks.length > 5 && <p className="text-xs text-blue-600 mt-1">+{pendingTasks.length - 5} more — see Tasks tab</p>}
              </CardContent>
            </Card>
          )}

          <Card><CardHeader><CardTitle className="text-sm">Communication Log</CardTitle></CardHeader>
            <CardContent>
              {deal.activities.filter((a: any) => a.type === 'call' || a.type === 'email').length === 0 ? (
                <p className="text-gray-400 text-sm">No calls or emails logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {deal.activities.filter((a: any) => a.type === 'call' || a.type === 'email').map((act: any) => (
                    <div key={act.id} className="flex gap-2 text-sm p-2 rounded-lg bg-gray-50">
                      {act.type === 'call' ? <Phone className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /> : <MailIcon className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-gray-700">{act.content}</p>
                        <p className="text-xs text-gray-400">{act.user?.name} &middot; {formatDate(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {canEdit && !isLost && !isWon && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Set Manual Follow-up</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={fuAssignee} onChange={e => setFuAssignee(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">Select assignee…</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                  <input type="number" min={1} max={90} value={fuDays} onChange={e => setFuDays(Number(e.target.value))}
                    placeholder="Days until due"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input type="text" value={fuNote} onChange={e => setFuNote(e.target.value)}
                    placeholder="Task note / title (optional)"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <Button size="sm" onClick={submitFollowUp} disabled={fuSaving || !fuAssignee || fuDays < 1}>
                  {fuSaving ? 'Creating…' : 'Create Follow-up Task'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-4">
          <Card><CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-1"><Textarea placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} rows={3} /></div>
              <Button onClick={addNote} disabled={savingNote || !note.trim()}>{savingNote ? 'Saving...' : 'Add Note'}</Button>
            </div>
          </CardContent></Card>
          <div className="space-y-3">
            {deal.activities.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No activity yet</p> :
              deal.activities.map((act: any) => (
                <div key={act.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${act.type === 'stage_change' ? 'bg-blue-100' : act.type === 'note' ? 'bg-gray-100' : act.type === 'payment' ? 'bg-green-100' : act.type === 'negotiation' ? 'bg-orange-100' : 'bg-purple-100'}`}>
                      {act.type === 'stage_change' ? <ChevronRight className="w-4 h-4 text-blue-600" /> : act.type === 'note' ? <MessageSquare className="w-4 h-4 text-gray-600" /> : act.type === 'payment' ? <DollarSign className="w-4 h-4 text-green-600" /> : act.type === 'negotiation' ? <TrendingUp className="w-4 h-4 text-orange-600" /> : <Activity className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1"><span className="text-sm font-medium text-gray-900">{act.user?.name}</span><span className="text-xs text-gray-400">{formatDate(act.createdAt)}</span></div>
                    <p className="text-sm text-gray-700">{act.content}</p>
                    {act.type === 'negotiation' && act.metadata && (() => {
                      try {
                        const m = JSON.parse(act.metadata)
                        const outcomeColors: Record<string, string> = { positive: 'bg-green-100 text-green-700', neutral: 'bg-gray-100 text-gray-600', negative: 'bg-red-100 text-red-700', deal_at_risk: 'bg-orange-100 text-orange-700' }
                        return m.outcome ? <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full capitalize ${outcomeColors[m.outcome] || outcomeColors.neutral}`}>{m.outcome.replace('_',' ')}</span> : null
                      } catch { return null }
                    })()}
                  </div>
                </div>
              ))
            }
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-3">
          {deal.tasks.filter((t: any) => t.status === 'pending').map((task: any) => (
            <div key={task.id} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white">
              <button onClick={() => markTaskDone(task.id)} className="w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors">
                <Check className="w-3 h-3 text-green-600 opacity-0 hover:opacity-100" />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span>{task.assignedTo?.name}</span>
                  <div className="flex items-center gap-1">
                    {task.dueDate && (
                      <>
                        {editingTaskDue === task.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={taskDueInput}
                              onChange={e => setTaskDueInput(e.target.value)}
                              className="h-6 px-1 text-xs border border-gray-300 rounded"
                            />
                            <button onClick={() => updateTaskDueDate(task.id, taskDueInput)} className="text-xs text-blue-600 hover:underline">Save</button>
                            <button onClick={() => setEditingTaskDue(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span className={new Date(task.dueDate) < new Date() ? 'text-red-500 font-medium' : ''}>Due {formatDate(task.dueDate)}</span>
                            {canEdit && (
                              <button onClick={() => { setEditingTaskDue(task.id); setTaskDueInput(new Date(task.dueDate).toISOString().split('T')[0]) }} className="text-gray-300 hover:text-blue-500 ml-1">
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {!task.dueDate && canEdit && (
                      <>
                        {editingTaskDue === task.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={taskDueInput}
                              onChange={e => setTaskDueInput(e.target.value)}
                              className="h-6 px-1 text-xs border border-gray-300 rounded"
                            />
                            <button onClick={() => updateTaskDueDate(task.id, taskDueInput)} className="text-xs text-blue-600 hover:underline">Save</button>
                            <button onClick={() => setEditingTaskDue(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingTaskDue(task.id); setTaskDueInput('') }} className="text-gray-300 hover:text-blue-500">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          {deal.productionStages.length === 0 ? (
            <div className="text-center py-8">
              <Factory className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Production stages will appear when deal enters production</p>
              {canEdit && <Button className="mt-4" size="sm" onClick={() => changeStage('production')}>Move to Production</Button>}
            </div>
          ) : (
            <div className="space-y-3">{deal.productionStages.map((stage: any) => {
              const meta = PRODUCTION_STAGES.find(p => p.key === stage.stageName)
              return (
                <div key={stage.id} className={`flex items-center gap-4 p-4 rounded-lg border ${stage.status === 'completed' ? 'border-green-200 bg-green-50' : stage.status === 'in_progress' ? 'border-blue-200 bg-blue-50' : stage.status === 'delayed' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${stage.status === 'completed' ? 'bg-green-500' : stage.status === 'in_progress' ? 'bg-blue-500' : stage.status === 'delayed' ? 'bg-red-500' : 'bg-gray-200'}`}>
                    {stage.status === 'completed' ? <Check className="w-4 h-4 text-white" /> : stage.status === 'in_progress' ? <Activity className="w-4 h-4 text-white" /> : stage.status === 'delayed' ? <AlertCircle className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{meta?.label || stage.stageName}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap items-center">
                      {stage.plannedEnd && (
                        <span className="flex items-center gap-1">
                          Planned: {formatDate(stage.plannedEnd)}
                          {canUpdateProduction && (
                            editingProdDue === stage.id ? (
                              <span className="flex items-center gap-1 ml-1">
                                <input
                                  type="date"
                                  value={prodDueInput}
                                  onChange={e => setProdDueInput(e.target.value)}
                                  className="h-5 px-1 text-xs border border-gray-300 rounded"
                                />
                                <button onClick={() => updateProdDeadline(stage.id, prodDueInput)} className="text-blue-600 hover:underline">Save</button>
                                <button onClick={() => setEditingProdDue(null)} className="text-gray-400 hover:underline">×</button>
                              </span>
                            ) : (
                              <button onClick={() => { setEditingProdDue(stage.id); setProdDueInput(new Date(stage.plannedEnd).toISOString().split('T')[0]) }} className="text-gray-300 hover:text-blue-500 ml-1">
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            )
                          )}
                        </span>
                      )}
                      {stage.actualStart && <span>Started: {formatDate(stage.actualStart)}</span>}
                      {stage.actualEnd && <span>Completed: {formatDate(stage.actualEnd)}</span>}
                    </div>
                  </div>
                  {canUpdateProduction && (
                    <div className="flex gap-2">
                      {stage.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateProductionStage(stage.id, 'in_progress')}>Start</Button>}
                      {stage.status === 'in_progress' && <>
                        <Button size="sm" variant="success" onClick={() => updateProductionStage(stage.id, 'completed')}>Complete</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateProductionStage(stage.id, 'delayed')}>Delay</Button>
                      </>}
                      {stage.status === 'delayed' && <Button size="sm" variant="outline" onClick={() => updateProductionStage(stage.id, 'in_progress')}>Resume</Button>}
                    </div>
                  )}
                </div>
              )
            })}</div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Payment Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Quoted</span><span className="font-medium">{deal.quotedAmount ? formatCurrency(deal.quotedAmount) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Received</span><span className="font-medium text-green-700">{formatCurrency(totalPaid)}</span></div>
                {deal.quotedAmount && <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Outstanding</span><span className={`font-medium ${deal.quotedAmount - totalPaid > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.max(0, deal.quotedAmount - totalPaid))}</span></div>}
                {deal.advanceDeadline && !deal.advanceReceived && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-500">Advance Due</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${new Date(deal.advanceDeadline) < new Date() ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{formatDate(deal.advanceDeadline)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {['accounts', 'director'].includes(role) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Record Payment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {paymentSuccess && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Saved successfully</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹) *</label>
                    <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({...f, amount: e.target.value}))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select value={paymentForm.type} onChange={e => setPaymentForm(f => ({...f, type: e.target.value}))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="advance">Advance</option>
                      <option value="balance">Balance</option>
                      <option value="milestone">Milestone</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
                    <select value={paymentForm.paymentMode} onChange={e => setPaymentForm(f => ({...f, paymentMode: e.target.value}))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Select mode</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">UTR / Reference Number</label>
                    <input type="text" value={paymentForm.utrNumber} onChange={e => setPaymentForm(f => ({...f, utrNumber: e.target.value}))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="UTR or cheque number" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bank Account</label>
                    <input type="text" value={paymentForm.bankAccount} onChange={e => setPaymentForm(f => ({...f, bankAccount: e.target.value}))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. HDFC - 1234" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={paymentForm.date} onChange={e => setPaymentForm(f => ({...f, date: e.target.value}))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Optional notes" />
                  </div>
                </div>
                <button onClick={submitPayment} disabled={savingPayment || !paymentForm.amount} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                  {savingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </CardContent>
            </Card>
          )}
          {deal.payments.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No payments recorded</p> : (
            <div className="space-y-2">{deal.payments.map((payment: any) => (
              <div key={payment.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><DollarSign className="w-4 h-4 text-green-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-gray-500">{payment.type} &middot; {formatDate(payment.date)}{payment.paymentMode ? ` · ${payment.paymentMode}` : ''}</p>
                  {payment.utrNumber && <p className="text-xs text-gray-400 mt-0.5">Ref: {payment.utrNumber}</p>}
                  {payment.bankAccount && <p className="text-xs text-gray-400">Bank: {payment.bankAccount}</p>}
                  {payment.notes && <p className="text-xs text-gray-400 mt-0.5">{payment.notes}</p>}
                </div>
              </div>
            ))}</div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card><CardHeader><CardTitle className="text-sm">Document Generation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 bg-white">
                  <FileText className="w-8 h-8 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1"><p className="text-sm font-medium text-gray-900">Quotation</p><p className="text-xs text-gray-500 mt-0.5">Generate a quote PDF in SAM PRODUCTS format.</p></div>
                  <Button size="sm" onClick={() => generateQuote(deal)} className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Generate Quote</Button>
                </div>
                {canEdit && (
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 bg-white">
                    <FileText className="w-8 h-8 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1"><p className="text-sm font-medium text-gray-900">Proforma Invoice (PI)</p><p className="text-xs text-gray-500 mt-0.5">Generate a PI with {deal.customerState === 'Uttar Pradesh' ? 'CGST + SGST (9% + 9%)' : 'IGST (18%)'} — HSN 84145930.</p></div>
                    <Button size="sm" variant="outline" onClick={() => generatePI(deal)} className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Generate PI</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="verification" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Customer Verification</CardTitle>
                {deal.verificationScore !== undefined && deal.verificationScore !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${deal.verificationScore >= 80 ? 'bg-green-100 text-green-700' : deal.verificationScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    Score: {deal.verificationScore}%
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {deal.gstNumber && <div className="flex justify-between"><span className="text-gray-500">GST Number</span><span className="font-mono">{deal.gstNumber}</span></div>}
              {deal.verificationData && (() => {
                try {
                  const vd = JSON.parse(deal.verificationData)
                  return (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      {vd.legalName && <p><span className="text-gray-500">Legal Name: </span>{vd.legalName}</p>}
                      {vd.state && <p><span className="text-gray-500">Registered State: </span>{vd.state}</p>}
                      {vd.status && <p><span className="text-gray-500">Status: </span>{vd.status}</p>}
                      {vd.registrationDate && <p><span className="text-gray-500">Registered: </span>{vd.registrationDate}</p>}
                    </div>
                  )
                } catch { return null }
              })()}
              {!deal.gstNumber && <p className="text-yellow-600 text-sm">No GST number provided for this deal.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer Details Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {deal.customerName && <div className="flex justify-between"><span className="text-gray-500">Contact</span><span>{deal.customerName}</span></div>}
              {deal.customerCompany && <div className="flex justify-between"><span className="text-gray-500">Company</span><span>{deal.customerCompany}</span></div>}
              {deal.customerEmail && <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{deal.customerEmail}</span></div>}
              {deal.customerPhone && <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{deal.customerPhone}</span></div>}
              {deal.source && <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="capitalize">{deal.source.replace('_',' ')}</span></div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {logType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader><CardTitle className="text-base">{logType === 'negotiation' ? 'Log Negotiation / Discussion' : `Log ${logType === 'call' ? 'Call' : 'Email'}`}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {logType === 'negotiation' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select value={logSubType} onChange={e => setLogSubType(e.target.value)} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="meeting">Meeting</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
                    <select value={logOutcome} onChange={e => setLogOutcome(e.target.value)} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                      <option value="deal_at_risk">Deal at Risk</option>
                    </select>
                  </div>
                </>
              )}
              <Textarea placeholder={logType === 'negotiation' ? 'What was discussed / agreed?' : `Describe the ${logType}...`} value={logContent} onChange={e => setLogContent(e.target.value)} rows={4} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setLogType(null); setLogContent(''); setLogOutcome('neutral'); setLogSubType('negotiation') }}>Cancel</Button>
                <Button onClick={logActivity} disabled={loggingActivity || !logContent.trim()}>{loggingActivity ? 'Saving...' : 'Save'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
