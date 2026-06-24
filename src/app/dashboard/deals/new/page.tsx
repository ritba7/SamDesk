'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react'
import Link from 'next/link'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh']

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

export default function NewDealPage() {
  const router = useRouter()
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

  const [form, setForm] = useState({
    customerName: '', customerCompany: '', gstNumber: '', customerPhone: '',
    customerEmail: '', website: '', source: '', customerState: '', customerAddress: '',
    productInterest: '', querySummary: '', estimatedQty: '', timeline: '',
    budgetIndication: '', specNotes: '',
    assignedToId: '', priority: 'medium', expectedDispatch: '',
    material: '', motorType: '', motorBrand: '', motorBrandOther: '',
    outerWidth: '', outerHeight: '', outerDepth: '',
    innerWidth: '', innerHeight: '', innerDepth: '',
    freightPaidBy: '', installationType: '', heatScore: 'warm',
    quotedAmount: '', gstRate: '18',
    paymentTerms: '', freightTerms: '', inspectionTerms: '', introEmail: '', tdsDeadline: '',
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

  const handleSaveStep1 = async () => {
    if (!form.customerName || !form.customerCompany) {
      alert('Customer Name and Company are required')
      return
    }
    setSavingStep1(true)
    try {
      const body: any = {
        customerName: form.customerName,
        customerCompany: form.customerCompany,
        customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone || undefined,
        customerAddress: form.customerAddress || undefined,
        customerState: form.customerState || undefined,
        gstNumber: form.gstNumber || undefined,
        source: form.source || undefined,
        verificationScore,
        verificationData: JSON.stringify(manualChecks),
        assignedToId: form.assignedToId || undefined,
      }
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        const deal = await res.json()
        router.push(`/dashboard/deals/${deal.id}`)
      } else {
        alert('Failed to save deal')
      }
    } finally {
      setSavingStep1(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const body: any = {
        ...form,
        verificationScore,
        verificationData: JSON.stringify(manualChecks),
        introEmail: form.introEmail || generatedEmail || undefined,
      }
      // Strip fields not in schema
      delete body.website
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
        {step === 1 ? 'Customer & Verification' : step === 2 ? 'Query, Specs & Email' : 'Assignment & Deadlines'}
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
          <h1 className="text-2xl font-bold text-gray-900">New Deal</h1>
          <p className="text-gray-500 text-sm">Create a new customer inquiry / deal</p>
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
              <label className={labelCls}>Email</label>
              <input name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} className={inputCls} />
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

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Manual Verification Checklist</h3>
              <div className={`text-sm font-medium px-2 py-0.5 rounded-full ${verificationScore >= 80 ? 'bg-green-100 text-green-700' : verificationScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                Score: {verificationScore}%
              </div>
            </div>
            <div className="space-y-2">
              {[
                { key: 'verifiedWebsite', label: 'Verified company website' },
                { key: 'reviewedClientList', label: "Reviewed customer's client list" },
                { key: 'appearsLegitimate', label: 'Company appears legitimate' },
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
          </div>

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
                if (!form.customerName || !form.customerCompany) {
                  alert('Customer Name and Company are required')
                  return
                }
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
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estimated Quantity</label>
              <input name="estimatedQty" type="number" value={form.estimatedQty} onChange={handleChange} className={inputCls} placeholder="1" />
            </div>
            <div>
              <label className={labelCls}>Timeline</label>
              <select name="timeline" value={form.timeline} onChange={handleChange} className={inputCls}>
                <option value="">Select timeline</option>
                <option value="urgent">Urgent (within 2 weeks)</option>
                <option value="normal">Normal (1-2 months)</option>
                <option value="flexible">Flexible (3+ months)</option>
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

          {/* Product Specifications */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Product Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Material</label>
                <select name="material" value={form.material} onChange={handleChange} className={inputCls}>
                  <option value="">Select material</option>
                  <option value="ms">MS</option>
                  <option value="ss304">SS304</option>
                  <option value="ss202">SS202</option>
                  <option value="ms+ss202">MS + SS202</option>
                  <option value="ms+ss304">MS + SS304</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Motor Type</label>
                <select name="motorType" value={form.motorType} onChange={handleChange} className={inputCls}>
                  <option value="">Select motor type</option>
                  <option value="ie2">IE2</option>
                  <option value="ie3">IE3</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Motor Brand</label>
                <select name="motorBrand" value={form.motorBrand} onChange={handleChange} className={inputCls}>
                  <option value="">Select brand</option>
                  <option value="siemens">Siemens</option>
                  <option value="bharatbijli">Bharat Bijli</option>
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

          {/* Payment Terms */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Payment & Freight Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Payment Terms</label>
                <input name="paymentTerms" value={form.paymentTerms} onChange={handleChange} className={inputCls} placeholder="e.g. 50% advance, 50% before dispatch" />
              </div>
              <div>
                <label className={labelCls}>Freight Terms</label>
                <select name="freightPaidBy" value={form.freightPaidBy} onChange={handleChange} className={inputCls}>
                  <option value="">Select</option>
                  <option value="customer_bears">Customer Bears</option>
                  <option value="company_bears">Company Bears</option>
                  <option value="to_be_decided">To Be Decided</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Freight Detail</label>
                <input name="freightTerms" value={form.freightTerms} onChange={handleChange} className={inputCls} placeholder="Additional freight details" />
              </div>
              <div>
                <label className={labelCls}>Inspection Terms</label>
                <select name="inspectionTerms" value={form.inspectionTerms} onChange={handleChange} className={inputCls}>
                  <option value="">Select</option>
                  <option value="waiver">Waiver</option>
                  <option value="physical_inspection">Physical Inspection</option>
                  <option value="as_per_agreement">As Per Agreement</option>
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
          </div>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(1)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Previous
            </button>
            <button type="button" onClick={() => setStep(3)} className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
              Next: Assignment
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Assignment & Deadlines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Assigned To</label>
              <select name="assignedToId" value={form.assignedToId} onChange={handleChange} className={inputCls}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className={inputCls}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Expected Dispatch Date</label>
              <input name="expectedDispatch" type="date" value={form.expectedDispatch} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Heat Score</label>
              <select name="heatScore" value={form.heatScore} onChange={handleChange} className={inputCls}>
                <option value="hot">Hot (High intent)</option>
                <option value="warm">Warm (Considering)</option>
                <option value="cold">Cold (Early stage)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>TDS Send Deadline</label>
              <input name="tdsDeadline" type="date" value={form.tdsDeadline} onChange={handleChange} className={inputCls} />
            </div>
          </div>

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
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
