'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Copy, Check, Plus, X } from 'lucide-react'
import Link from 'next/link'
import ModelSelector from '@/components/ModelSelector'
import { APPLICATIONS, ENTRY_TYPES, DOOR_TYPES, DOOR_LEAVES, FLOORING_TYPES, MOTOR_TYPES } from '@/lib/airShowerModels'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface GstResult {
  valid: boolean
  legalName?: string
  tradeName?: string
  state?: string
  status?: string
  registrationDate?: string
  businessType?: string
  fromLive?: boolean
  fromFormat?: boolean
  pan?: string
  error?: string
}

interface ExtraContact {
  name: string
  phone: string
  email: string
  designation: string
}

export default function NewDealPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  // Only leadership may assign a new deal to someone else. Everyone else's deal
  // is auto-assigned to themselves server-side.
  const canAssign = ['director', 'sales_director'].includes(role)
  const [step, setStep] = useState(1)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [savingStep1, setSavingStep1] = useState(false)
  const [gstLoading, setGstLoading] = useState(false)
  const [gstResult, setGstResult] = useState<GstResult | null>(null)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState('')
  const [copied, setCopied] = useState(false)

  const [manualChecks, setManualChecks] = useState({
    verifiedWebsite: false,
    reviewedClientList: false,
    appearsLegitimate: false,
    spokWithAuthorized: false,
  })

  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([])

  const [form, setForm] = useState({
    customerName: '', customerCompany: '', gstNumber: '', customerPhone: '',
    customerEmail: '', website: '', source: '', customerState: '', customerAddress: '',
    productInterest: '', productOther: '', querySummary: '', estimatedQty: '', timeline: '',
    budgetIndication: '', specNotes: '',
    assignedToId: '', expectedDispatch: '',
    material: 'ms', motorType: '', motorBrand: '', motorBrandOther: '',
    outerWidth: '', outerHeight: '', outerDepth: '',
    innerWidth: '', innerHeight: '', innerDepth: '',
    freightPaidBy: '', installationType: '', heatScore: 'warm',
    quotedAmount: '', gstRate: '18',
    introEmail: '', tdsDeadline: '',
    modelNumber: '', airShowerConfig: 'straight', sizeCode: '', requiredDepth: '', requiredWidth: '',
    application: '', numberOfUsers: '', entryType: '', doorType: '', doorLeaf: '',
    flooringType: '', inputPower: '440V / 50Hz',
    // Compulsory next follow-up + remarks
    nextFollowUpDate: '', nextFollowUpMode: 'call', nextFollowUpNote: '',
    firstCallRemarks: '',
  })

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => setUsers(Array.isArray(data) ? data : []))
  }, [])

  const verificationScore = (() => {
    let score = 0
    const total = 6
    if (gstResult?.valid) score += 2
    if (gstResult?.fromLive) score += 1
    if (manualChecks.verifiedWebsite) score += 1
    if (manualChecks.reviewedClientList) score += 1
    if (manualChecks.appearsLegitimate) score += 0.5
    if (manualChecks.spokWithAuthorized) score += 0.5
    return Math.round((score / total) * 100)
  })()

  const checkedCount = Object.values(manualChecks).filter(Boolean).length

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (name === 'gstNumber' && value.length === 15) {
      verifyGst(value)
    }
    if (name === 'gstNumber' && value.length !== 15) {
      setGstResult(null)
    }
  }

  const verifyGst = useCallback(async (gstin: string) => {
    setGstLoading(true)
    try {
      const res = await fetch(`/api/verify-gst?gstin=${gstin}`)
      const data = await res.json()
      setGstResult(data)
    } catch {
      setGstResult({ valid: false, error: 'Verification failed' })
    } finally {
      setGstLoading(false)
    }
  }, [])

  const generateEmail = async () => {
    setGeneratingEmail(true)
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerCompany: form.customerCompany,
          productInterest: form.productInterest,
          querySummary: form.querySummary,
          timeline: form.timeline,
        })
      })
      const data = await res.json()
      const email = data.email || ''
      setGeneratedEmail(email)
      setForm(f => ({ ...f, introEmail: email }))
    } finally {
      setGeneratingEmail(false)
    }
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(generatedEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ---- Shared validation ----
  const validateStep1Basics = (): string | null => {
    if (!form.customerName || !form.customerCompany) return 'Customer Name and Company are required'
    if (!form.customerEmail || !EMAIL_RE.test(form.customerEmail)) return 'A valid customer email is required'
    if (checkedCount < 2) return 'At least 2 verification checklist items must be checked'
    return null
  }

  const validateRemarksAndFollowUp = (): string | null => {
    if (!form.firstCallRemarks || form.firstCallRemarks.trim().length < 10) {
      return 'Remarks after first call are required (min 10 characters)'
    }
    if (!form.nextFollowUpDate) return 'Next follow-up date is required'
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(form.nextFollowUpDate) < today) return 'Next follow-up date must be today or in the future'
    if (!form.nextFollowUpMode) return 'Next follow-up mode is required'
    return null
  }

  const postExtraContacts = async (dealId: string) => {
    const valid = extraContacts.filter(c => c.name.trim())
    if (valid.length === 0) return
    await fetch(`/api/deals/${dealId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: valid }),
    }).catch(() => {})
  }

  const buildFollowUpFields = () => ({
    nextFollowUpAt: new Date(form.nextFollowUpDate).toISOString(),
    nextFollowUpMode: form.nextFollowUpMode,
    firstCallRemarks: form.nextFollowUpNote
      ? `${form.firstCallRemarks.trim()}\n\nNext follow-up note: ${form.nextFollowUpNote.trim()}`
      : form.firstCallRemarks.trim(),
  })

  const handleSaveStep1 = async () => {
    const err = validateStep1Basics() || validateRemarksAndFollowUp()
    if (err) { alert(err); return }
    setSavingStep1(true)
    try {
      const body: any = {
        customerName: form.customerName,
        customerCompany: form.customerCompany,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone || undefined,
        customerAddress: form.customerAddress || undefined,
        customerState: form.customerState || undefined,
        gstNumber: form.gstNumber || undefined,
        source: form.source || undefined,
        verificationScore,
        verificationData: JSON.stringify(manualChecks),
        assignedToId: form.assignedToId || undefined,
        ...buildFollowUpFields(),
      }
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        const deal = await res.json()
        await postExtraContacts(deal.id)
        router.push(`/dashboard/deals/${deal.id}`)
      } else {
        alert('Failed to save deal')
      }
    } finally {
      setSavingStep1(false)
    }
  }

  const handleSubmit = async () => {
    const err = validateStep1Basics() || validateRemarksAndFollowUp()
    if (err) { alert(err); return }
    setLoading(true)
    try {
      const body: any = {
        ...form,
        verificationScore,
        verificationData: JSON.stringify(manualChecks),
        introEmail: form.introEmail || generatedEmail || undefined,
        ...buildFollowUpFields(),
      }
      // Strip helper fields not in schema
      delete body.website
      delete body.sizeCode
      delete body.requiredDepth
      delete body.requiredWidth
      delete body.nextFollowUpDate
      delete body.nextFollowUpNote
      if (body.productInterest !== 'other') delete body.productOther
      if (body.numberOfUsers) body.numberOfUsers = parseInt(body.numberOfUsers); else delete body.numberOfUsers
      if (body.outerWidth) body.outerWidth = parseFloat(body.outerWidth)
      if (body.outerHeight) body.outerHeight = parseFloat(body.outerHeight)
      if (body.outerDepth) body.outerDepth = parseFloat(body.outerDepth)
      if (body.innerWidth) body.innerWidth = parseFloat(body.innerWidth)
      if (body.innerHeight) body.innerHeight = parseFloat(body.innerHeight)
      if (body.innerDepth) body.innerDepth = parseFloat(body.innerDepth)
      if (body.quotedAmount) body.quotedAmount = parseFloat(body.quotedAmount)
      if (body.gstRate) body.gstRate = parseFloat(body.gstRate)
      if (body.estimatedQty) body.estimatedQty = parseInt(body.estimatedQty)
      if (body.budgetIndication) body.budgetIndication = parseFloat(body.budgetIndication)
      if (!body.assignedToId) delete body.assignedToId
      if (!body.expectedDispatch) delete body.expectedDispatch
      if (!body.tdsDeadline) delete body.tdsDeadline
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        const deal = await res.json()
        await postExtraContacts(deal.id)
        router.push(`/dashboard/deals/${deal.id}`)
      } else {
        alert('Failed to create deal')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  const labelCls = "block text-sm font-medium text-gray-700 mb-1"

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => s < step && setStep(s)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              s === step ? 'bg-blue-700 text-white' :
              s < step ? 'bg-blue-200 text-blue-800 cursor-pointer hover:bg-blue-300' :
              'bg-gray-200 text-gray-500'
            }`}
          >
            {s}
          </button>
          {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-blue-400' : 'bg-gray-200'}`} />}
        </div>
      ))}
      <div className="ml-4 text-sm text-gray-500">
        {step === 1 ? 'Customer & Verification' : step === 2 ? 'Query, Specs & Email' : 'Remarks, Follow-up & Save'}
      </div>
    </div>
  )

  // Remarks + compulsory next follow-up block (used on step 1's save-later flow and step 3)
  const RemarksAndFollowUp = (
    <div className="border-t border-gray-100 pt-5 space-y-4">
      <div>
        <label className={labelCls}>Remarks after first call (required, min 10 chars) *</label>
        <textarea
          name="firstCallRemarks"
          value={form.firstCallRemarks}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="What was discussed on the first call with the customer..."
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Next Follow-up (required)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Date *</label>
            <input
              name="nextFollowUpDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={form.nextFollowUpDate}
              onChange={handleChange}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Mode *</label>
            <select name="nextFollowUpMode" value={form.nextFollowUpMode} onChange={handleChange} className={inputCls}>
              <option value="call">Phone Call</option>
              <option value="mail">Email</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Note (optional)</label>
            <input name="nextFollowUpNote" value={form.nextFollowUpNote} onChange={handleChange} className={inputCls} placeholder="e.g. discuss final specs" />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deals">
          <button className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Lead</h1>
          <p className="text-gray-500 text-sm">Create a new customer inquiry / lead</p>
        </div>
      </div>

      <StepIndicator />

      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Customer Information & Verification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Customer Name *</label>
              <input name="customerName" value={form.customerName} onChange={handleChange} required className={inputCls} placeholder="Mr. Rajesh Kumar" />
            </div>
            <div>
              <label className={labelCls}>Company *</label>
              <input name="customerCompany" value={form.customerCompany} onChange={handleChange} required className={inputCls} placeholder="ABC Pharma Ltd." />
            </div>
            <div>
              <label className={labelCls}>GST Number</label>
              <div className="relative">
                <input
                  name="gstNumber"
                  value={form.gstNumber}
                  onChange={handleChange}
                  className={inputCls + ' pr-8'}
                  placeholder="22AAAAA0000A1Z5 (15 chars)"
                  maxLength={15}
                />
                {gstLoading && <Loader2 className="absolute right-2 top-2 w-4 h-4 animate-spin text-blue-500" />}
              </div>
              {gstResult && (
                <div className={`mt-2 rounded-lg p-3 text-sm ${gstResult.fromLive ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    {gstResult.fromLive
                      ? <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-700">GST Verified</span></>
                      : <><AlertCircle className="w-4 h-4 text-yellow-600" /><span className="text-yellow-700">Format valid – manual verification needed</span></>
                    }
                  </div>
                  {gstResult.legalName && <p className="text-gray-700">Legal Name: {gstResult.legalName}</p>}
                  {gstResult.tradeName && <p className="text-gray-600">Trade Name: {gstResult.tradeName}</p>}
                  {gstResult.state && <p className="text-gray-600">State: {gstResult.state}</p>}
                  {gstResult.status && <p className="text-gray-600">Status: {gstResult.status}</p>}
                  {gstResult.pan && <p className="text-gray-600">PAN: {gstResult.pan}</p>}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input name="customerPhone" value={form.customerPhone} onChange={handleChange} className={inputCls} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} required className={inputCls} placeholder="contact@company.com" />
              {form.customerEmail && !EMAIL_RE.test(form.customerEmail) && (
                <p className="text-xs text-red-500 mt-1">Enter a valid email address</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input name="website" value={form.website} onChange={handleChange} className={inputCls} placeholder="https://example.com" />
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <select name="source" value={form.source} onChange={handleChange} className={inputCls}>
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
              <select name="customerState" value={form.customerState} onChange={handleChange} className={inputCls}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Address</label>
              <textarea name="customerAddress" value={form.customerAddress} onChange={handleChange} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
            </div>
          </div>

          {/* Contact Persons repeater */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Contact Persons</h3>
              <button
                type="button"
                onClick={() => setExtraContacts(cs => [...cs, { name: '', phone: '', email: '', designation: '' }])}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add another contact
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">The customer name/phone/email above is saved as the primary contact. Add more POCs here.</p>
            {extraContacts.map((c, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2 items-start">
                <input value={c.name} onChange={e => setExtraContacts(cs => cs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputCls} placeholder="Name *" />
                <input value={c.phone} onChange={e => setExtraContacts(cs => cs.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} className={inputCls} placeholder="Phone" />
                <input value={c.email} onChange={e => setExtraContacts(cs => cs.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} className={inputCls} placeholder="Email" />
                <input value={c.designation} onChange={e => setExtraContacts(cs => cs.map((x, j) => j === i ? { ...x, designation: e.target.value } : x))} className={inputCls} placeholder="Designation" />
                <button type="button" onClick={() => setExtraContacts(cs => cs.filter((_, j) => j !== i))} className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Manual Verification Checklist <span className="font-normal text-gray-400">(min 2 required)</span></h3>
              <div className={`text-sm font-medium px-2 py-0.5 rounded-full ${verificationScore >= 80 ? 'bg-green-100 text-green-700' : verificationScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                Score: {verificationScore}%
              </div>
            </div>
            <div className="space-y-2">
              {[
                { key: 'verifiedWebsite', label: 'Verified company website' },
                { key: 'reviewedClientList', label: "Reviewed customer's client list" },
                { key: 'appearsLegitimate', label: 'Checked with Director' },
                { key: 'spokWithAuthorized', label: 'Spoke with authorized person' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualChecks[key as keyof typeof manualChecks]}
                    onChange={e => setManualChecks(m => ({ ...m, [key]: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
            {checkedCount < 2 && <p className="text-xs text-amber-600 mt-2">Check at least 2 items before saving.</p>}
          </div>

          {/* Save & Continue Later requires remarks + follow-up too */}
          {RemarksAndFollowUp}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handleSaveStep1}
              disabled={savingStep1}
              className="flex items-center gap-2 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-70"
            >
              {savingStep1 && <Loader2 className="w-4 h-4 animate-spin" />}
              Save & Continue Later
            </button>
            <button
              type="button"
              onClick={() => {
                const err = validateStep1Basics()
                if (err) { alert(err); return }
                setStep(2)
              }}
              className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              Next: Query Details
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Query, Specs & Email Draft</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Product Interest</label>
              <select name="productInterest" value={form.productInterest} onChange={handleChange} className={inputCls}>
                <option value="">Select product</option>
                <option value="air_shower">Air Shower</option>
                <option value="air_curtain">Air Curtain</option>
                <option value="clean_room">Clean Room Solution</option>
                <option value="pass_box_static">Static Pass Box</option>
                <option value="pass_box_dynamic">Dynamic Pass Box</option>
                <option value="other">Other</option>
              </select>
            </div>
            {form.productInterest === 'other' && (
              <div>
                <label className={labelCls}>Product name</label>
                <input name="productOther" value={form.productOther} onChange={handleChange} className={inputCls} placeholder="Enter product name" />
              </div>
            )}
            <div>
              <label className={labelCls}>Estimated Quantity</label>
              <input name="estimatedQty" type="number" value={form.estimatedQty} onChange={handleChange} className={inputCls} placeholder="1" />
            </div>
            <div>
              <label className={labelCls}>Timeline</label>
              <select name="timeline" value={form.timeline} onChange={handleChange} className={inputCls}>
                <option value="">Select timeline</option>
                <option value="urgent">Urgent (within 2 weeks)</option>
                <option value="normal">Normal (3-4 weeks)</option>
                <option value="flexible">Flexible (post-dated / to be decided later)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Budget Indication (INR)</label>
              <input name="budgetIndication" type="number" value={form.budgetIndication} onChange={handleChange} className={inputCls} placeholder="Optional" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Query Summary</label>
              <textarea name="querySummary" value={form.querySummary} onChange={handleChange} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Describe the customer's requirement..." />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Specification Notes (internal)</label>
              <textarea name="specNotes" value={form.specNotes} onChange={handleChange} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Dimensions, material preferences, special requirements, internal notes..." />
            </div>
          </div>

          {/* Air Shower Selection (from brochure) */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Air Shower Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Application</label>
                <select name="application" value={form.application} onChange={handleChange} className={inputCls}>
                  <option value="">Select application</option>
                  {APPLICATIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Entry Type</label>
                <select name="entryType" value={form.entryType} onChange={handleChange} className={inputCls}>
                  <option value="">Select entry type</option>
                  {ENTRY_TYPES.filter(e => e.key !== 'material').map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Number of Users / Cycle</label>
                <input name="numberOfUsers" type="number" value={form.numberOfUsers} onChange={handleChange} className={inputCls} placeholder="e.g. 2" />
              </div>
              <div>
                <label className={labelCls}>Type of Flooring</label>
                <select name="flooringType" value={form.flooringType} onChange={handleChange} className={inputCls}>
                  <option value="">Select flooring</option>
                  {FLOORING_TYPES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Door Type</label>
                <select name="doorType" value={form.doorType} onChange={handleChange} className={inputCls}>
                  <option value="">Select door type</option>
                  {DOOR_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Door Leaf</label>
                <select name="doorLeaf" value={form.doorLeaf} onChange={handleChange} className={inputCls}>
                  <option value="">Select door leaf</option>
                  {DOOR_LEAVES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Input Power</label>
                <input name="inputPower" value={form.inputPower} onChange={handleChange} className={inputCls} placeholder="440V / 50Hz" />
              </div>
            </div>

            {/* Model selector with auto-suggest + manual dimensions */}
            <ModelSelector
              material={form.material}
              config={form.airShowerConfig}
              requiredDepth={form.requiredDepth}
              requiredWidth={form.requiredWidth}
              sizeCode={form.sizeCode}
              innerWidth={form.innerWidth}
              innerHeight={form.innerHeight}
              innerDepth={form.innerDepth}
              outerWidth={form.outerWidth}
              outerHeight={form.outerHeight}
              outerDepth={form.outerDepth}
              modelNumber={form.modelNumber}
              onChange={patch => setForm(f => ({ ...f, ...patch }))}
            />

            {form.modelNumber && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-gray-500">Selected Model:</span>
                <span className="font-mono font-bold text-blue-700">{form.modelNumber}</span>
              </div>
            )}
          </div>

          {/* Product Specifications */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Motor & Dimensions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Motor Type</label>
                <select name="motorType" value={form.motorType} onChange={handleChange} className={inputCls}>
                  <option value="">Select motor type</option>
                  {MOTOR_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Motor Brand</label>
                <select name="motorBrand" value={form.motorBrand} onChange={handleChange} className={inputCls}>
                  <option value="">Select brand</option>
                  <option value="siemens">Siemens</option>
                  <option value="bharatbijli">Bharat Bijli</option>
                  <option value="havells">Havells</option>
                  <option value="abb">ABB</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {form.motorBrand === 'other' && (
                <div>
                  <label className={labelCls}>Other brand name</label>
                  <input name="motorBrandOther" value={form.motorBrandOther} onChange={handleChange} className={inputCls} placeholder="Brand name" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className={labelCls}>Outer Dimensions (mm) — W × H × D</label>
                <div className="grid grid-cols-3 gap-2">
                  <input name="outerWidth" type="number" value={form.outerWidth} onChange={handleChange} className={inputCls} placeholder="Width" />
                  <input name="outerHeight" type="number" value={form.outerHeight} onChange={handleChange} className={inputCls} placeholder="Height" />
                  <input name="outerDepth" type="number" value={form.outerDepth} onChange={handleChange} className={inputCls} placeholder="Depth" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Inner Dimensions (mm) — W × H × D</label>
                <div className="grid grid-cols-3 gap-2">
                  <input name="innerWidth" type="number" value={form.innerWidth} onChange={handleChange} className={inputCls} placeholder="Width" />
                  <input name="innerHeight" type="number" value={form.innerHeight} onChange={handleChange} className={inputCls} placeholder="Height" />
                  <input name="innerDepth" type="number" value={form.innerDepth} onChange={handleChange} className={inputCls} placeholder="Depth" />
                </div>
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Logistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Freight Paid By</label>
                <select name="freightPaidBy" value={form.freightPaidBy} onChange={handleChange} className={inputCls}>
                  <option value="">Select</option>
                  <option value="customer_bears">Customer Bears</option>
                  <option value="company_bears">Company Bears</option>
                  <option value="to_be_decided">To Be Decided</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Installation Type</label>
                <select name="installationType" value={form.installationType} onChange={handleChange} className={inputCls}>
                  <option value="">Select</option>
                  <option value="none">None</option>
                  <option value="online">Online</option>
                  <option value="onsite">Onsite</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Auto-Draft Introduction Email</h3>
              <button
                type="button"
                onClick={generateEmail}
                disabled={generatingEmail}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-70"
              >
                {generatingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generate Intro Email
              </button>
            </div>
            {generatedEmail && (
              <div className="space-y-2">
                <textarea
                  value={generatedEmail}
                  onChange={e => { setGeneratedEmail(e.target.value); setForm(f => ({ ...f, introEmail: e.target.value })) }}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  rows={10}
                />
                <button
                  type="button"
                  onClick={copyEmail}
                  className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            )}

            {/* Attachments to send with the intro email */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Attachments (sent with intro email)</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Air Shower Brochure', path: '/docs/SAM-Air-Shower-Brochure.pdf' },
                  { label: 'Client List', path: '/docs/SAM-Products-Client-List.pdf' },
                  { label: 'Company Profile', path: '/docs/SAM-Products-Company-Deck.pdf' },
                ].map(d => (
                  <a key={d.path} href={d.path} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> {d.label}
                  </a>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Download these and attach them to your email to the customer.</p>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(1)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Previous
            </button>
            <button type="button" onClick={() => setStep(3)} className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
              Next: Remarks & Follow-up
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Assignment, Remarks & Follow-up</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canAssign && (
              <div>
                <label className={labelCls}>Assigned To</label>
                <select name="assignedToId" value={form.assignedToId} onChange={handleChange} className={inputCls}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Heat Score</label>
              <select name="heatScore" value={form.heatScore} onChange={handleChange} className={inputCls}>
                <option value="hot">Hot (High intent)</option>
                <option value="warm">Warm (Considering)</option>
                <option value="cold">Cold (Early stage)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Expected Dispatch Date</label>
              <input name="expectedDispatch" type="date" value={form.expectedDispatch} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TDS Send Deadline</label>
              <input name="tdsDeadline" type="date" value={form.tdsDeadline} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          {RemarksAndFollowUp}

          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(2)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Previous
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
