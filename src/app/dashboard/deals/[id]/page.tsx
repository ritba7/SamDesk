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
  Shield, Phone, Mail as MailIcon, Pencil, Copy, TrendingUp, Edit, Star, Lock,
  IndianRupee, ShieldCheck, Send, ClipboardList, Package, Truck, X, ChevronDown, ChevronUp, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, getStageColor, getStageLabel, STAGES, PRODUCTION_STAGES } from '@/lib/utils'
import { generateQuote } from '@/lib/generateQuote'
import { generatePI } from '@/lib/generatePI'
import Confetti from '@/components/Confetti'

const STAGE_FLOW = ['inquiry','tds_sent','quote_sent','follow_up','po_received','po_vetted','pi_sent','approval_pending','production','dispatch_ready','dispatched','feedback_pending','closed_won']

function HeatBadge({ score }: { score: string }) {
  if (score === 'hot') return <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><Flame className="w-3 h-3" /> Hot</span>
  if (score === 'warm') return <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Thermometer className="w-3 h-3" /> Warm</span>
  return <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><Snowflake className="w-3 h-3" /> Cold</span>
}

const MR_STATUS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  ordered: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
}

function MaterialRequestsSection({ deal, role }: { deal: any, role: string }) {
  const canRequest = ['manufacturing', 'director', 'vp'].includes(role)
  const [requests, setRequests] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [rows, setRows] = useState<any[]>([
    { item: 'Glass', spec: '', qty: '' },
    { item: 'Wooden Palette', spec: '', qty: '' },
  ])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => fetch(`/api/material-requests?dealId=${deal.id}`).then(r => r.ok ? r.json() : []).then(d => setRequests(Array.isArray(d) ? d : [])).catch(() => {})
  useEffect(() => { load() }, [deal.id])

  const assembly1 = deal.productionStages?.find((s: any) => s.stageName === 'assembly_1')
  const showRequest = canRequest && (!assembly1 || assembly1.status !== 'completed')

  const submit = async () => {
    setSaving(true)
    await fetch('/api/material-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: deal.id, items: rows.filter(r => r.item || r.spec || r.qty), notes }),
    })
    setSaving(false); setModal(false)
    setRows([{ item: 'Glass', spec: '', qty: '' }, { item: 'Wooden Palette', spec: '', qty: '' }])
    setNotes('')
    load()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-indigo-600" /> Material Requests</CardTitle>
          {showRequest && <Button size="sm" variant="outline" onClick={() => setModal(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Request Materials</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-400">No material requests yet.</p>
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{formatDate(r.createdAt)}{r.woNumber ? ` · ${r.woNumber}` : ''}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${MR_STATUS[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {(r.items || []).map((it: any, i: number) => (
                      <tr key={i}><td className="py-0.5 pr-2 font-medium text-gray-800">{it.item}</td><td className="py-0.5 pr-2 text-gray-500">{it.spec}</td><td className="py-0.5 text-gray-500">× {it.qty}</td></tr>
                    ))}
                  </tbody>
                </table>
                {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Request Materials</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-[1fr_1fr_70px_28px] gap-2 text-xs font-medium text-gray-500">
                <span>Item</span><span>Spec / Size</span><span>Qty</span><span></span>
              </div>
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_70px_28px] gap-2 items-center">
                  <input value={row.item} onChange={e => setRows(rs => rs.map((r, j) => j === i ? { ...r, item: e.target.value } : r))} className="h-8 px-2 text-xs border border-gray-300 rounded" placeholder="Item" />
                  <input value={row.spec} onChange={e => setRows(rs => rs.map((r, j) => j === i ? { ...r, spec: e.target.value } : r))} className="h-8 px-2 text-xs border border-gray-300 rounded" placeholder="Size / spec" />
                  <input value={row.qty} onChange={e => setRows(rs => rs.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))} className="h-8 px-2 text-xs border border-gray-300 rounded" placeholder="Qty" />
                  <button onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setRows(rs => [...rs, { item: '', spec: '', qty: '' }])} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add item</button>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
            </div>
            <div className="flex gap-2 justify-end p-4 border-t">
              <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

const INSP_TEXT_FIELDS: { key: string, label: string }[] = [
  { key: 'glassSize1', label: 'Glass Size 1' }, { key: 'glassSize2', label: 'Glass Size 2' },
  { key: 'glassSize3', label: 'Glass Size 3' }, { key: 'glassSize4', label: 'Glass Size 4' },
  { key: 'motorSerialNo', label: 'Motor Serial No' }, { key: 'motorMake', label: 'Motor Make' },
  { key: 'electricalPanelSerialNo', label: 'Electrical Panel Serial No' }, { key: 'hepaSize', label: 'HEPA Size' },
  { key: 'preFilterSize', label: 'Pre-Filter Size' }, { key: 'doorSize', label: 'Door Size' },
  { key: 'ledWattage', label: 'LED Wattage' }, { key: 'ledQty', label: 'LED Qty' },
  { key: 'inputPower', label: 'Input Power' },
]
const INSP_ENTRY_CONTROL = ['NTS', 'Motion Sensor', 'Nothing', 'Biometric', 'Numeric Lock', 'Beam Sensor']
const INSP_EXTRAS = ['Air Curtain', 'Strip Curtain']
const INSP_QUALITY = ['Air flow OK', 'Door interlock OK', 'Emergency switch OK', 'Nozzles aligned', 'LED working', 'Panel labelled', 'No sharp edges / finish OK', 'Filters seated properly']

function InspectionSection({ deal, role }: { deal: any, role: string }) {
  const canEdit = ['manufacturing', 'vp', 'director'].includes(role)
  const [open, setOpen] = useState(false)
  const [checklist, setChecklist] = useState<any>(null)
  const [data, setData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)

  const load = () => fetch(`/api/inspection?dealId=${deal.id}`).then(r => r.ok ? r.json() : null).then(d => {
    setChecklist(d)
    setData(d?.data || {})
  }).catch(() => {})
  useEffect(() => { if (open && checklist === null) load() }, [open])

  if (!canEdit) return null

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }))

  const save = async () => {
    setSaving(true)
    await fetch('/api/inspection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: deal.id, data }) })
    setSaving(false); load()
  }
  const approve = async (action: string) => {
    setActing(true)
    await fetch('/api/inspection', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: deal.id, action }) })
    setActing(false); load()
  }

  const extras: string[] = Array.isArray(data.extras) ? data.extras : []

  return (
    <Card>
      <CardHeader className="pb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full">
          <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-teal-600" /> Internal Inspection Checklist
            {checklist?.mfgApproved && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">MFG ✓</span>}
            {checklist?.vpApproved && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">VP ✓</span>}
          </CardTitle>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INSP_TEXT_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input value={data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} className="w-full h-8 px-2 text-xs border border-gray-300 rounded" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">EM Lock (lb)</label>
              <div className="flex gap-1.5">
                {['300', '600'].map(o => (
                  <button key={o} type="button" onClick={() => set('emLockLb', data.emLockLb === o ? '' : o)} className={`px-2.5 py-1 rounded-full text-xs border ${data.emLockLb === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>{o}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entry Door Control</label>
              <div className="flex flex-wrap gap-1.5">
                {INSP_ENTRY_CONTROL.map(o => (
                  <button key={o} type="button" onClick={() => set('entryDoorControl', data.entryDoorControl === o ? '' : o)} className={`px-2.5 py-1 rounded-full text-xs border ${data.entryDoorControl === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>{o}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Extras</label>
              <div className="flex flex-wrap gap-1.5">
                {INSP_EXTRAS.map(o => {
                  const active = extras.includes(o)
                  return <button key={o} type="button" onClick={() => set('extras', active ? extras.filter(x => x !== o) : [...extras, o])} className={`px-2.5 py-1 rounded-full text-xs border ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'}`}>{active ? '✓ ' : ''}{o}</button>
                })}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Quality Checks</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {INSP_QUALITY.map(q => (
                <label key={q} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!data[q]} onChange={e => set(q, e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                  <span className={data[q] ? 'text-gray-700' : 'text-gray-500'}>{q}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center border-t pt-3">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Checklist'}</Button>
            {['manufacturing', 'director'].includes(role) && (
              <Button size="sm" variant="outline" onClick={() => approve('approve_mfg')} disabled={acting || checklist?.mfgApproved}>
                {checklist?.mfgApproved ? 'MFG Approved ✓' : 'Approve as MFG'}
              </Button>
            )}
            {['vp', 'director'].includes(role) && (
              <Button size="sm" variant="outline" onClick={() => approve('approve_vp')} disabled={acting || checklist?.vpApproved}>
                {checklist?.vpApproved ? 'VP Approved ✓' : 'Approve as VP'}
              </Button>
            )}
            {checklist?.mfgApprovedAt && <span className="text-xs text-gray-400">MFG: {formatDate(checklist.mfgApprovedAt)}</span>}
            {checklist?.vpApprovedAt && <span className="text-xs text-gray-400">VP: {formatDate(checklist.vpApprovedAt)}</span>}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

const DISPATCH_STEPS: { status: string, label: string, roles: string[] }[] = [
  { status: 'payment_received', label: 'Payment Received', roles: ['accounts', 'director'] },
  { status: 'truck_arranged', label: 'Truck Arranged', roles: ['accounts', 'director'] },
  { status: 'forklift_called', label: 'Forklift Called', roles: ['accounts', 'director'] },
  { status: 'loaded', label: 'Loaded (packing list)', roles: ['manufacturing', 'director'] },
  { status: 'tarp_verified', label: 'Tarpaulin Verified', roles: ['accounts', 'director'] },
  { status: 'dispatched', label: 'Dispatched', roles: ['accounts', 'director'] },
  { status: 'unloaded', label: 'Unloaded at Customer', roles: ['sales', 'sales_director', 'director'] },
  { status: 'assembly_planned', label: 'Assembly Planned', roles: ['accounts', 'director'] },
  { status: 'closed', label: 'Closed', roles: ['accounts', 'director'] },
]

function DispatchSection({ deal, role, onChanged }: { deal: any, role: string, onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [dispatchDate, setDispatchDate] = useState('')
  const [packingNote, setPackingNote] = useState(deal.packingListNote || '')

  const currentIdx = deal.dispatchStatus ? DISPATCH_STEPS.findIndex(s => s.status === deal.dispatchStatus) : -1

  const act = async (status: string, extra: any = {}) => {
    setBusy(true)
    const res = await fetch('/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: deal.id, nextStatus: status, ...extra }),
    })
    setBusy(false)
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Failed') }
    onChanged()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-blue-600" /> Dispatch
          {deal.dispatchDate && <span className="text-xs text-gray-500 font-normal">· Dispatch date: {formatDate(deal.dispatchDate)}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {DISPATCH_STEPS.map((step, idx) => {
            const done = idx <= currentIdx
            const isNext = idx === currentIdx + 1
            const roleAllowed = step.roles.includes(role)
            return (
              <div key={step.status} className={`flex items-start gap-3 p-2.5 rounded-lg border ${done ? 'border-green-200 bg-green-50' : isNext ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-green-500' : isNext ? 'bg-blue-500' : 'bg-gray-200'}`}>
                  {done ? <Check className="w-3 h-3 text-white" /> : <span className="text-[10px] text-white font-bold">{idx + 1}</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${done ? 'text-green-700 font-medium' : isNext ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>{step.label}</p>
                  {isNext && roleAllowed && (
                    <div className="mt-2 space-y-2">
                      {step.status === 'loaded' && (
                        <textarea value={packingNote} onChange={e => setPackingNote(e.target.value)} rows={2} placeholder="Packing list note" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded" />
                      )}
                      {step.status === 'payment_received' && (
                        <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="h-8 px-2 text-xs border border-gray-300 rounded" />
                      )}
                      <Button size="sm" disabled={busy} onClick={() => act(step.status,
                        step.status === 'loaded' ? { packingListNote: packingNote } :
                        step.status === 'payment_received' && dispatchDate ? { dispatchDate } : {}
                      )}>
                        {busy ? 'Working…' : `Mark ${step.label}`}
                      </Button>
                    </div>
                  )}
                  {isNext && !roleAllowed && <p className="text-xs text-gray-400 mt-1">Awaiting {step.roles.join(' / ')}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DealDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [stageLoading, setStageLoading] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
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

  // Finalize deal
  const [finalizing, setFinalizing] = useState(false)

  // Transfer / reassign (leadership only)
  const [transferTo, setTransferTo] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Vetting + PI
  const [submittingVetting, setSubmittingVetting] = useState(false)
  const [requestingQuoteVet, setRequestingQuoteVet] = useState(false)
  const [piForm, setPiForm] = useState({ amount: '', poReference: '', notes: '' })
  const [piSaving, setPiSaving] = useState(false)
  const [piError, setPiError] = useState('')

  // Change history (director / sales_director only)
  const [changeLogs, setChangeLogs] = useState<any[]>([])
  // Original lead data (pre-PO) snapshot collapse
  const [showSnapshot, setShowSnapshot] = useState(false)
  // Manual WO generation
  const [generatingWo, setGeneratingWo] = useState(false)

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

  // Change history is visible ONLY to director & sales_director — gate the fetch too
  useEffect(() => {
    if (role === 'director' || role === 'sales_director') {
      fetch(`/api/changelog?dealId=${id}`).then(r => r.ok ? r.json() : []).then(d => setChangeLogs(Array.isArray(d) ? d : [])).catch(() => {})
    }
  }, [id, role])

  const generateWorkOrder = async () => {
    setGeneratingWo(true)
    const res = await fetch('/api/workorders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id }) })
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Failed to generate work order') }
    await fetchDeal()
    setGeneratingWo(false)
  }

  const changeStage = async (newStage: string) => {
    if (!deal) return; setStageLoading(true)
    const prevStage = deal.stage
    const res = await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: newStage }) })
    if (res.ok) {
      if (newStage === 'po_received' && prevStage !== 'po_received') {
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 3200)
      }
      await fetchDeal()
    }
    setStageLoading(false)
  }

  const deleteDeal = async () => {
    if (!confirm('Delete this lead permanently? This removes all its activities, tasks, payments and documents and cannot be undone.')) return
    const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/deals')
    else alert('Failed to delete: ' + ((await res.json()).error || 'unknown error'))
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
    // Sales always self-assign (to the deal's own salesman); others pick an assignee
    const assignee = role === 'sales' ? (deal?.assignedToId || user?.id) : fuAssignee
    if (!assignee || fuDays < 1) return
    setFuSaving(true)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + fuDays)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: id, title: fuNote || `Follow-up — ${deal?.customerName}`, assignedToId: assignee, dueDate: dueDate.toISOString(), type: 'follow_up', status: 'pending' })
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
    // Auto-create reminder task for the deal's own salesman (never the whole sales team)
    const gstAssignee = deal?.assignedToId || users.find((u: any) => u.role === 'sales')?.id
    if (gstAssignee) {
      const due = new Date(); due.setDate(due.getDate() + 1)
      await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id, title: `Confirm GST number with customer — ${deal?.customerName}`, assignedToId: gstAssignee, dueDate: due.toISOString(), type: 'follow_up' }) })
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

  const finalizeDeal = async () => {
    if (!window.confirm('Finalize & freeze this deal? Specs and commercials will be locked and the deal becomes visible to Accounts.')) return
    setFinalizing(true)
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealFinalized: true }) })
    await fetchDeal()
    setFinalizing(false)
  }

  const transferDeal = async () => {
    if (!transferTo) return
    setTransferring(true)
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedToId: transferTo }) })
    setTransferTo('')
    await fetchDeal()
    setTransferring(false)
  }

  const submitForVetting = async () => {
    if (!window.confirm('Submit this deal to Accounts for vetting? Ensure all technicals and commercials are confirmed against the customer PO.')) return
    setSubmittingVetting(true)
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vettingStatus: 'pending' }) })
    await fetchDeal()
    setSubmittingVetting(false)
  }

  const requestQuoteVetting = async () => {
    setRequestingQuoteVet(true)
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteVetStatus: 'requested' }) })
    await fetchDeal()
    setRequestingQuoteVet(false)
  }

  const vetAction = async (action: 'approve' | 'reject') => {
    let note: string | undefined
    if (action === 'reject') { note = window.prompt('Reason for rejection (optional):') || undefined }
    else if (!window.confirm('Approve this deal? This assigns a work code and advances it past vetting.')) return
    await fetch('/api/vetting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: id, action, note }) })
    await fetchDeal()
  }

  const createPI = async () => {
    if (!piForm.amount) return
    setPiSaving(true)
    setPiError('')
    const res = await fetch('/api/pi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: id, amount: parseFloat(piForm.amount), poReference: piForm.poReference || undefined, notes: piForm.notes || undefined }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setPiError(err.error || 'Failed to create PI')
    } else {
      setPiForm({ amount: '', poReference: '', notes: '' })
    }
    await fetchDeal()
    setPiSaving(false)
  }

  const toggleHighlight = async (activityId: string, highlighted: boolean) => {
    await fetch('/api/activities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activityId, highlighted: !highlighted }) })
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
  const canEdit = ['director', 'vp', 'accounts', 'sales', 'sales_director'].includes(role)
  const canUpdateProduction = ['director', 'manufacturing'].includes(role)
  // Once finalized, sales can no longer open the edit form (API enforces too)
  const canOpenEditForm = canEdit && !(deal.dealFinalized && role === 'sales')
  const canFinalize = ['sales', 'sales_director', 'director'].includes(role)
    && STAGE_FLOW.indexOf(deal.stage) >= STAGE_FLOW.indexOf('po_received')
    && !deal.dealFinalized
  const totalPaid = deal.payments.reduce((sum: number, p: any) => sum + p.amount, 0)
  const pendingTasks = deal.tasks.filter((t: any) => t.status === 'pending')

  const hasSpecs = deal.material || deal.motorType || deal.outerWidth || deal.innerWidth || deal.freightPaidBy || deal.installationType || deal.paymentTerms || deal.freightTerms || deal.inspectionTerms

  const canCommercials = ['sales', 'sales_director', 'director'].includes(role)
  const canSubmitVetting = canCommercials && deal.commercialsDone && hasSpecs
    && ['not_submitted', 'rejected'].includes(deal.vettingStatus)
  const isAccountsOrDirector = ['accounts', 'director'].includes(role)
  const isDealSalesman = deal.assignedToId === user?.id || deal.createdById === user?.id
  // Who may see/enter the final PO data: the deal's salesman, sales_director, director
  const canSeePoAudit = role === 'director' || role === 'sales_director' || (role === 'sales' && isDealSalesman)
  const showFinalEntry = deal.stage === 'po_received' && !deal.finalDataEntered && canSeePoAudit
  const canGenerateWo = isAccountsOrDirector && deal.vettingStatus === 'approved' && (!deal.workOrders || deal.workOrders.length === 0)
  const canSeeChangeHistory = role === 'director' || role === 'sales_director'
  const woNumber = deal.workOrders?.[0]?.woNumber
  const pageTitle = role === 'manufacturing' ? (woNumber || deal.customerCompany) : deal.customerCompany

  // ===== Restricted ACCOUNTS view: only technicals, commercials, delivery deadlines & vetting =====
  if (role === 'accounts') {
    const disc = deal.discountType === 'percent'
      ? (deal.basicPrice && deal.discountValue ? deal.basicPrice * deal.discountValue / 100 : 0)
      : (deal.discountValue || 0)
    const finalP = deal.finalPrice ?? (deal.basicPrice ? deal.basicPrice - disc : deal.quotedAmount)
    const gst = finalP ? finalP * 0.18 : 0
    const Row = ({ l, v }: { l: string, v: any }) => (v || v === 0) ? (
      <div className="flex justify-between text-sm py-1 border-b border-gray-50"><span className="text-gray-500">{l}</span><span className="text-gray-900 text-right font-medium">{v}</span></div>
    ) : null
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/deals"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-mono">{deal.workCode || deal.serialNumber || deal.dealNumber}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
                {deal.vettingStatus === 'approved' && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Vetted ✓ {deal.workCode}</span>}
                {deal.vettingStatus === 'pending' && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Vetting Pending</span>}
                {deal.vettingStatus === 'rejected' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Rejected</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Vetting options */}
        {(deal.vettingStatus === 'pending' || deal.vettingStatus === 'approved' || deal.vettingStatus === 'rejected') && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Vetting</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {deal.vettingNote && <p className="text-sm text-gray-600">Note: {deal.vettingNote}</p>}
              <div className="flex gap-2">
                {deal.vettingStatus !== 'approved' && <Button size="sm" onClick={() => vetAction('approve')} className="bg-green-600 hover:bg-green-700"><Check className="w-3 h-3 mr-1" />Approve & Assign Work Code</Button>}
                {deal.vettingStatus !== 'rejected' && <Button size="sm" variant="destructive" onClick={() => vetAction('reject')}>Reject</Button>}
                {canGenerateWo && <Button size="sm" variant="outline" onClick={generateWorkOrder}><ClipboardList className="w-3 h-3 mr-1" />Generate WO</Button>}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Technicals */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Technical Specifications</CardTitle></CardHeader>
            <CardContent className="space-y-0.5">
              <Row l="Model" v={deal.modelNumber} />
              <Row l="Configuration" v={deal.airShowerConfig} />
              <Row l="Material" v={deal.material?.toUpperCase?.()} />
              <Row l="Application" v={deal.application} />
              <Row l="Users / Cycle" v={deal.numberOfUsers} />
              <Row l="Motor" v={deal.motorType ? `${deal.motorType.toUpperCase()}${deal.motorBrand ? ' — ' + deal.motorBrand : ''}` : null} />
              <Row l="Door" v={deal.doorType} />
              <Row l="Flooring" v={deal.flooringType} />
              <Row l="Outer (W×D×H)" v={deal.outerWidth ? `${deal.outerWidth}×${deal.outerDepth}×${deal.outerHeight} mm` : null} />
              <Row l="Inner (W×D×H)" v={deal.innerWidth ? `${deal.innerWidth}×${deal.innerDepth}×${deal.innerHeight} mm` : null} />
              <Row l="Spec Notes" v={deal.specNotes} />
            </CardContent>
          </Card>

          {/* Commercials */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Commercials</CardTitle></CardHeader>
            <CardContent className="space-y-0.5">
              <Row l="Basic Price" v={deal.basicPrice ? formatCurrency(deal.basicPrice) : null} />
              <Row l="Discount" v={disc ? `${deal.discountType === 'percent' ? deal.discountValue + '%' : ''} (${formatCurrency(disc)})` : null} />
              <Row l="Final Price" v={finalP ? formatCurrency(finalP) : null} />
              <Row l="GST (18%)" v={finalP ? formatCurrency(gst) : null} />
              <Row l="Grand Total" v={finalP ? formatCurrency(finalP + gst) : null} />
              <Row l="Payment Terms" v={deal.paymentTerms} />
              <Row l="Freight" v={deal.freightBearer?.replace(/_/g, ' ')} />
              <Row l="Assembly" v={deal.assemblyAtSite?.replace(/_/g, ' ')} />
              <Row l="Warranty" v={deal.warrantyTerms} />
            </CardContent>
          </Card>
        </div>

        {/* Delivery deadlines */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Delivery Deadlines</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-gray-500">TDS Deadline</p><p className="font-medium">{deal.tdsDeadline ? formatDate(deal.tdsDeadline) : '—'}</p></div>
            <div><p className="text-xs text-gray-500">Expected Dispatch</p><p className="font-medium">{deal.expectedDispatch ? formatDate(deal.expectedDispatch) : '—'}</p></div>
            <div><p className="text-xs text-gray-500">Advance Due</p><p className="font-medium">{deal.advanceDeadline ? formatDate(deal.advanceDeadline) : '—'}</p></div>
            <div><p className="text-xs text-gray-500">Balance Due</p><p className="font-medium">{deal.balanceDeadline ? formatDate(deal.balanceDeadline) : '—'}</p></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {celebrate && (
        <>
          <Confetti />
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[101] bg-white border border-green-200 shadow-lg rounded-full px-5 py-2.5 text-sm font-semibold text-green-700">
            🎉 PO Received!
          </div>
        </>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/deals"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
              <HeatBadge score={deal.heatScore} />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
              {deal.dealFinalized && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                  <Lock className="w-3 h-3" /> FINALIZED
                </span>
              )}
              {deal.vettingStatus === 'pending' && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                  <Clock className="w-3 h-3" /> Vetting Pending
                </span>
              )}
              {deal.vettingStatus === 'approved' && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                  <ShieldCheck className="w-3 h-3" /> Vetted ✓ {deal.workCode}
                </span>
              )}
              {deal.vettingStatus === 'rejected' && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700" title={deal.vettingNote || ''}>
                  <AlertCircle className="w-3 h-3" /> Vetting Rejected{deal.vettingNote ? ` — ${deal.vettingNote}` : ''}
                </span>
              )}
              {woNumber && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 font-mono">
                  <ClipboardList className="w-3 h-3" /> {woNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="font-mono">{deal.serialNumber || deal.dealNumber}{deal.workCode ? ` · ${deal.workCode}` : ''}</span>
              <span>&middot;</span><span>POC: {deal.customerName}</span>
              {deal.customerState && <><span>&middot;</span><span>{deal.customerState}</span></>}
            </div>
          </div>
        </div>
        {canEdit && !isLost && !isWon && (
          <div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {nextStage && !(role === 'sales' && deal.stage === 'po_received' && nextStage === 'po_vetted') && (
                <Button onClick={() => changeStage(nextStage)} disabled={stageLoading} size="sm">Move to {getStageLabel(nextStage)} <ChevronRight className="w-3 h-3" /></Button>
              )}
              {role === 'sales' && deal.stage === 'po_received' && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">Awaiting Accounts vetting</span>
              )}
              {canOpenEditForm && (
                <Link href={`/dashboard/deals/${id}/edit`}>
                  <Button size="sm"><Pencil className="w-3 h-3 mr-1" />Edit Deal</Button>
                </Link>
              )}
              {canCommercials && (
                <Link href={`/dashboard/deals/${id}/commercials`}>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"><IndianRupee className="w-3 h-3 mr-1" />Commercials</Button>
                </Link>
              )}
              <Button variant="destructive" size="sm" onClick={() => changeStage('closed_lost')}>Mark Lost</Button>
              {['director', 'sales_director'].includes(role) && (
                <Button variant="destructive" size="sm" onClick={deleteDeal} className="bg-red-700 hover:bg-red-800"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-end">
              <Button variant="outline" size="sm" onClick={() => setLogType('call')}><Phone className="w-3 h-3 mr-1" />Log Call</Button>
              <Button variant="outline" size="sm" onClick={() => setLogType('email')}><MailIcon className="w-3 h-3 mr-1" />Log Email</Button>
              <Button variant="outline" size="sm" onClick={() => setLogType('negotiation')}><TrendingUp className="w-3 h-3 mr-1" />Log Negotiation</Button>
              {['director', 'sales_director'].includes(role) && (
                <div className="flex items-center gap-1">
                  <select
                    value={transferTo}
                    onChange={e => setTransferTo(e.target.value)}
                    className="h-8 px-2 text-xs border border-gray-300 rounded-md bg-white max-w-[160px]"
                  >
                    <option value="">Transfer / Reassign…</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                  <Button variant="outline" size="sm" onClick={transferDeal} disabled={!transferTo || transferring}>
                    {transferring ? 'Assigning…' : 'Assign'}
                  </Button>
                </div>
              )}
              {canFinalize && (
                <Button variant="outline" size="sm" onClick={finalizeDeal} disabled={finalizing} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <Lock className="w-3 h-3 mr-1" />{finalizing ? 'Finalizing…' : 'Finalize & Freeze Deal'}
                </Button>
              )}
              {canSubmitVetting && (
                <Button variant="outline" size="sm" onClick={submitForVetting} disabled={submittingVetting} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Send className="w-3 h-3 mr-1" />{submittingVetting ? 'Submitting…' : deal.vettingStatus === 'rejected' ? 'Resubmit for Vetting' : 'Submit for Vetting'}
                </Button>
              )}
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

      {showFinalEntry && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-amber-800 font-semibold text-sm">PO received — enter the confirmed final details</p>
            <p className="text-amber-700 text-xs mt-0.5">Re-enter the deal with the exact confirmed PO data. This overwrites the earlier lead data (a pre-PO snapshot is kept for audit).</p>
          </div>
          <Link href={`/dashboard/deals/${id}/edit?final=1`}>
            <Button className="bg-amber-600 hover:bg-amber-700"><Pencil className="w-3.5 h-3.5 mr-1" />Enter Final PO Details</Button>
          </Link>
        </div>
      )}

      {canGenerateWo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-blue-800 font-semibold text-sm">Generate Work Order</p>
            <p className="text-blue-700 text-xs mt-0.5">Deal is vetted &amp; approved. A WO is normally auto-generated on PI release — you can also generate one manually now.</p>
          </div>
          <Button onClick={generateWorkOrder} disabled={generatingWo} className="bg-blue-600 hover:bg-blue-700">
            <ClipboardList className="w-3.5 h-3.5 mr-1" />{generatingWo ? 'Generating…' : 'Generate WO'}
          </Button>
        </div>
      )}

      {deal.poSnapshot && canSeePoAudit && (
        <Card>
          <CardHeader className="pb-3">
            <button onClick={() => setShowSnapshot(s => !s)} className="flex items-center justify-between w-full">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> Original Lead Data (pre-PO)</CardTitle>
              {showSnapshot ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
          </CardHeader>
          {showSnapshot && (
            <CardContent>
              {(() => {
                let snap: any = {}
                try { snap = JSON.parse(deal.poSnapshot) } catch { return <p className="text-sm text-gray-400">Snapshot unavailable.</p> }
                const rows: [string, any][] = [
                  ['Customer', snap.customerName], ['Company', snap.customerCompany],
                  ['Email', snap.customerEmail], ['Phone', snap.customerPhone], ['State', snap.customerState],
                  ['GST', snap.gstNumber], ['Model', snap.modelNumber], ['Application', snap.application],
                  ['Material', snap.material], ['Motor', snap.motorType],
                  ['Outer (W×H×D)', snap.outerWidth ? `${snap.outerWidth}×${snap.outerHeight}×${snap.outerDepth}` : null],
                  ['Inner (W×H×D)', snap.innerWidth ? `${snap.innerWidth}×${snap.innerHeight}×${snap.innerDepth}` : null],
                  ['Basic Price', snap.basicPrice], ['Final Price', snap.finalPrice], ['Quoted', snap.quotedAmount],
                  ['Payment Terms', snap.paymentTerms], ['Freight Terms', snap.freightTerms], ['Inspection', snap.inspectionTerms],
                ]
                const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '')
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {shown.map(([label, v]) => (
                      <div key={label} className="flex justify-between border-b border-gray-100 py-1"><span className="text-gray-500">{label}</span><span className="text-right">{String(v)}</span></div>
                    ))}
                    {snap.snapshotAt && <p className="text-xs text-gray-400 mt-2 md:col-span-2">Snapshotted {formatDate(snap.snapshotAt)}</p>}
                  </div>
                )
              })()}
            </CardContent>
          )}
        </Card>
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
                <div className={`grid grid-cols-1 ${role === 'sales' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-3`}>
                  {role !== 'sales' && (
                    <select value={fuAssignee} onChange={e => setFuAssignee(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">Select assignee…</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  )}
                  <input type="number" min={1} max={90} value={fuDays} onChange={e => setFuDays(Number(e.target.value))}
                    placeholder="Days until due"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input type="text" value={fuNote} onChange={e => setFuNote(e.target.value)}
                    placeholder="Task note / title (optional)"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                {role === 'sales' && <p className="text-xs text-gray-400">This follow-up will be assigned to you.</p>}
                <Button size="sm" onClick={submitFollowUp} disabled={fuSaving || (role !== 'sales' && !fuAssignee) || fuDays < 1}>
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
              [...deal.activities].sort((a: any, b: any) => (b.highlighted ? 1 : 0) - (a.highlighted ? 1 : 0)).map((act: any) => (
                <div key={act.id} className={`flex gap-3 ${act.highlighted ? 'bg-amber-50 border border-amber-200 rounded-lg p-3' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${act.type === 'stage_change' ? 'bg-blue-100' : act.type === 'note' ? 'bg-gray-100' : act.type === 'payment' ? 'bg-green-100' : act.type === 'negotiation' ? 'bg-orange-100' : 'bg-purple-100'}`}>
                      {act.type === 'stage_change' ? <ChevronRight className="w-4 h-4 text-blue-600" /> : act.type === 'note' ? <MessageSquare className="w-4 h-4 text-gray-600" /> : act.type === 'payment' ? <DollarSign className="w-4 h-4 text-green-600" /> : act.type === 'negotiation' ? <TrendingUp className="w-4 h-4 text-orange-600" /> : <Activity className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{act.user?.name}</span>
                      <span className="text-xs text-gray-400">{formatDate(act.createdAt)}</span>
                      <button
                        onClick={() => toggleHighlight(act.id, !!act.highlighted)}
                        title={act.highlighted ? 'Remove highlight' : 'Highlight this activity'}
                        className={`ml-auto ${act.highlighted ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
                      >
                        <Star className="w-4 h-4" fill={act.highlighted ? 'currentColor' : 'none'} />
                      </button>
                    </div>
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

          {deal.productionStages.length > 0 && (
            <div className="mt-6 space-y-4">
              <MaterialRequestsSection deal={deal} role={role} />
              <InspectionSection deal={deal} role={role} />
              {deal.vettingStatus === 'approved' && ['accounts', 'director', 'vp', 'manufacturing', 'sales', 'sales_director'].includes(role) && (
                <DispatchSection deal={deal} role={role} onChanged={fetchDeal} />
              )}
            </div>
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">Quotation</p>
                      {deal.quoteVetStatus === 'vetted' && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                          <ShieldCheck className="w-3 h-3" /> Quote Vetted by Accounts ✓
                        </span>
                      )}
                      {deal.quoteVetStatus === 'requested' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Quote vetting requested</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Generate a quote PDF in SAM PRODUCTS format.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" onClick={() => generateQuote(deal)} className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Generate Quote</Button>
                    {role === 'sales' && deal.quoteVetStatus === 'none' && (
                      <Button size="sm" variant="outline" onClick={requestQuoteVetting} disabled={requestingQuoteVet}>
                        <Send className="w-3 h-3 mr-1" />{requestingQuoteVet ? 'Requesting…' : 'Request Quote Vetting'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proforma Invoices */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-green-600" /> Proforma Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!deal.proformaInvoices || deal.proformaInvoices.length === 0) ? (
                <p className="text-sm text-gray-400">No PIs released yet.{deal.vettingStatus !== 'approved' ? ' Deal must be vetted & approved by accounts first.' : ''}</p>
              ) : (
                <div className="space-y-2">
                  {deal.proformaInvoices.map((pi: any) => (
                    <div key={pi.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                      <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 font-mono">{pi.piNumber}</p>
                        <p className="text-xs text-gray-500">
                          {pi.poReference ? `PO: ${pi.poReference} · ` : ''}{formatCurrency(pi.amount)} · {formatDate(pi.createdAt)}
                          {pi.workOrder ? ` · WO: ${pi.workOrder.woNumber}` : ''}
                        </p>
                        {pi.notes && <p className="text-xs text-gray-400 mt-0.5">{pi.notes}</p>}
                      </div>
                      {isAccountsOrDirector && (
                        <Button size="sm" variant="outline" onClick={() => generatePI(deal, pi.piNumber)} className="flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5" />PDF
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isAccountsOrDirector && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New PI (auto-generates Work Order)</p>
                  {piError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{piError}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹) *</label>
                      <input type="number" value={piForm.amount} onChange={e => setPiForm(f => ({ ...f, amount: e.target.value }))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">PO Reference</label>
                      <input type="text" value={piForm.poReference} onChange={e => setPiForm(f => ({ ...f, poReference: e.target.value }))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Customer PO number" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                      <input type="text" value={piForm.notes} onChange={e => setPiForm(f => ({ ...f, notes: e.target.value }))} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                    </div>
                  </div>
                  <Button size="sm" onClick={createPI} disabled={piSaving || !piForm.amount || deal.vettingStatus !== 'approved'}>
                    {piSaving ? 'Releasing…' : 'Release PI + Auto Work Order'}
                  </Button>
                  {deal.vettingStatus !== 'approved' && <p className="text-xs text-amber-600">PI can only be released after the deal is vetted &amp; approved by accounts.</p>}
                </div>
              )}
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

      {canSeeChangeHistory && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-gray-500" /> Change History</CardTitle></CardHeader>
          <CardContent>
            {changeLogs.length === 0 ? (
              <p className="text-sm text-gray-400">No changes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {changeLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm border-b border-gray-100 pb-2">
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{log.field}</span>
                      <span className="text-gray-500">: </span>
                      <span className="text-red-600 line-through">{log.oldValue || '—'}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="text-green-700">{log.newValue || '—'}</span>
                    </div>
                    <div className="text-xs text-gray-400 text-right whitespace-nowrap">
                      <div>{log.userName || 'Unknown'}</div>
                      <div>{formatDate(log.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
