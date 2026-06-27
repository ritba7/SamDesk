'use client'
import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import {
  MATERIALS, CONFIGS, MaterialKey, ConfigKey,
  suggestModel, sizeOptionsFor,
} from '@/lib/airShowerModels'

interface Props {
  material: string
  config: string
  requiredDepth: string   // mm (walk-through length) for straight/SR/SL
  requiredWidth: string   // mm for RE/LE/RL
  sizeCode: string        // explicit size override
  onChange: (patch: Record<string, string>) => void
}

const inputCls = 'w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function ModelSelector({ material, config, requiredDepth, requiredWidth, sizeCode, onChange }: Props) {
  const mat = (material || 'ms') as MaterialKey
  const cfg = (config || 'straight') as ConfigKey
  const growsByWidth = cfg === 'RE' || cfg === 'LE' || cfg === 'RL'

  const sizes = useMemo(() => sizeOptionsFor(mat, cfg), [mat, cfg])

  const suggestion = useMemo(() => {
    return suggestModel({
      material: mat,
      config: cfg,
      requiredInnerDepth: requiredDepth ? Number(requiredDepth) : undefined,
      requiredInnerWidth: requiredWidth ? Number(requiredWidth) : undefined,
    })
  }, [mat, cfg, requiredDepth, requiredWidth])

  // The effective chosen size: explicit sizeCode override, else suggestion
  const chosen = useMemo(() => {
    if (sizeCode) {
      const s = sizes.find(x => x.code === sizeCode)
      if (s) return { model: null as string | null, dims: s }
    }
    return suggestion.result ? { model: suggestion.result.model, dims: { code: suggestion.result.sizeCode, innerDims: suggestion.result.innerDims, outerDims: suggestion.result.outerDims } } : null
  }, [sizeCode, sizes, suggestion])

  // Apply the chosen model to the parent form
  const applyModel = () => {
    if (!suggestion.result) return
    const r = suggestion.result
    onChange({
      modelNumber: r.model,
      airShowerConfig: r.config,
      material: r.material,
      innerWidth: String(r.innerDims.w),
      innerDepth: String(r.innerDims.d),
      innerHeight: String(r.innerDims.h),
      outerWidth: String(r.outerDims.w),
      outerDepth: String(r.outerDims.d),
      outerHeight: String(r.outerDims.h),
      sizeCode: r.sizeCode,
    })
  }

  const applySize = (code: string) => {
    const s = sizes.find(x => x.code === code)
    if (!s) return
    const model = suggestModel({ material: mat, config: cfg, requiredInnerDepth: growsByWidth ? undefined : s.innerDims.d, requiredInnerWidth: growsByWidth ? s.innerDims.w : undefined })
    onChange({
      sizeCode: code,
      modelNumber: model.result?.model || '',
      airShowerConfig: cfg,
      material: mat,
      innerWidth: String(s.innerDims.w), innerDepth: String(s.innerDims.d), innerHeight: String(s.innerDims.h),
      outerWidth: String(s.outerDims.w), outerDepth: String(s.outerDims.d), outerHeight: String(s.outerDims.h),
    })
  }

  return (
    <div className="border border-blue-100 bg-blue-50/40 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-800">Model Selector</h3>
        <span className="text-xs text-gray-400">Auto-suggests model from your requirements</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Material of Construction</label>
          <select value={mat} onChange={e => onChange({ material: e.target.value, sizeCode: '', modelNumber: '' })} className={inputCls}>
            {MATERIALS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Entry / Exit Configuration</label>
          <select value={cfg} onChange={e => onChange({ airShowerConfig: e.target.value, sizeCode: '', modelNumber: '' })} className={inputCls}>
            {CONFIGS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-500">{CONFIGS.find(c => c.key === cfg)?.desc}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            Required internal {growsByWidth ? 'width' : 'depth'} (mm)
          </label>
          <input
            type="number"
            value={growsByWidth ? requiredWidth : requiredDepth}
            onChange={e => onChange(growsByWidth ? { requiredWidth: e.target.value } : { requiredDepth: e.target.value })}
            className={inputCls}
            placeholder={growsByWidth ? 'e.g. 1750' : 'e.g. 1380 (walk-through length)'}
          />
        </div>
        <div>
          <label className={labelCls}>Or pick size directly</label>
          <select value={sizeCode} onChange={e => applySize(e.target.value)} className={inputCls}>
            <option value="">Auto (from requirement)</option>
            {sizes.map(s => (
              <option key={s.code} value={s.code}>
                {s.code} — ID {s.innerDims.w}×{s.innerDims.d}×{s.innerDims.h}mm
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggestion result */}
      {suggestion.result ? (
        <div className="bg-white border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-500">Suggested Model</p>
              <p className="text-lg font-bold text-green-700 font-mono">{suggestion.result.model}</p>
            </div>
            <button type="button" onClick={applyModel} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              Use this model
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Internal (W×D×H): <span className="font-medium">{suggestion.result.innerDims.w}×{suggestion.result.innerDims.d}×{suggestion.result.innerDims.h} mm</span></div>
            <div>Overall (W×D×H): <span className="font-medium">{suggestion.result.outerDims.w}×{suggestion.result.outerDims.d}×{suggestion.result.outerDims.h} mm</span></div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{suggestion.note}</p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">{suggestion.note}</div>
      )}
    </div>
  )
}
