'use client'
import { useEffect, useState } from 'react'
import { Package, Plus, AlertTriangle, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

const CATEGORIES: Record<string, string> = { raw_material: 'Raw Material', hardware: 'Hardware', electrical: 'Electrical', other: 'Other' }

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ itemName: '', category: 'raw_material', quantity: '', unit: 'units', threshold: '', unitCost: '', supplier: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchItems = async () => {
    const res = await fetch('/api/inventory')
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { fetchItems() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const body: any = { ...form }
    if (body.quantity) body.quantity = parseFloat(body.quantity)
    if (body.threshold) body.threshold = parseFloat(body.threshold)
    if (body.unitCost) body.unitCost = parseFloat(body.unitCost); else delete body.unitCost
    if (!body.supplier) delete body.supplier
    if (!body.notes) delete body.notes
    const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { setOpen(false); setForm({ itemName: '', category: 'raw_material', quantity: '', unit: 'units', threshold: '', unitCost: '', supplier: '', notes: '' }); await fetchItems() }
    setSaving(false)
  }

  const filtered = items.filter(i => !search || i.itemName.toLowerCase().includes(search.toLowerCase()) || i.category.includes(search.toLowerCase()))
  const lowStockCount = items.filter(i => i.quantity <= i.threshold).length
  const grouped = filtered.reduce((acc, item) => { if (!acc[item.category]) acc[item.category] = []; acc[item.category].push(item); return acc }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Inventory</h1><p className="text-gray-500 mt-1">{items.length} items{lowStockCount > 0 && <> · <span className="text-red-600">{lowStockCount} low stock</span></>}</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Add Item</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Item Name *</Label><Input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} required className="mt-1" placeholder="MS Sheet 2mm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><Label>Unit</Label><select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="mt-1 w-full h-9 px-3 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="units">Units</option><option value="kg">KG</option><option value="meters">Meters</option><option value="liters">Liters</option><option value="sheets">Sheets</option><option value="pieces">Pieces</option><option value="rolls">Rolls</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required className="mt-1" /></div>
                <div><Label>Low Stock Threshold</Label><Input type="number" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Unit Cost (INR)</Label><Input type="number" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} className="mt-1" /></div>
                <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Item'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {lowStockCount > 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-sm text-amber-700">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} below threshold level</span></div>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading inventory...</div> :
        filtered.length === 0 ? <div className="text-center py-12"><Package className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No items found</p></div> :
        (Object.entries(grouped) as [string, any[]][]).map(([category, categoryItems]) => (
          <Card key={category}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">{CATEGORIES[category] || category}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left pb-2 font-medium">Item</th><th className="text-right pb-2 font-medium">Qty</th><th className="text-right pb-2 font-medium">Threshold</th><th className="text-right pb-2 font-medium">Unit Cost</th><th className="text-left pb-2 font-medium pl-3">Supplier</th><th className="text-left pb-2 font-medium pl-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">{categoryItems.map((item: any) => {
                    const isLow = item.quantity <= item.threshold
                    return (
                      <tr key={item.id} className={isLow ? 'bg-red-50/50' : ''}>
                        <td className="py-2 font-medium text-gray-900">{item.itemName}</td>
                        <td className={`py-2 text-right ${isLow ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{item.quantity} {item.unit}</td>
                        <td className="py-2 text-right text-gray-400">{item.threshold} {item.unit}</td>
                        <td className="py-2 text-right text-gray-600">{item.unitCost ? formatCurrency(item.unitCost) : '—'}</td>
                        <td className="py-2 pl-3 text-gray-500">{item.supplier || '—'}</td>
                        <td className="py-2 pl-3">{isLow ? <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3 h-3" /> Low</span> : <span className="text-xs text-green-600">OK</span>}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      }
    </div>
  )
}
