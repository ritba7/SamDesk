'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Download, Save, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WO_TEMPLATE, WoField } from '@/lib/woTemplate'
import { generateWorkOrder } from '@/lib/generateWorkOrder'

function autoFillFromDeal(field: WoField, deal: any): any {
  if (!field.autoFrom || !deal) return undefined
  switch (field.autoFrom) {
    case 'modelNumber': return deal.modelNumber || ''
    case 'inner': return { w: deal.innerWidth ?? '', d: deal.innerDepth ?? '', h: deal.innerHeight ?? '' }
    case 'outer': return { w: deal.outerWidth ?? '', d: deal.outerDepth ?? '', h: deal.outerHeight ?? '' }
    case 'customerCompany': return deal.customerCompany || ''
    case 'customerAddress': return deal.customerAddress || ''
    case 'customerName': return deal.customerName || ''
    case 'customerPhone': return deal.customerPhone || ''
    case 'customerEmail': return deal.customerEmail || ''
    default: return undefined
  }
}

export default function WorkOrderDetailPage() {
  const { id } = useParams()
  const { data: session } = useSession()
  const [wo, setWo] = useState<any>(null)
  const [filled, setFilled] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const role = (session?.user as any)?.role
  const canProduction = ['manufacturing', 'director'].includes(role)
  const canAccounts = ['accounts', 'director'].includes(role)

  const canEditField = (field: WoField) => {
    const isAccounts = field.filledBy === 'accounts'
    return isAccounts ? canAccounts : canProduction
  }

  useEffect(() => {
    fetch(`/api/workorders/${id}`).then(r => r.ok ? r.json() : null).then((data) => {
      if (data) {
        setWo(data)
        let existing: Record<string, any> = {}
        try { existing = JSON.parse(data.filledData || '{}') } catch { existing = {} }
        // Pre-fill autoFrom fields for anything not already filled
        const init: Record<string, any> = { ...existing }
        WO_TEMPLATE.forEach(sec => sec.fields.forEach(f => {
          if (init[f.key] === undefined || init[f.key] === '') {
            const auto = autoFillFromDeal(f, data.deal)
            if (auto !== undefined) init[f.key] = auto
          }
        }))
        setFilled(init)
      }
      setLoading(false)
    })
  }, [id])

  const setField = (key: string, value: any) => {
    setFilled(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/workorders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filledData: filled }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading work order...</div>
  if (!wo) return <div className="text-center py-12 text-gray-400">Work order not found or access denied.</div>

  const anyEditable = canProduction || canAccounts

  const renderField = (field: WoField) => {
    const editable = canEditField(field)
    const value = filled[field.key]

    if (field.type === 'choice') {
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map(opt => {
            const active = value === opt
            return (
              <button
                key={opt}
                type="button"
                disabled={!editable}
                onClick={() => setField(field.key, active ? '' : opt)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'} ${!editable ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )
    }

    if (field.type === 'multi') {
      const arr: string[] = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map(opt => {
            const active = arr.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                disabled={!editable}
                onClick={() => setField(field.key, active ? arr.filter(a => a !== opt) : [...arr, opt])}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'} ${!editable ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {active ? '✓ ' : ''}{opt}
              </button>
            )
          })}
        </div>
      )
    }

    if (field.type === 'dims') {
      const dv = (value && typeof value === 'object') ? value : { w: '', d: '', h: '' }
      const setDim = (k: 'w' | 'd' | 'h', val: string) => setField(field.key, { ...dv, [k]: val })
      return (
        <div className="flex items-center gap-1.5">
          {(['w', 'd', 'h'] as const).map(k => (
            <input
              key={k}
              type="number"
              disabled={!editable}
              value={dv[k] ?? ''}
              onChange={e => setDim(k, e.target.value)}
              placeholder={k.toUpperCase()}
              className="w-16 h-8 px-2 text-xs rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            />
          ))}
        </div>
      )
    }

    // text / date
    return (
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        disabled={!editable}
        value={value ?? ''}
        onChange={e => setField(field.key, e.target.value)}
        className="w-full max-w-xs h-8 px-2 text-xs rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
      />
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/workorders"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">{wo.woNumber}</h1>
            <p className="text-sm text-gray-500">
              {wo.deal?.customerCompany}{wo.deal?.workCode ? ` · ${wo.deal.workCode}` : ''}{wo.deal?.modelNumber ? ` · ${wo.deal.modelNumber}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => generateWorkOrder(wo)}><Download className="w-4 h-4 mr-1" /> Print / PDF</Button>
          {anyEditable && (
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {!anyEditable && (
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" /> Read-only view. Your role cannot edit this work order.
        </div>
      )}

      {WO_TEMPLATE.map(section => {
        const isAccountsSection = section.fields.every(f => f.filledBy === 'accounts')
        return (
          <Card key={section.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {section.title}
                {isAccountsSection && <span className="text-xs font-normal bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Filled by Accounts</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {section.fields.map(field => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                      {field.label}
                      {field.filledBy === 'accounts' && !isAccountsSection && <span className="text-[10px] text-amber-600">(Accounts)</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
