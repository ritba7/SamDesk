'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ModelSelector from '@/components/ModelSelector'
import { APPLICATIONS, ENTRY_TYPES, AIR_FLOW_TIMES, DOOR_TYPES } from '@/lib/airShowerModels'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh']

export default function EditDealPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFinal = searchParams.get('final') === '1'
  const { data: session } = useSession()
  const [tab, setTab] = useState(1)
  const [deal, setDeal] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const user = session?.user as any
  const canEdit = ['director', 'vp', 'accounts', 'sales', 'sales_director'].includes(user?.role)
    && !(deal?.dealFinalized && user?.role === 'sales')

  useEffect(() => {
    Promise.all([
      fetch(`/api/deals/${id}`).then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([d, u]) => {
      setDeal(d)
      setUsers(Array.isArray(u) ? u : [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>
  if (!deal || !canEdit) return <div className="text-center py-12 text-gray-400">{!canEdit ? 'Access denied' : 'Deal not found'}</div>

  const fmtDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : ''

  const save = async (fields: Record<string, any>) => {
    setSaving(true)
    const payload = isFinal ? { ...fields, finalDataEntered: true } : fields
    await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    setSaving(false)
    setSaveMsg('Saved successfully')
    setTimeout(() => setSaveMsg(''), 2000)
    const updated = await fetch(`/api/deals/${id}`).then(r => r.json())
    setDeal(updated)
  }

  const inputCls = "w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  const labelCls = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/deals/${id}`}>
          <button className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isFinal ? 'Final PO Data Entry' : 'Edit Deal'}</h1>
          <p className="text-gray-500 text-sm">{deal.customerCompany} — {deal.dealNumber}</p>
        </div>
      </div>

      {isFinal && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">Final PO Data Entry — this overwrites the deal with confirmed PO details</p>
          <p className="text-xs text-amber-700 mt-1">The earlier lead data is preserved as a pre-PO snapshot. Save each tab to apply the confirmed values.</p>
        </div>
      )}

      {/* Tab buttons */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: 'Customer & Verification' },
          { n: 2, label: 'Query & Specs' },
          { n: 3, label: 'Assignment & Deadlines' },
        ].map(({ n, label }) => (
          <button
            key={n}
            onClick={() => setTab(n)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === n ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {n}. {label}
          </button>
        ))}
      </div>

      {saveMsg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{saveMsg}</div>}

      {tab === 1 && (
        <Tab1Form deal={deal} save={save} saving={saving} inputCls={inputCls} labelCls={labelCls} />
      )}
      {tab === 2 && (
        <Tab2Form deal={deal} save={save} saving={saving} inputCls={inputCls} labelCls={labelCls} />
      )}
      {tab === 3 && (
        <Tab3Form deal={deal} users={users} save={save} saving={saving} inputCls={inputCls} labelCls={labelCls} fmtDate={fmtDate} />
      )}
    </div>
  )
}

function Tab1Form({ deal, save, saving, inputCls, labelCls }: any) {
  const [form, setForm] = useState({
    customerName: deal.customerName || '',
    customerCompany: deal.customerCompany || '',
    customerPhone: deal.customerPhone || '',
    customerEmail: deal.customerEmail || '',
    customerAddress: deal.customerAddress || '',
    customerState: deal.customerState || '',
    gstNumber: deal.gstNumber || '',
    source: deal.source || '',
  })
  const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh']
  const ch = (e: any) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Customer & Verification</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>Customer Name</label><input name="customerName" value={form.customerName} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>Company</label><input name="customerCompany" value={form.customerCompany} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>Phone</label><input name="customerPhone" value={form.customerPhone} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>Email</label><input name="customerEmail" type="email" value={form.customerEmail} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>GST Number</label><input name="gstNumber" value={form.gstNumber} onChange={ch} className={inputCls} maxLength={15} /></div>
        <div>
          <label className={labelCls}>Source</label>
          <select name="source" value={form.source} onChange={ch} className={inputCls}>
            <option value="">Select source</option>
            <option value="indiamart">IndiaMART</option>
            <option value="tradeindia">TradeIndia</option>
            <option value="justdial">JustDial</option>
            <option value="referral">Referral</option>
            <option value="direct">Direct / Cold call</option>
            <option value="website">Website enquiry</option>
            <option value="exhibition">Exhibition</option>
            <option value="repeat">Repeat customer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>State</label>
          <select name="customerState" value={form.customerState} onChange={ch} className={inputCls}>
            <option value="">Select state</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="md:col-span-2"><label className={labelCls}>Address</label><textarea name="customerAddress" value={form.customerAddress} onChange={ch} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} /></div>
      </div>
      <div className="flex justify-end pt-2">
        <button onClick={() => save(form)} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-70">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
        </button>
      </div>
    </div>
  )
}

