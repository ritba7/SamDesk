'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, IndianRupee, Lock, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

const inputCls = 'w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500'
const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

const DEFAULT_WARRANTY = '365 days from date of supply (dispatch) or 419 days from date of intimation of inspection'
const DEFAULT_PAYMENT = '50% advance, balance against PI before dispatch'

interface Milestone { label: string; type: 'percent' | 'amount'; value: string; trigger: string; days: string; note: string }

const TRIGGERS = [
  'Advance with PO',
  'Against PI',
  'Before Dispatch',
  'On Delivery',
  'After Installation',
  'Within days of dispatch',
  'Custom',
]

const PRESETS: { name: string; rows: Milestone[] }[] = [
  { name: '50% Adv + 50% before dispatch', rows: [
    { label: 'Advance', type: 'percent', value: '50', trigger: 'Advance with PO', days: '', note: '' },
    { label: 'Balance', type: 'percent', value: '50', trigger: 'Before Dispatch', days: '', note: '' },
  ] },
  { name: '40 + 50 + 10 (installation)', rows: [
    { label: 'Advance', type: 'percent', value: '40', trigger: 'Advance with PO', days: '', note: '' },
    { label: 'Before Dispatch', type: 'percent', value: '50', trigger: 'Before Dispatch', days: '', note: '' },
    { label: 'On Installation', type: 'percent', value: '10', trigger: 'After Installation', days: '', note: '' },
  ] },
  { name: '50% with PO + 50% against PI', rows: [
    { label: 'Advance', type: 'percent', value: '50', trigger: 'Advance with PO', days: '', note: '' },
    { label: 'Balance', type: 'percent', value: '50', trigger: 'Against PI', days: '', note: '' },
  ] },
  { name: '100% Advance', rows: [
    { label: 'Full Payment', type: 'percent', value: '100', trigger: 'Advance with PO', days: '', note: '' },
  ] },
]

function triggerText(m: Milestone): string {
  if (m.trigger === 'Within days of dispatch') return `within ${m.days || 'X'} days of dispatch`
  if (m.trigger === 'Custom') return m.note || 'as agreed'
  return m.trigger.toLowerCase()
}

function summarizeMilestones(ms: Milestone[]): string {
  if (!ms.length) return ''
  return ms
    .filter(m => m.value)
    .map(m => `${m.value}${m.type === 'percent' ? '%' : ' INR'} ${triggerText(m)}`)
    .join(', ')
}

