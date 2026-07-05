'use client'
import { useMemo, useState } from 'react'
import { Sparkles, PenLine } from 'lucide-react'
import {
  MATERIALS, CONFIGS, MaterialKey, ConfigKey,
  suggestModel, sizeOptionsFor, buildModelName,
} from '@/lib/airShowerModels'

interface Props {
  material: string
  config: string
  requiredDepth: string   // mm (walk-through length) for straight/SR/SL
  requiredWidth: string   // mm for RE/LE/RL
  sizeCode: string        // explicit size override
  // Current dimension / model values from the parent form (for manual mode)
  innerWidth?: string
  innerHeight?: string
  innerDepth?: string
  outerWidth?: string
  outerHeight?: string
  outerDepth?: string
  modelNumber?: string
  onChange: (patch: Record<string, string>) => void
}

const inputCls = 'w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function ModelSelector({
  material, config, requiredDepth, requiredWidth, sizeCode,
  innerWidth = '', innerHeight = '', innerDepth = '',
  outerWidth = '', outerHeight = '', outerDepth = '',
  modelNumber = '',
  onChange,
}: Props) {
  const mat = (material || 'ms') as MaterialKey
  const cfg = (config || 'straight') as ConfigKey
  const growsByWidth = cfg === 'RE' || cfg === 'LE' || cfg === 'RL'
  const [manualMode, setManualMode] = useState(false)

  const sizes = useMemo(() => sizeOptionsFor(mat, cfg), [mat, cfg])

  // Suggestion respects an explicitly chosen sizeCode; otherwise derives from
  // the required-dimension calculation.
  const suggestion = useMemo(() => {
    if (sizeCode) {
      const s = sizes.find(x => x.code === sizeCode)
      if (s) {
        const model = buildModelName(mat, cfg, s.code)
        if (model) {
          return {
            result: { model, material: mat, config: cfg, sizeCode: s.code, innerDims: s.innerDims, outerDims: s.outerDims },
            note: `Explicitly selected size ${s.code}.`,
          }
        }
      }
    }
    return suggestModel({
      material: mat,
      config: cfg,
      requiredInnerDepth: requiredDepth ? Number(requiredDepth) : undefined,
      requiredInnerWidth: requiredWidth ? Number(requiredWidth) : undefined,
    })
  }, [mat, cfg, requiredDepth, requiredWidth, sizeCode, sizes])

  // Apply the chosen model to the parent form
  const applyModel = () => {
    if (!suggestion.result || manualMode) return
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
    if (!code) { onChange({ sizeCode: '' }); return }
    const s = sizes.find(x => x.code === code)
    if (!s) return
    const model = buildModelName(mat, cfg, code)
    const patch: Record<string, string> = { sizeCode: code, airShowerConfig: cfg, material: mat }
    if (!manualMode) {
      patch.modelNumber = model || ''
      patch.innerWidth = String(s.innerDims.w); patch.innerDepth = String(s.innerDims.d); patch.innerHeight = String(s.innerDims.h)
      patch.outerWidth = String(s.outerDims.w); patch.outerDepth = String(s.outerDims.d); patch.outerHeight = String(s.outerDims.h)
    }
    onChange(patch)
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
          <select value={mat} onChange={e => onChange({ material: e.target.value, sizeCode: '', ...(manualMode ? {} : { modelNumber: '' }) })} className={inputCls}>
            {MATERIALS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Entry / Exit Configuration</label>
          <select value={cfg} onChange={e => onChange({ airShowerConfig: e.target.value, sizeCode: '', ...(manualMode ? {} : { modelNumber: '' }) })} className={inputCls}>
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
            {!manualMode && (
              <button type="button" onClick={applyModel} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                Use this model
              </button>
            )}
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

      {/* Manual dimensions toggle */}
      <div className="border-t border-blue-100 pt-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={manualMode}
            onChange={e => setManualMode(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <PenLine className="w-3.5 h-3.5 text-gray-500" />
          Manual dimensions (enter custom sizes — the selector will not overwrite them)
        </label>

        {manualMode && (
          <div className="mt-3 space-y-3">
            <div>
              <label className={labelCls}>Inner Dimensions (mm) — W × H × D</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={innerWidth} onChange={e => onChange({ innerWidth: e.target.value })} className={inputCls} placeholder="Width" />
                <input type="number" value={innerHeight} onChange={e => onChange({ innerHeight: e.target.value })} className={inputCls} placeholder="Height" />
                <input type="number" value={innerDepth} onChange={e => onChange({ innerDepth: e.target.value })} className={inputCls} placeholder="Depth" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Outer Dimensions (mm) — W × H × D</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={outerWidth} onChange={e => onChange({ outerWidth: e.target.value })} className={inputCls} placeholder="Width" />
                <input type="number" value={outerHeight} onChange={e => onChange({ outerHeight: e.target.value })} className={inputCls} placeholder="Height" />
                <input type="number" value={outerDepth} onChange={e => onChange({ outerDepth: e.target.value })} className={inputCls} placeholder="Depth" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Model number (manual)</label>
              <input type="text" value={modelNumber} onChange={e => onChange({ modelNumber: e.target.value })} className={inputCls} placeholder="e.g. Custom-AS-01" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
