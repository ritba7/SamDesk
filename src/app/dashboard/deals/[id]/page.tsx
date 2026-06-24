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
  Shield, Phone, Mail as MailIcon
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
  const [logType, setLogType] = useState<'call'|'email'|null>(null)
  const [logContent, setLogContent] = useState('')
  const [loggingActivity, setLoggingActivity] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [fuAssignee, setFuAssignee] = useState('')
  const [fuDays, setFuDays] = useState(3)
  const [fuNote, setFuNote] = useState('')
  const [fuSaving, setFuSaving] = useState(false)

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

  const logActivity = async () => {
    if (!logContent.trim() || !logType) return
    setLoggingActivity(true)
    await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id, type: logType, content: logContent }) })
    setLogContent(''); setLogType(null); await fetchDeal(); setLoggingActivity(false)
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/deals"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{deal.customerName}</h1>
              <HeatBadge score={deal.heatScore} />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="font-mono">{deal.dealNumber}</span>
              <span>&middot;</span><span>{deal.customerCompany}</span>
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
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Quoted Amount</p><p className="text-lg font-bold text-gray-900">{deal.quotedAmount ? formatCurrency(deal.quotedAmount) : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Total Received</p><p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Pending Tasks</p><p className="text-lg font-bold text-amber-600">{pendingTasks.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Expected Dispatch</p><p className="text-lg font-bold text-gray-900">{deal.expectedDispatch ? formatDate(deal.expectedDispatch) : '—'}</p></CardContent></Card>
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
                {deal.material && <div className="flex justify-between"><span className="text-gray-500">Material</span><span className="uppercase">{deal.material}</span></div>}
                {deal.motorType && <div className="flex justify-between"><span className="text-gray-500">Motor</span><span className="uppercase">{deal.motorType} - {deal.motorBrand === 'other' ? deal.motorBrandOther : deal.motorBrand}</span></div>}
                {deal.outerWidth && <div className="flex justify-between"><span className="text-gray-500">Outer (W×H×D)</span><span>{deal.outerWidth}×{deal.outerHeight}×{deal.outerDepth} mm</span></div>}
                {deal.innerWidth && <div className="flex justify-between"><span className="text-gray-500">Inner (W×H×D)</span><span>{deal.innerWidth}×{deal.innerHeight}×{deal.innerDepth} mm</span></div>}
                {deal.freightPaidBy && <div className="flex justify-between"><span className="text-gray-500">Freight</span><span className="capitalize">{deal.freightPaidBy}</span></div>}
              </CardContent>
            </Card>
          </div>
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${act.type === 'stage_change' ? 'bg-blue-100' : act.type === 'note' ? 'bg-gray-100' : act.type === 'payment' ? 'bg-green-100' : 'bg-purple-100'}`}>
                      {act.type === 'stage_change' ? <ChevronRight className="w-4 h-4 text-blue-600" /> : act.type === 'note' ? <MessageSquare className="w-4 h-4 text-gray-600" /> : act.type === 'payment' ? <DollarSign className="w-4 h-4 text-green-600" /> : <Activity className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1"><span className="text-sm font-medium text-gray-900">{act.user?.name}</span><span className="text-xs text-gray-400">{formatDate(act.createdAt)}</span></div>
                    <p className="text-sm text-gray-700">{act.content}</p>
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
                  {task.dueDate && <span className={new Date(task.dueDate) < new Date() ? 'text-red-500 font-medium' : ''}>Due {formatDate(task.dueDate)}</span>}
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
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      {stage.plannedEnd && <span>Planned: {formatDate(stage.plannedEnd)}</span>}
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
              </div>
            </CardContent>
          </Card>
          {deal.payments.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No payments recorded</p> : (
            <div className="space-y-2">{deal.payments.map((payment: any) => (
              <div key={payment.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><DollarSign className="w-4 h-4 text-green-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-gray-500">{payment.type} &middot; {formatDate(payment.date)}</p>
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
                {STAGE_FLOW.indexOf(deal.stage) >= STAGE_FLOW.indexOf('pi_sent') && (
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
            <CardHeader><CardTitle className="text-base">Log {logType === 'call' ? 'Call' : 'Email'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder={`Describe the ${logType}...`} value={logContent} onChange={e => setLogContent(e.target.value)} rows={4} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setLogType(null); setLogContent('') }}>Cancel</Button>
                <Button onClick={logActivity} disabled={loggingActivity || !logContent.trim()}>{loggingActivity ? 'Saving...' : 'Save'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