export default function CommercialsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    basicPrice: '',
    discountType: 'percent',
    discountValue: '',
    freightBearer: '',
    freightAmount: '',
    assemblyAtSite: '',
    assemblyCharge: '',
    paymentTerms: DEFAULT_PAYMENT,
    warrantyTerms: DEFAULT_WARRANTY,
  })
  const [milestones, setMilestones] = useState<Milestone[]>(PRESETS[0].rows)
  const [finalInput, setFinalInput] = useState('')

  const user = session?.user as any
  const role = user?.role

  useEffect(() => {
    fetch(`/api/deals/${id}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setDeal(d)
        setForm({
          basicPrice: d.basicPrice != null ? String(d.basicPrice) : '',
          discountType: d.discountType || 'percent',
          discountValue: d.discountValue != null ? String(d.discountValue) : '',
          freightBearer: d.freightBearer || '',
          freightAmount: d.freightAmount != null ? String(d.freightAmount) : '',
          assemblyAtSite: d.assemblyAtSite || '',
          assemblyCharge: d.assemblyCharge != null ? String(d.assemblyCharge) : '',
          paymentTerms: d.paymentTerms || DEFAULT_PAYMENT,
          warrantyTerms: d.warrantyTerms || DEFAULT_WARRANTY,
        })
        setFinalInput(d.finalPrice != null ? String(d.finalPrice) : '')
        if (d.paymentSchedule) {
          try {
            const parsed = JSON.parse(d.paymentSchedule)
            if (Array.isArray(parsed) && parsed.length) setMilestones(parsed)
          } catch { /* keep default */ }
        }
      }
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>
  if (!deal) return <div className="text-center py-12 text-gray-400">Deal not found</div>

  const allowed = ['sales', 'sales_director', 'director'].includes(role)
  if (!allowed) return <div className="text-center py-12 text-gray-400">You do not have access to this page.</div>

  const readOnly = deal.dealFinalized && role === 'sales'

  const basic = parseFloat(form.basicPrice) || 0
  const discVal = parseFloat(form.discountValue) || 0
  const finalEntered = parseFloat(finalInput) || 0
  // In 'final' mode the user enters the final price directly and we derive the discount.
  const isFinalMode = form.discountType === 'final'
  const discount = isFinalMode
    ? Math.max(0, basic - finalEntered)
    : (form.discountType === 'percent' ? basic * discVal / 100 : discVal)
  const finalPrice = isFinalMode ? Math.max(0, finalEntered) : Math.max(0, basic - discount)
  const derivedDiscountPct = basic > 0 ? (discount / basic) * 100 : 0
  const gstAmount = finalPrice * 0.18
  const grandTotal = finalPrice + gstAmount

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basicPrice: basic || null,
        // In 'final' mode we persist the derived percentage as a normal percent discount.
        discountType: isFinalMode ? 'percent' : form.discountType,
        discountValue: isFinalMode ? (derivedDiscountPct || null) : (discVal || null),
        finalPrice: finalPrice || null,
        freightBearer: form.freightBearer || null,
        freightAmount: parseFloat(form.freightAmount) || null,
        assemblyAtSite: form.assemblyAtSite || null,
        assemblyCharge: parseFloat(form.assemblyCharge) || null,
        paymentTerms: summarizeMilestones(milestones) || form.paymentTerms || null,
        paymentSchedule: JSON.stringify(milestones),
        warrantyTerms: form.warrantyTerms || null,
        commercialsDone: true,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/deals/${id}`}><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-green-600" /> Commercials
          </h1>
          <p className="text-sm text-gray-500 font-mono">{deal.serialNumber || deal.dealNumber}{deal.workCode ? ` · ${deal.workCode}` : ''} — {deal.customerCompany}</p>
        </div>
      </div>

      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2 text-amber-800 text-sm">
          <Lock className="w-4 h-4" /> This deal is finalized — commercials are read-only. Contact your sales director for changes.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Model Number (from spec sheet)</label>
              <input type="text" value={deal.modelNumber || '—'} disabled className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Basic Price (₹)</label>
              <input type="number" value={form.basicPrice} onChange={e => set('basicPrice', e.target.value)} disabled={readOnly} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Discount</label>
              <div className="flex gap-2">
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  <button type="button" disabled={readOnly} onClick={() => set('discountType', 'percent')}
                    className={`px-3 text-sm ${form.discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>%</button>
                  <button type="button" disabled={readOnly} onClick={() => set('discountType', 'amount')}
                    className={`px-3 text-sm ${form.discountType === 'amount' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>₹</button>
                  <button type="button" disabled={readOnly} onClick={() => set('discountType', 'final')}
                    className={`px-3 text-sm whitespace-nowrap ${form.discountType === 'final' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>Set Final Price</button>
                </div>
                {!isFinalMode && (
                  <input type="number" value={form.discountValue} onChange={e => set('discountValue', e.target.value)} disabled={readOnly}
                    className={inputCls} placeholder={form.discountType === 'percent' ? 'e.g. 5' : 'e.g. 25000'} />
                )}
              </div>
            </div>
            {isFinalMode ? (
              <div>
                <label className={labelCls}>Final Price (₹)</label>
                <input type="number" value={finalInput} onChange={e => setFinalInput(e.target.value)} disabled={readOnly}
                  className={inputCls} placeholder="e.g. 475000" />
                <p className="mt-1 text-xs text-gray-500">
                  Derived discount: <span className="font-semibold text-gray-700">{derivedDiscountPct.toFixed(2)}%</span> ({formatCurrency(discount)})
                </p>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Final Price (auto)</label>
                <div className="h-9 px-3 flex items-center rounded-md border border-green-200 bg-green-50 text-sm font-semibold text-green-800">
                  {formatCurrency(finalPrice)}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">GST</span><span>18% (HSN 84145930) — {formatCurrency(gstAmount)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1"><span>Grand Total (incl. GST)</span><span>{formatCurrency(grandTotal)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Freight & Assembly</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Freight</label>
              <select value={form.freightBearer} onChange={e => set('freightBearer', e.target.value)} disabled={readOnly} className={inputCls}>
                <option value="">Select…</option>
                <option value="customer_pays">Customer to Pay</option>
                <option value="we_bear">We Bear</option>
                <option value="we_ask_extra">We Ask Extra</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Freight Amount (₹, optional)</label>
              <input type="number" value={form.freightAmount} onChange={e => set('freightAmount', e.target.value)} disabled={readOnly} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Assembly at Site</label>
              <select value={form.assemblyAtSite} onChange={e => set('assemblyAtSite', e.target.value)} disabled={readOnly} className={inputCls}>
                <option value="">Select…</option>
                <option value="not_required">Not Required</option>
                <option value="chargeable">Chargeable — ₹ X</option>
                <option value="included">Included in Basic Price</option>
                <option value="visit_after_supply">Visit After Supply — extra ₹ X</option>
              </select>
            </div>
            {['chargeable', 'visit_after_supply'].includes(form.assemblyAtSite) && (
              <div>
                <label className={labelCls}>Assembly Charge (₹)</label>
                <input type="number" value={form.assemblyCharge} onChange={e => set('assemblyCharge', e.target.value)} disabled={readOnly} className={inputCls} placeholder="0" />
              </div>
            )}
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 space-y-1">
            <p>Shifting and unloading at customer scope.</p>
            <p>Insurance — freight bearer pays.</p>
            <p className="text-blue-500">(These are always mentioned in PO and quote.)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Payment Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Quick presets */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.name} type="button" onClick={() => setMilestones(p.rows.map(r => ({ ...r })))}
                  className="px-2.5 py-1 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-blue-50 hover:border-blue-300">
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Milestone rows */}
          <div className="space-y-2">
            {milestones.map((m, i) => {
              const amt = m.type === 'percent'
                ? (finalPrice * (parseFloat(m.value) || 0) / 100)
                : (parseFloat(m.value) || 0)
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-lg p-2">
                  <input className={`${inputCls} col-span-3`} placeholder="Label (e.g. Advance)" value={m.label} disabled={readOnly}
                    onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <div className="col-span-2 flex">
                    <input type="number" className={`${inputCls} rounded-r-none`} placeholder="0" value={m.value} disabled={readOnly}
                      onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                    <button type="button" disabled={readOnly}
                      onClick={() => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, type: x.type === 'percent' ? 'amount' : 'percent' } : x))}
                      className="h-9 px-2 border border-l-0 border-gray-300 rounded-r-md text-sm bg-white hover:bg-gray-100">
                      {m.type === 'percent' ? '%' : '₹'}
                    </button>
                  </div>
                  <select className={`${inputCls} col-span-3`} value={m.trigger} disabled={readOnly}
                    onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, trigger: e.target.value } : x))}>
                    {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {m.trigger === 'Within days of dispatch' ? (
                    <input type="number" className={`${inputCls} col-span-2`} placeholder="days" value={m.days} disabled={readOnly}
                      onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, days: e.target.value } : x))} />
                  ) : m.trigger === 'Custom' ? (
                    <input className={`${inputCls} col-span-2`} placeholder="note" value={m.note} disabled={readOnly}
                      onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} />
                  ) : (
                    <div className="col-span-2 text-xs text-gray-500 pt-2 text-right">{amt > 0 ? formatCurrency(amt) : '—'}</div>
                  )}
                  {!readOnly && (
                    <button type="button" onClick={() => setMilestones(ms => ms.filter((_, j) => j !== i))}
                      className="col-span-2 text-xs text-red-500 hover:text-red-700 pt-2">Remove</button>
                  )}
                </div>
              )
            })}
          </div>

          {!readOnly && (
            <button type="button" onClick={() => setMilestones(ms => [...ms, { label: '', type: 'percent', value: '', trigger: 'Before Dispatch', days: '', note: '' }])}
              className="text-sm text-blue-600 hover:underline">+ Add payment milestone</button>
          )}

          {/* Total check + generated summary */}
          {(() => {
            const pctTotal = milestones.filter(m => m.type === 'percent').reduce((s, m) => s + (parseFloat(m.value) || 0), 0)
            const hasPct = milestones.some(m => m.type === 'percent')
            return (
              <div className="space-y-1">
                {hasPct && (
                  <p className={`text-xs ${pctTotal === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    Percentage total: {pctTotal}% {pctTotal === 100 ? '✓' : '(should be 100%)'}
                  </p>
                )}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">Payment terms (as it will appear on Quote / PI):</p>
                  <p className="text-sm text-gray-800 font-medium">{summarizeMilestones(milestones) || '—'}</p>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Warranty</CardTitle></CardHeader>
        <CardContent>
          <input type="text" value={form.warrantyTerms} onChange={e => set('warrantyTerms', e.target.value)} disabled={readOnly} className={inputCls} />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Save Commercials'}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          {deal.commercialsDone && !saved && <span className="text-xs text-gray-400">Commercials previously saved</span>}
        </div>
      )}
    </div>
  )
}
