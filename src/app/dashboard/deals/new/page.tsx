'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  name: string
  role: string
}

export default function NewDealPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customerName: '',
    customerCompany: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    customerState: '',
    material: '',
    motorType: '',
    motorBrand: '',
    motorBrandOther: '',
    outerWidth: '',
    outerHeight: '',
    outerDepth: '',
    innerWidth: '',
    innerHeight: '',
    innerDepth: '',
    specNotes: '',
    freightPaidBy: '',
    installationType: '',
    heatScore: 'warm',
    quotedAmount: '',
    assignedToId: '',
    expectedDispatch: '',
    gstRate: '18',
  })

  const user = session?.user as any

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => setUsers(Array.isArray(data) ? data : []))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const body: any = { ...form }
      // Convert numbers
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deals">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Deal</h1>
          <p className="text-gray-500 text-sm">Create a new customer inquiry / deal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input id="customerName" name="customerName" value={form.customerName} onChange={handleChange} required className="mt-1" placeholder="Mr. Rajesh Kumar" />
            </div>
            <div>
              <Label htmlFor="customerCompany">Company *</Label>
              <Input id="customerCompany" name="customerCompany" value={form.customerCompany} onChange={handleChange} required className="mt-1" placeholder="ABC Pharma Ltd." />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input id="customerEmail" name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} className="mt-1" placeholder="customer@example.com" />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input id="customerPhone" name="customerPhone" value={form.customerPhone} onChange={handleChange} className="mt-1" placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label htmlFor="customerState">State</Label>
              <select id="customerState" name="customerState" value={form.customerState} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select state</option>
                {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea id="customerAddress" name="customerAddress" value={form.customerAddress} onChange={handleChange} className="mt-1" rows={2} placeholder="Full address..." />
            </div>
          </CardContent>
        </Card>

        {/* Product Specifications */}
        <Card>
          <CardHeader><CardTitle className="text-base">Product Specifications</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="material">Material</Label>
              <select id="material" name="material" value={form.material} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select material</option>
                <option value="ms">MS (Mild Steel)</option>
                <option value="ss304">SS 304</option>
                <option value="ss202">SS 202</option>
                <option value="ms+ss202">MS + SS 202</option>
                <option value="ms+ss304">MS + SS 304</option>
              </select>
            </div>
            <div>
              <Label htmlFor="motorType">Motor Type</Label>
              <select id="motorType" name="motorType" value={form.motorType} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select motor type</option>
                <option value="ie2">IE2</option>
                <option value="ie3">IE3</option>
              </select>
            </div>
            <div>
              <Label htmlFor="motorBrand">Motor Brand</Label>
              <select id="motorBrand" name="motorBrand" value={form.motorBrand} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select brand</option>
                <option value="siemens">Siemens</option>
                <option value="bharatbijli">Bharat Bijli</option>
                <option value="other">Other</option>
              </select>
            </div>
            {form.motorBrand === 'other' && (
              <div>
                <Label htmlFor="motorBrandOther">Motor Brand (Other)</Label>
                <Input id="motorBrandOther" name="motorBrandOther" value={form.motorBrandOther} onChange={handleChange} className="mt-1" placeholder="Enter brand name" />
              </div>
            )}

            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Outer Dimensions (mm)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="outerWidth" className="text-xs">Width</Label>
                  <Input id="outerWidth" name="outerWidth" type="number" value={form.outerWidth} onChange={handleChange} className="mt-1" placeholder="W" />
                </div>
                <div>
                  <Label htmlFor="outerHeight" className="text-xs">Height</Label>
                  <Input id="outerHeight" name="outerHeight" type="number" value={form.outerHeight} onChange={handleChange} className="mt-1" placeholder="H" />
                </div>
                <div>
                  <Label htmlFor="outerDepth" className="text-xs">Depth</Label>
                  <Input id="outerDepth" name="outerDepth" type="number" value={form.outerDepth} onChange={handleChange} className="mt-1" placeholder="D" />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Inner Dimensions (mm)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="innerWidth" className="text-xs">Width</Label>
                  <Input id="innerWidth" name="innerWidth" type="number" value={form.innerWidth} onChange={handleChange} className="mt-1" placeholder="W" />
                </div>
                <div>
                  <Label htmlFor="innerHeight" className="text-xs">Height</Label>
                  <Input id="innerHeight" name="innerHeight" type="number" value={form.innerHeight} onChange={handleChange} className="mt-1" placeholder="H" />
                </div>
                <div>
                  <Label htmlFor="innerDepth" className="text-xs">Depth</Label>
                  <Input id="innerDepth" name="innerDepth" type="number" value={form.innerDepth} onChange={handleChange} className="mt-1" placeholder="D" />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="specNotes">Specification Notes</Label>
              <Textarea id="specNotes" name="specNotes" value={form.specNotes} onChange={handleChange} className="mt-1" rows={3} placeholder="Any special requirements, custom specifications..." />
            </div>
          </CardContent>
        </Card>

        {/* Logistics & Commercial */}
        <Card>
          <CardHeader><CardTitle className="text-base">Logistics & Commercial</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="freightPaidBy">Freight Paid By</Label>
              <select id="freightPaidBy" name="freightPaidBy" value={form.freightPaidBy} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select</option>
                <option value="customer">Customer</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div>
              <Label htmlFor="installationType">Installation Type</Label>
              <select id="installationType" name="installationType" value={form.installationType} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="online">Online Guidance</option>
                <option value="onsite">On-site Installation</option>
              </select>
            </div>
            <div>
              <Label htmlFor="quotedAmount">Quoted Amount (INR)</Label>
              <Input id="quotedAmount" name="quotedAmount" type="number" value={form.quotedAmount} onChange={handleChange} className="mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="gstRate">GST Rate (%)</Label>
              <select id="gstRate" name="gstRate" value={form.gstRate} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="18">18%</option>
                <option value="12">12%</option>
                <option value="5">5%</option>
                <option value="0">0%</option>
              </select>
            </div>
            <div>
              <Label htmlFor="expectedDispatch">Expected Dispatch Date</Label>
              <Input id="expectedDispatch" name="expectedDispatch" type="date" value={form.expectedDispatch} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="heatScore">Heat Score</Label>
              <select id="heatScore" name="heatScore" value={form.heatScore} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="hot">Hot (High intent)</option>
                <option value="warm">Warm (Considering)</option>
                <option value="cold">Cold (Early stage)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="assignedToId">Assigned To</Label>
              <select id="assignedToId" name="assignedToId" value={form.assignedToId} onChange={handleChange} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/deals">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create Deal'}
          </Button>
        </div>
      </form>
    </div>
  )
}
