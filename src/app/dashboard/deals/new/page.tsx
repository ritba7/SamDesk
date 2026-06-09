'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewDealPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customerName: '', customerCompany: '', customerEmail: '', customerPhone: '',
    customerAddress: '', customerState: '', material: '', motorType: '', motorBrand: '',
    motorBrandOther: '', outerWidth: '', outerHeight: '', outerDepth: '',
    innerWidth: '', innerHeight: '', innerDepth: '', specNotes: '',
    freightPaidBy: '', installationType: '', heatScore: 'warm',
    quotedAmount: '', assignedToId: '', expectedDispatch: '', gstRate: '18',
  })

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => setUsers(Array.isArray(data) ? data : []))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      const body: any = { ...form }
      if (body.outerWidth) body.outerWidth = parseFloat(body.outerWidth)
      if (body.outerHeight) body.outerHeight = parseFloat(body.outerHeight)
      if (body.outerDepth) body.outerDepth = parseFloat(body.outerDepth)
      if (body.innerWidth) body.innerWidth = parseFloat(body.innerWidth)
      if (body.innerHeight) body.innerHeight = parseFloat(body.innerHeight)
      if (body.innerDepth) body.innerDepth = parseFloat(body.innerDepth)
      if (body.quotedAmount) body.quotedAmount = parseFloat(body.quotedAmount)
      if (body.gstRate) body.gstRate = parseFloat(body.gstRate)
      if (!body.assignedToId) delete body.assignedToId
      if (!body.expectedDispatch) delete body.expectedDispatch
      const res = await fetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { const deal = await res.json(); router.push(`/dashboard/deals/${deal.id}`) }
      else alert('Failed to create deal')
    } finally { setLoading(false) }
  }

  const sel = (id: string, name: string, val: string, opts: { value: string; label: string }[]) => (
    <select id={id} name={name} value={val} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
      <option value="">Select</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh']

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deals"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">New Deal</h1><p className="text-gray-500 text-sm">Create a new customer inquiry / deal</p></div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Customer Name *</Label><Input name="customerName" value={form.customerName} onChange={handleChange} required className="mt-1" placeholder="Mr. Rajesh Kumar" /></div>
            <div><Label>Company *</Label><Input name="customerCompany" value={form.customerCompany} onChange={handleChange} required className="mt-1" placeholder="ABC Pharma Ltd." /></div>
            <div><Label>Email</Label><Input name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} className="mt-1" /></div>
            <div><Label>Phone</Label><Input name="customerPhone" value={form.customerPhone} onChange={handleChange} className="mt-1" /></div>
            <div><Label>State</Label><select name="customerState" value={form.customerState} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Select state</option>{STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="md:col-span-2"><Label>Address</Label><Textarea name="customerAddress" value={form.customerAddress} onChange={handleChange} className="mt-1" rows={2} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Product Specifications</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Material</Label>{sel('material', 'material', form.material, [{value:'ms',label:'MS (Mild Steel)'},{value:'ss304',label:'SS 304'},{value:'ss202',label:'SS 202'},{value:'ms+ss202',label:'MS + SS 202'},{value:'ms+ss304',label:'MS + SS 304'}])}</div>
            <div><Label>Motor Type</Label>{sel('motorType', 'motorType', form.motorType, [{value:'ie2',label:'IE2'},{value:'ie3',label:'IE3'}])}</div>
            <div><Label>Motor Brand</Label>{sel('motorBrand', 'motorBrand', form.motorBrand, [{value:'siemens',label:'Siemens'},{value:'bharatbijli',label:'Bharat Bijli'},{value:'other',label:'Other'}])}</div>
            {form.motorBrand === 'other' && <div><Label>Motor Brand (Other)</Label><Input name="motorBrandOther" value={form.motorBrandOther} onChange={handleChange} className="mt-1" /></div>}
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Outer Dimensions (mm)</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Width</Label><Input name="outerWidth" type="number" value={form.outerWidth} onChange={handleChange} className="mt-1" placeholder="W" /></div>
                <div><Label className="text-xs">Height</Label><Input name="outerHeight" type="number" value={form.outerHeight} onChange={handleChange} className="mt-1" placeholder="H" /></div>
                <div><Label className="text-xs">Depth</Label><Input name="outerDepth" type="number" value={form.outerDepth} onChange={handleChange} className="mt-1" placeholder="D" /></div>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Inner Dimensions (mm)</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Width</Label><Input name="innerWidth" type="number" value={form.innerWidth} onChange={handleChange} className="mt-1" placeholder="W" /></div>
                <div><Label className="text-xs">Height</Label><Input name="innerHeight" type="number" value={form.innerHeight} onChange={handleChange} className="mt-1" placeholder="H" /></div>
                <div><Label className="text-xs">Depth</Label><Input name="innerDepth" type="number" value={form.innerDepth} onChange={handleChange} className="mt-1" placeholder="D" /></div>
              </div>
            </div>
            <div className="md:col-span-2"><Label>Specification Notes</Label><Textarea name="specNotes" value={form.specNotes} onChange={handleChange} className="mt-1" rows={3} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Logistics & Commercial</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Freight Paid By</Label>{sel('freightPaidBy','freightPaidBy',form.freightPaidBy,[{value:'customer',label:'Customer'},{value:'company',label:'Company'}])}</div>
            <div><Label>Installation Type</Label>{sel('installationType','installationType',form.installationType,[{value:'none',label:'None'},{value:'online',label:'Online Guidance'},{value:'onsite',label:'On-site Installation'}])}</div>
            <div><Label>Quoted Amount (INR)</Label><Input name="quotedAmount" type="number" value={form.quotedAmount} onChange={handleChange} className="mt-1" placeholder="0.00" /></div>
            <div><Label>GST Rate (%)</Label>{sel('gstRate','gstRate',form.gstRate,[{value:'18',label:'18%'},{value:'12',label:'12%'},{value:'5',label:'5%'},{value:'0',label:'0%'}])}</div>
            <div><Label>Expected Dispatch Date</Label><Input name="expectedDispatch" type="date" value={form.expectedDispatch} onChange={handleChange} className="mt-1" /></div>
            <div><Label>Heat Score</Label>{sel('heatScore','heatScore',form.heatScore,[{value:'hot',label:'Hot (High intent)'},{value:'warm',label:'Warm (Considering)'},{value:'cold',label:'Cold (Early stage)'}])}</div>
            <div><Label>Assigned To</Label><select name="assignedToId" value={form.assignedToId} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}</select></div>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/deals"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading && <Loader2 className="w-4 h-4 animate-spin" />}{loading ? 'Creating...' : 'Create Deal'}</Button>
        </div>
      </form>
    </div>
  )
}
