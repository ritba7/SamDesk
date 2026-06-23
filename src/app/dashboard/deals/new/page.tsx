'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, AlertCircle, Shield, Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh']

interface GstData {
  valid: boolean
  legalName?: string
  tradeName?: string
  state?: string
  status?: string
  registrationDate?: string
  businessType?: string
  fromFormat?: boolean
}

export default function NewDealPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<any[]>([])

  // Step 1 fields
  const [customerName, setCustomerName] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerWebsite, setCustomerWebsite] = useState('')
  const [source, setSource] = useState('')
  const [customerState, setCustomerState] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // GST verification
  const [gstData, setGstData] = useState<GstData | null>(null)
  const [gstLoading, setGstLoading] = useState(false)
  const [manualChecks, setManualChecks] = useState({
    websiteVerified: false,
    clientListReviewed: false,
    appearsLegitimate: false,
    spokeWithAuthorized: false,
  })

  // Step 2 fields
  const [productInterest, setProductInterest] = useState('')
  const [querySummary, setQuerySummary] = useState('')
  const [estimatedQty, setEstimatedQty] = useState('')
  const [roughWidth, setRoughWidth] = useState('')
  const [roughHeight, setRoughHeight] = useState('')
  const [roughDepth, setRoughDepth] = useState('')
  const [material, setMaterial] = useState('')
  const [motorPreference, setMotorPreference] = useState('')
  const [timeline, setTimeline] = useState('')
  const [budgetIndication, setBudgetIndication] = useState('')
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [generatedEmail, setGeneratedEmail] = useState('')
  const [generatingEmail, setGeneratingEmail] = useState(false)

  // Step 3 fields
  const [assignedToId, setAssignedToId] = useState('')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [priority, setPriority] = useState('medium')

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => {
      const arr = Array.isArray(data) ? data : []
      setUsers(arr.filter((u: any) => ['vp', 'accounts', 'sales', 'director'].includes(u.role)))
    }).catch(() => setUsers([]))
  }, [])

  // Auto-verify GST when 15 chars
  useEffect(() => {
    if (gstNumber.length === 15) {
      setGstLoading(true)
      fetch(`/api/verify-gst?gstin=${gstNumber}`)
        .then(r => r.json())
        .then(data => { setGstData(data); setGstLoading(false) })
        .catch(() => setGstLoading(false))
    } else {
      setGstData(null)
    }
  }, [gstNumber])

  const autoChecks = gstData ? [
    { label: 'GST Registration Status', ok: gstData.valid },
    { label: 'Legal Business Name matches', ok: gstData.legalName ? gstData.legalName.toLowerCase().includes(customerCompany.toLowerCase().substring(0, 4)) : false },
    { label: 'State matches GST registration', ok: gstData.state ? customerState.toLowerCase().includes(gstData.state.toLowerCase().substring(0, 4)) : false },
    { label: 'Filing status active', ok: gstData.status?.toLowerCase().includes('active') || false },
  ] : []

  const manualCheckList = [
    { key: 'websiteVerified', label: 'Verified company website' },
    { key: 'clientListReviewed', label: "Reviewed customer's client list" },
    { key: 'appearsLegitimate', label: 'Company appears legitimate' },
    { key: 'spokeWithAuthorized', label: 'Spoke with authorized person' },
  ]

  const totalChecks = autoChecks.length + manualCheckList.length
  const checkedCount = autoChecks.filter(c => c.ok).length + Object.values(manualChecks).filter(Boolean).length
  const verificationScore = totalChecks > 0 ? Math.round((checkedCount / totalChecks) * 100) : 0

  const generateEmailDraft = async () => {
    setGeneratingEmail(true)
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, customerCompany, productInterest, querySummary, timeline })
      })
      const data = await res.json()
      setGeneratedEmail(data.email || '')
    } catch {
      setGeneratedEmail('Failed to generate email. Please try again.')
    } finally {
      setGeneratingEmail(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const body: any = {
        customerName,
        customerCompany,
        gstNumber: gstNumber || undefined,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        customerWebsite: customerWebsite || undefined,
        source: source || undefined,
        customerState: customerState || undefined,
        customerAddress: customerAddress || undefined,
        productInterest: productInterest || undefined,
        querySummary: querySummary || undefined,
        estimatedQty: estimatedQty ? parseInt(estimatedQty) : undefined,
        roughWidth: roughWidth ? parseFloat(roughWidth) : undefined,
        roughHeight: roughHeight ? parseFloat(roughHeight) : undefined,
        roughDepth: roughDepth ? parseFloat(roughDepth) : undefined,
        material: material || undefined,
        motorPreference: motorPreference || undefined,
        timeline: timeline || undefined,
        budgetIndication: budgetIndication ? parseFloat(budgetIndication) : undefined,
        specialRequirements: specialRequirements || undefined,
        assignedToId: assignedToId || undefined,
        expectedCloseDate: expectedCloseDate || undefined,
        internalNotes: internalNotes || undefined,
        priority,
        verificationScore,
        verificationData: gstData ? JSON.stringify(gstData) : undefined,
        heatScore: 'warm',
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
        setError('Failed to create deal. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sel = (value: string, onChange: (v: string) => void, opts: {value: string, label: string}[], placeholder = 'Select') => (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deals"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Deal</h1>
          <p className="text-gray-500 text-sm">Step {step} of 3 — {step === 1 ? 'Customer Details & Verification' : step === 2 ? 'Query & Requirement' : 'Assignment & Notes'}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1,2,3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${s < step ? 'bg-green-500 text-white' : s === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s < step ? '✓' : s}
            </div>
            {s < 3 && <div className={`w-16 h-0.5 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Customer Name (Contact Person) *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1" placeholder="Mr. Rajesh Kumar" required /></div>
              <div><Label>Company Name *</Label><Input value={customerCompany} onChange={e => setCustomerCompany(e.target.value)} className="mt-1" placeholder="ABC Pharma Ltd." required /></div>
              <div>
                <Label>GST Number (optional)</Label>
                <div className="relative">
                  <Input value={gstNumber} onChange={e => setGstNumber(e.target.value.toUpperCase())} className="mt-1" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                  {gstLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
                  {gstData && !gstLoading && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                </div>
              </div>
              <div><Label>Phone</Label><Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="mt-1" placeholder="+91 98100 00000" /></div>
              <div><Label>Email</Label><Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="mt-1" /></div>
              <div><Label>Company Website (optional)</Label><Input value={customerWebsite} onChange={e => setCustomerWebsite(e.target.value)} className="mt-1" placeholder="www.example.com" /></div>
              <div><Label>How did they find us?</Label><div className="mt-1">{sel(source, setSource, [{value:'referral',label:'Referral'},{value:'exhibition',label:'Exhibition'},{value:'website',label:'Website'},{value:'cold_call',label:'Cold Call'},{value:'repeat_customer',label:'Repeat Customer'},{value:'other',label:'Other'}])}</div></div>
              <div><Label>State</Label><div className="mt-1">{sel(customerState, setCustomerState, STATES.map(s => ({value:s, label:s})))}</div></div>
              <div className="md:col-span-2"><Label>Full Address</Label><Textarea value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="mt-1" rows={2} /></div>
            </CardContent>
          </Card>

          {/* GST Verification Panel */}
          {gstData && (
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" />Verification Panel</CardTitle>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${verificationScore >= 80 ? 'bg-green-100 text-green-700' : verificationScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    Score: {verificationScore}%
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {gstData.fromFormat && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                    Live GST check unavailable — verified from GSTIN format only. State: {gstData.state}
                  </div>
                )}
                {gstData.legalName && (
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-500">Legal Name:</span> <span className="font-medium">{gstData.legalName}</span></p>
                    {gstData.tradeName && <p><span className="text-gray-500">Trade Name:</span> <span className="font-medium">{gstData.tradeName}</span></p>}
                    {gstData.state && <p><span className="text-gray-500">State:</span> <span className="font-medium">{gstData.state}</span></p>}
                    {gstData.status && <p><span className="text-gray-500">Status:</span> <span className="font-medium">{gstData.status}</span></p>}
                    {gstData.registrationDate && <p><span className="text-gray-500">Registered:</span> <span className="font-medium">{gstData.registrationDate}</span></p>}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Auto-checked (from GST API)</p>
                  <div className="space-y-1.5">
                    {autoChecks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {c.ok ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        <span className={c.ok ? 'text-gray-700' : 'text-gray-400'}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Manual Verification (check each)</p>
                  <div className="space-y-2">
                    {manualCheckList.map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={manualChecks[item.key as keyof typeof manualChecks]} onChange={e => setManualChecks(prev => ({...prev, [item.key]: e.target.checked}))} className="rounded" />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!gstNumber && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              GST not provided — manual verification required
            </div>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Query & Requirement</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Product Interest</Label><div className="mt-1">{sel(productInterest, setProductInterest, [{value:'Air Shower',label:'Air Shower'},{value:'Air Curtain',label:'Air Curtain'},{value:'Clean Room',label:'Clean Room'},{value:'Other',label:'Other'}])}</div></div>
              <div><Label>Timeline / Urgency</Label><div className="mt-1">{sel(timeline, setTimeline, [{value:'urgent',label:'Urgent (<2 weeks)'},{value:'normal',label:'Normal (4-6 weeks)'},{value:'flexible',label:'Flexible'}])}</div></div>
              <div className="md:col-span-2"><Label>Query Summary</Label><Textarea value={querySummary} onChange={e => setQuerySummary(e.target.value)} className="mt-1" rows={3} placeholder="Describe the customer's requirement..." /></div>
              <div><Label>Estimated Quantity</Label><Input type="number" value={estimatedQty} onChange={e => setEstimatedQty(e.target.value)} className="mt-1" placeholder="1" /></div>
              <div><Label>Budget Indication (INR, optional)</Label><Input type="number" value={budgetIndication} onChange={e => setBudgetIndication(e.target.value)} className="mt-1" placeholder="0" /></div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Rough Dimensions (mm) — W × H × D</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Width</Label><Input type="number" value={roughWidth} onChange={e => setRoughWidth(e.target.value)} className="mt-1" placeholder="W" /></div>
                  <div><Label className="text-xs">Height</Label><Input type="number" value={roughHeight} onChange={e => setRoughHeight(e.target.value)} className="mt-1" placeholder="H" /></div>
                  <div><Label className="text-xs">Depth</Label><Input type="number" value={roughDepth} onChange={e => setRoughDepth(e.target.value)} className="mt-1" placeholder="D" /></div>
                </div>
              </div>
              <div><Label>Material Preference</Label><div className="mt-1">{sel(material, setMaterial, [{value:'ms',label:'MS'},{value:'ss304',label:'SS304'},{value:'ss202',label:'SS202'},{value:'ms+ss202',label:'MS+SS202'},{value:'ms+ss304',label:'MS+SS304'},{value:'not_decided',label:'Not decided'}])}</div></div>
              <div><Label>Motor Preference</Label><div className="mt-1">{sel(motorPreference, setMotorPreference, [{value:'ie2',label:'IE2'},{value:'ie3',label:'IE3'},{value:'not_decided',label:'Not decided'}])}</div></div>
              <div className="md:col-span-2"><Label>Special Requirements</Label><Textarea value={specialRequirements} onChange={e => setSpecialRequirements(e.target.value)} className="mt-1" rows={2} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" />Intro Email Draft</CardTitle>
                <Button size="sm" variant="outline" onClick={generateEmailDraft} disabled={generatingEmail}>
                  {generatingEmail ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Generating...</> : 'Generate Intro Email'}
                </Button>
              </div>
            </CardHeader>
            {generatedEmail && (
              <CardContent>
                <Textarea value={generatedEmail} onChange={e => setGeneratedEmail(e.target.value)} rows={12} className="font-mono text-xs" />
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Assignment & Notes</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Assign To</Label>
                <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div><Label>Expected Close Date</Label><Input type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} className="mt-1" /></div>
              <div>
                <Label>Priority</Label>
                <div className="mt-1">{sel(priority, setPriority, [{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}])}</div>
              </div>
              <div className="md:col-span-2"><Label>Internal Notes</Label><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="mt-1" rows={3} /></div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}><ArrowLeft className="w-4 h-4 mr-1" />Previous</Button>}
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/deals"><Button variant="ghost">Cancel</Button></Link>
          {step < 3 ? (
            <Button onClick={() => {
              if (step === 1 && (!customerName.trim() || !customerCompany.trim())) {
                setError('Customer Name and Company Name are required')
                return
              }
              setError('')
              setStep(s => s + 1)
            }}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {loading ? 'Creating...' : 'Create Deal'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