function Tab2Form({ deal, save, saving, inputCls, labelCls }: any) {
  const [form, setForm] = useState({
    productInterest: deal.productInterest || '',
    querySummary: deal.querySummary || '',
    estimatedQty: deal.estimatedQty ? String(deal.estimatedQty) : '',
    timeline: deal.timeline || '',
    budgetIndication: deal.budgetIndication ? String(deal.budgetIndication) : '',
    specNotes: deal.specNotes || '',
    material: deal.material || '',
    motorType: deal.motorType || '',
    motorBrand: deal.motorBrand || '',
    motorBrandOther: deal.motorBrandOther || '',
    outerWidth: deal.outerWidth ? String(deal.outerWidth) : '',
    outerHeight: deal.outerHeight ? String(deal.outerHeight) : '',
    outerDepth: deal.outerDepth ? String(deal.outerDepth) : '',
    innerWidth: deal.innerWidth ? String(deal.innerWidth) : '',
    innerHeight: deal.innerHeight ? String(deal.innerHeight) : '',
    innerDepth: deal.innerDepth ? String(deal.innerDepth) : '',
    paymentTerms: deal.paymentTerms || '',
    freightTerms: deal.freightTerms || '',
    inspectionTerms: deal.inspectionTerms || '',
    freightPaidBy: deal.freightPaidBy || '',
    modelNumber: deal.modelNumber || '',
    airShowerConfig: deal.airShowerConfig || 'straight',
    sizeCode: '', requiredDepth: '', requiredWidth: '',
    application: deal.application || '',
    numberOfUsers: deal.numberOfUsers ? String(deal.numberOfUsers) : '',
    entryType: deal.entryType || '',
    airFlowTime: deal.airFlowTime || '',
    doorType: deal.doorType || '',
    flooringRequired: deal.flooringRequired ? 'true' : 'false',
    inputPower: deal.inputPower || '440V / 50Hz',
  })
  const ch = (e: any) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handleSave = () => {
    const data: any = { ...form }
    if (data.estimatedQty) data.estimatedQty = parseInt(data.estimatedQty)
    else delete data.estimatedQty
    if (data.budgetIndication) data.budgetIndication = parseFloat(data.budgetIndication)
    else delete data.budgetIndication
    ;['outerWidth','outerHeight','outerDepth','innerWidth','innerHeight','innerDepth'].forEach(k => {
      if (data[k]) data[k] = parseFloat(data[k]); else delete data[k]
    })
    delete data.sizeCode; delete data.requiredDepth; delete data.requiredWidth
    if (data.numberOfUsers) data.numberOfUsers = parseInt(data.numberOfUsers); else delete data.numberOfUsers
    data.flooringRequired = data.flooringRequired === 'true'
    save(data)
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Query & Specs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Product Interest</label>
          <select name="productInterest" value={form.productInterest} onChange={ch} className={inputCls}>
            <option value="">Select product</option>
            <option value="air_shower">Air Shower</option>
            <option value="air_curtain">Air Curtain</option>
            <option value="clean_room">Clean Room Solution</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div><label className={labelCls}>Estimated Qty</label><input name="estimatedQty" type="number" value={form.estimatedQty} onChange={ch} className={inputCls} /></div>
        <div>
          <label className={labelCls}>Timeline</label>
          <select name="timeline" value={form.timeline} onChange={ch} className={inputCls}>
            <option value="">Select timeline</option>
            <option value="urgent">Urgent (within 2 weeks)</option>
            <option value="normal">Normal (1-2 months)</option>
            <option value="flexible">Flexible (3+ months)</option>
          </select>
        </div>
        <div><label className={labelCls}>Budget Indication (INR)</label><input name="budgetIndication" type="number" value={form.budgetIndication} onChange={ch} className={inputCls} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Query Summary</label><textarea name="querySummary" value={form.querySummary} onChange={ch} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Spec Notes</label><textarea name="specNotes" value={form.specNotes} onChange={ch} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} /></div>

        <div><label className={labelCls}>Application</label>
          <select name="application" value={form.application} onChange={ch} className={inputCls}>
            <option value="">Select</option>{APPLICATIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select></div>
        <div><label className={labelCls}>Entry Type</label>
          <select name="entryType" value={form.entryType} onChange={ch} className={inputCls}>
            <option value="">Select</option>{ENTRY_TYPES.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select></div>
        <div><label className={labelCls}>Users / Cycle</label><input name="numberOfUsers" type="number" value={form.numberOfUsers} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>Air Flow Time</label>
          <select name="airFlowTime" value={form.airFlowTime} onChange={ch} className={inputCls}>
            <option value="">Select</option>{AIR_FLOW_TIMES.map(t => <option key={t} value={t}>{t} sec</option>)}<option value="other">Other</option>
          </select></div>
        <div><label className={labelCls}>Door Type</label>
          <select name="doorType" value={form.doorType} onChange={ch} className={inputCls}>
            <option value="">Select</option>{DOOR_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select></div>
        <div><label className={labelCls}>Flooring</label>
          <select name="flooringRequired" value={form.flooringRequired} onChange={ch} className={inputCls}>
            <option value="false">Not Required</option><option value="true">Required</option>
          </select></div>

        <div className="md:col-span-2">
          <ModelSelector
            material={form.material} config={form.airShowerConfig}
            requiredDepth={form.requiredDepth} requiredWidth={form.requiredWidth} sizeCode={form.sizeCode}
            onChange={patch => setForm(f => ({ ...f, ...patch }))}
          />
          {form.modelNumber && <div className="mt-2 text-sm"><span className="text-gray-500">Selected Model: </span><span className="font-mono font-bold text-blue-700">{form.modelNumber}</span></div>}
        </div>

        <div>
          <label className={labelCls}>Motor Type</label>
          <select name="motorType" value={form.motorType} onChange={ch} className={inputCls}>
            <option value="">Select motor type</option>
            <option value="ie2">IE2</option>
            <option value="ie3">IE3</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Motor Brand</label>
          <select name="motorBrand" value={form.motorBrand} onChange={ch} className={inputCls}>
            <option value="">Select brand</option>
            <option value="siemens">Siemens</option>
            <option value="bharatbijli">Bharat Bijli</option>
            <option value="other">Other</option>
          </select>
        </div>
        {form.motorBrand === 'other' && <div><label className={labelCls}>Other Brand</label><input name="motorBrandOther" value={form.motorBrandOther} onChange={ch} className={inputCls} /></div>}
        <div className="md:col-span-2">
          <label className={labelCls}>Outer Dimensions (mm) — W × H × D</label>
          <div className="grid grid-cols-3 gap-2">
            <input name="outerWidth" type="number" value={form.outerWidth} onChange={ch} className={inputCls} placeholder="Width" />
            <input name="outerHeight" type="number" value={form.outerHeight} onChange={ch} className={inputCls} placeholder="Height" />
            <input name="outerDepth" type="number" value={form.outerDepth} onChange={ch} className={inputCls} placeholder="Depth" />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Inner Dimensions (mm) — W × H × D</label>
          <div className="grid grid-cols-3 gap-2">
            <input name="innerWidth" type="number" value={form.innerWidth} onChange={ch} className={inputCls} placeholder="Width" />
            <input name="innerHeight" type="number" value={form.innerHeight} onChange={ch} className={inputCls} placeholder="Height" />
            <input name="innerDepth" type="number" value={form.innerDepth} onChange={ch} className={inputCls} placeholder="Depth" />
          </div>
        </div>
        <div className="md:col-span-2"><label className={labelCls}>Payment Terms</label><input name="paymentTerms" value={form.paymentTerms} onChange={ch} className={inputCls} /></div>
        <div>
          <label className={labelCls}>Freight Paid By</label>
          <select name="freightPaidBy" value={form.freightPaidBy} onChange={ch} className={inputCls}>
            <option value="">Select</option>
            <option value="customer_bears">Customer Bears</option>
            <option value="company_bears">Company Bears</option>
            <option value="to_be_decided">To Be Decided</option>
          </select>
        </div>
        <div><label className={labelCls}>Freight Terms</label><input name="freightTerms" value={form.freightTerms} onChange={ch} className={inputCls} /></div>
        <div>
          <label className={labelCls}>Inspection Terms</label>
          <select name="inspectionTerms" value={form.inspectionTerms} onChange={ch} className={inputCls}>
            <option value="">Select</option>
            <option value="waiver">Waiver</option>
            <option value="physical_inspection">Physical Inspection</option>
            <option value="as_per_agreement">As Per Agreement</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-70">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
        </button>
      </div>
    </div>
  )
}

function Tab3Form({ deal, users, save, saving, inputCls, labelCls, fmtDate }: any) {
  const [form, setForm] = useState({
    assignedToId: deal.assignedToId || '',
    priority: deal.priority || 'medium',
    heatScore: deal.heatScore || 'warm',
    expectedDispatch: fmtDate(deal.expectedDispatch),
    tdsDeadline: fmtDate(deal.tdsDeadline),
    advanceDeadline: fmtDate(deal.advanceDeadline),
    balanceDeadline: fmtDate(deal.balanceDeadline),
    advanceNote: deal.advanceNote || '',
  })
  const ch = (e: any) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handleSave = () => {
    const data: any = { ...form }
    if (!data.assignedToId) delete data.assignedToId
    if (data.expectedDispatch) data.expectedDispatch = new Date(data.expectedDispatch).toISOString(); else delete data.expectedDispatch
    if (data.tdsDeadline) data.tdsDeadline = new Date(data.tdsDeadline).toISOString(); else delete data.tdsDeadline
    if (data.advanceDeadline) data.advanceDeadline = new Date(data.advanceDeadline).toISOString(); else delete data.advanceDeadline
    if (data.balanceDeadline) data.balanceDeadline = new Date(data.balanceDeadline).toISOString(); else delete data.balanceDeadline
    save(data)
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Assignment & Deadlines</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Assigned To</label>
          <select name="assignedToId" value={form.assignedToId} onChange={ch} className={inputCls}>
            <option value="">Unassigned</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select name="priority" value={form.priority} onChange={ch} className={inputCls}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Heat Score</label>
          <select name="heatScore" value={form.heatScore} onChange={ch} className={inputCls}>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
        <div><label className={labelCls}>Expected Dispatch</label><input name="expectedDispatch" type="date" value={form.expectedDispatch} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>TDS Deadline</label><input name="tdsDeadline" type="date" value={form.tdsDeadline} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>Advance Deadline</label><input name="advanceDeadline" type="date" value={form.advanceDeadline} onChange={ch} className={inputCls} /></div>
        <div><label className={labelCls}>Balance Deadline</label><input name="balanceDeadline" type="date" value={form.balanceDeadline} onChange={ch} className={inputCls} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Advance Note</label><textarea name="advanceNote" value={form.advanceNote} onChange={ch} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Notes about advance terms..." /></div>
      </div>
      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-70">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
        </button>
      </div>
    </div>
  )
}
