// SAM PRODUCTS — Air Shower model catalog, nomenclature decoder, and suggestion engine.
// Derived from the official SAM Air Shower brochure (rev 19.11.2021).
//
// NOMENCLATURE
//   Prefix = Material:
//     S    = Mild Steel
//     SS   = Stainless Steel 202 grade
//     S3   = Stainless Steel 304 grade
//     S6   = Stainless Steel 316 grade
//     SM   = Mild Steel (outer skin) + SS 202 (inner skin)
//     S3M  = Mild Steel (outer skin) + SS 304 (inner skin)
//   Middle = Size code (≈ internal depth in cm for standard models).
//   Suffix = Entry/Exit configuration:
//     (none) = Straight entry, straight exit
//     RE = Straight entry, Right exit
//     LE = Straight entry, Left exit
//     SR = Straight entry, Straight & Right exit
//     SL = Straight entry, Straight & Left exit
//     RL = Straight entry, Right & Left exit
//   For specific (RE/LE/SR/SL/RL) models the MS+SS combos append a trailing "M".

export type MaterialKey = 'ms' | 'ss202' | 'ss304' | 'ss316' | 'ms_ss202' | 'ms_ss304'
export type ConfigKey = 'straight' | 'RE' | 'LE' | 'SR' | 'SL' | 'RL'

export const MATERIALS: { key: MaterialKey; label: string; short: string }[] = [
  { key: 'ms',       label: 'Mild Steel (Powder Coated)',        short: 'MS' },
  { key: 'ss202',    label: 'Stainless Steel 202 Grade',          short: 'SS202' },
  { key: 'ss304',    label: 'Stainless Steel 304 Grade',          short: 'SS304' },
  { key: 'ss316',    label: 'Stainless Steel 316 Grade',          short: 'SS316' },
  { key: 'ms_ss202', label: 'MS Outer + SS202 Inner',             short: 'MS+SS202' },
  { key: 'ms_ss304', label: 'MS Outer + SS304 Inner',             short: 'MS+SS304' },
]

export const CONFIGS: { key: ConfigKey; label: string; desc: string }[] = [
  { key: 'straight', label: 'Straight Entry → Straight Exit', desc: 'Standard pass-through. Most common.' },
  { key: 'RE',       label: 'Straight Entry → Right Exit',    desc: 'L-shaped, person turns right on exit.' },
  { key: 'LE',       label: 'Straight Entry → Left Exit',     desc: 'L-shaped, person turns left on exit.' },
  { key: 'SR',       label: 'Straight Entry → Straight & Right Exit', desc: 'Two exits: straight ahead and right.' },
  { key: 'SL',       label: 'Straight Entry → Straight & Left Exit',  desc: 'Two exits: straight ahead and left.' },
  { key: 'RL',       label: 'Straight Entry → Right & Left Exit',     desc: 'Two exits: right and left.' },
]

// Standard model prefixes (straight-straight).
const STD_PREFIX: Record<MaterialKey, string> = {
  ms: 'S', ss202: 'SS', ss304: 'S3', ss316: 'S6', ms_ss202: 'SM', ms_ss304: 'S3M',
}

// Specific-model prefixes (RE/LE/SR/SL/RL). Combos use base SS prefix + trailing "M".
const SPECIFIC_PREFIX: Record<MaterialKey, { prefix: string; suffixM: boolean } | null> = {
  ms: { prefix: 'S', suffixM: false },
  ss202: { prefix: 'SS', suffixM: false },
  ss304: { prefix: 'S3', suffixM: false },
  ss316: null, // SS316 only offered in standard models
  ms_ss202: { prefix: 'SS', suffixM: true },
  ms_ss304: { prefix: 'S3', suffixM: true },
}

export interface Dims { w: number; d: number; h: number }
export interface ModelResult {
  model: string
  material: MaterialKey
  config: ConfigKey
  sizeCode: string
  innerDims: Dims
  outerDims: Dims
}

// ---- Standard models: size code = internal depth / 10. Step of 35 (350mm). ----
// ID: W 800, H 1950. OD: W 1475, D = ID.d + 120, H 2150.
const STD_CODES: number[] = []
for (let c = 68; c <= 943; c += 35) STD_CODES.push(c)

export const STD_SIZES = STD_CODES.map(code => ({
  code: String(code),
  innerDims: { w: 800, d: code * 10, h: 1950 },
  outerDims: { w: 1475, d: code * 10 + 120, h: 2150 },
}))

// ---- Specific models: irregular, hardcoded from brochure ----
interface SpecRow { code: string; innerDims: Dims; outerDims: Dims }

const RE_LE_SIZES: SpecRow[] = [
  { code: '110', innerDims: { w: 950,  d: 950, h: 1950 }, outerDims: { w: 1475, d: 1100, h: 2150 } },
  { code: '190', innerDims: { w: 1750, d: 950, h: 1950 }, outerDims: { w: 1900, d: 1475, h: 2150 } },
  { code: '270', innerDims: { w: 2550, d: 950, h: 1950 }, outerDims: { w: 2700, d: 1475, h: 2150 } },
  { code: '300', innerDims: { w: 2785, d: 950, h: 1950 }, outerDims: { w: 3000, d: 1475, h: 2150 } },
]

const SR_SL_SIZES: SpecRow[] = [
  { code: '103', innerDims: { w: 800, d: 1030, h: 1950 }, outerDims: { w: 1475, d: 1150, h: 2150 } },
  { code: '138', innerDims: { w: 800, d: 1380, h: 1950 }, outerDims: { w: 1475, d: 1500, h: 2150 } },
  { code: '170', innerDims: { w: 800, d: 1730, h: 1950 }, outerDims: { w: 1475, d: 1850, h: 2150 } },
]

const RL_SIZES: SpecRow[] = [
  { code: '360', innerDims: { w: 3600, d: 800, h: 1950 }, outerDims: { w: 3900, d: 1525, h: 2150 } },
  { code: '460', innerDims: { w: 4600, d: 800, h: 1950 }, outerDims: { w: 4900, d: 1525, h: 2150 } },
  { code: '517', innerDims: { w: 5175, d: 950, h: 1950 }, outerDims: { w: 5900, d: 1675, h: 2150 } },
]

function specSizes(config: ConfigKey): SpecRow[] {
  switch (config) {
    case 'RE': case 'LE': return RE_LE_SIZES
    case 'SR': case 'SL': return SR_SL_SIZES
    case 'RL': return RL_SIZES
    default: return []
  }
}

// Build a model name from parts.
export function buildModelName(material: MaterialKey, config: ConfigKey, sizeCode: string): string | null {
  if (config === 'straight') {
    return `${STD_PREFIX[material]}${sizeCode}`
  }
  const sp = SPECIFIC_PREFIX[material]
  if (!sp) return null
  return `${sp.prefix}${sizeCode}${config}${sp.suffixM ? 'M' : ''}`
}

// List all valid size codes for a material+config (for dropdowns).
export function sizeOptionsFor(material: MaterialKey, config: ConfigKey): { code: string; innerDims: Dims; outerDims: Dims }[] {
  if (config === 'straight') return STD_SIZES
  if (!SPECIFIC_PREFIX[material]) return []
  return specSizes(config)
}

// Suggest the best model given desired material, config and a required internal depth (mm).
// Picks the smallest standard size whose internal depth >= required.
export function suggestModel(opts: {
  material: MaterialKey
  config: ConfigKey
  requiredInnerDepth?: number   // mm — the walk-through length
  requiredInnerWidth?: number   // mm — used for specific configs
}): { result: ModelResult | null; note: string } {
  const { material, config, requiredInnerDepth, requiredInnerWidth } = opts

  const sizes = sizeOptionsFor(material, config)
  if (sizes.length === 0) {
    return { result: null, note: `${material.toUpperCase()} is not available in this configuration. Try SS202, SS304 or MS.` }
  }

  // The sizing dimension differs: standard & SR/SL grow in depth; RE/LE/RL grow in width.
  const growsByWidth = config === 'RE' || config === 'LE' || config === 'RL'
  const required = growsByWidth ? requiredInnerWidth : requiredInnerDepth

  let chosen = sizes[sizes.length - 1]
  let exact = false
  if (required && required > 0) {
    const fit = sizes.find(s => (growsByWidth ? s.innerDims.w : s.innerDims.d) >= required)
    if (fit) { chosen = fit; exact = true }
  } else {
    chosen = sizes[0]
  }

  const model = buildModelName(material, config, chosen.code)
  if (!model) return { result: null, note: 'Could not build a model name for this combination.' }

  const dim = growsByWidth ? chosen.innerDims.w : chosen.innerDims.d
  const note = required && required > 0
    ? (exact
        ? `Smallest model fitting your ${growsByWidth ? 'width' : 'depth'} of ${required}mm (internal ${dim}mm).`
        : `Your requirement exceeds the largest standard size; suggesting the largest available (${dim}mm). For bigger, a tunnel may be needed — contact factory.`)
    : 'Smallest standard size shown. Enter required internal dimension to refine.'

  return {
    result: { model, material, config, sizeCode: chosen.code, innerDims: chosen.innerDims, outerDims: chosen.outerDims },
    note,
  }
}

// Decode an existing model name back into its parts (best-effort).
export function decodeModel(name: string): { material?: MaterialKey; config: ConfigKey; sizeCode?: string } | null {
  if (!name) return null
  const up = name.toUpperCase().trim()

  // Determine config suffix
  let config: ConfigKey = 'straight'
  let core = up
  const suffixMap: [string, ConfigKey][] = [['REM', 'RE'], ['LEM', 'LE'], ['SRM', 'SR'], ['SLM', 'SL'], ['RLM', 'RL'], ['RE', 'RE'], ['LE', 'LE'], ['SR', 'SR'], ['SL', 'SL'], ['RL', 'RL']]
  for (const [suf, cfg] of suffixMap) {
    if (core.endsWith(suf)) { config = cfg; core = core.slice(0, -suf.length); break }
  }

  // Determine material prefix (longest first)
  const prefixes: [string, MaterialKey][] = [['S3M', 'ms_ss304'], ['S6', 'ss316'], ['S3', 'ss304'], ['SM', 'ms_ss202'], ['SS', 'ss202'], ['S', 'ms']]
  let material: MaterialKey | undefined
  let sizeCode: string | undefined
  for (const [pre, mat] of prefixes) {
    if (core.startsWith(pre) && /\d/.test(core.slice(pre.length))) {
      material = mat
      sizeCode = core.slice(pre.length)
      break
    }
  }
  return { material, config, sizeCode }
}

// Air Shower selection inputs (from brochure page 18) — used to enrich the deal form.
export const APPLICATIONS = ['Pharma', 'Automobile', 'Electronics', 'Food', 'Bio-Medical', 'Life Sciences', 'Other']
export const ENTRY_TYPES = [
  { key: 'human', label: 'Human Only' },
  { key: 'human_trolley', label: 'Human & Trolley Movement' },
  { key: 'material', label: 'Material Movement' },
]
export const AIR_FLOW_TIMES = ['10', '15', '20', '30', '40', '60']
export const DOOR_TYPES = [
  { key: 'hinged', label: 'Hinged' },
  { key: 'manual_slide', label: 'Manual Slide' },
  { key: 'automatic_slide', label: 'Automatic Slide' },
  { key: 'high_speed', label: 'High Speed' },
  { key: 'pvc', label: 'PVC Strip Curtain' },
  { key: 'air_curtain', label: 'Air Curtain' },
]
export const DOOR_LEAVES = [
  { key: 'single', label: 'Single Leaf' },
  { key: 'double', label: 'Double Leaf' },
  { key: 'without', label: 'Without Door' },
]
export const FLOORING_TYPES = [
  { key: 'ss_sheet', label: 'SS Sheet Flooring' },
  { key: 'ms_pvc', label: 'MS Sheet + PVC' },
  { key: 'grated', label: 'Grated Flooring' },
  { key: 'shoe_sole_cleaner', label: 'Shoe Sole Cleaner' },
  { key: 'without', label: 'Without Flooring' },
  { key: 'antistatic', label: 'Antistatic Flooring' },
]
export const MOTOR_TYPES = [
  { key: 'ie2', label: 'IE2 (High Efficiency)' },
  { key: 'ie3', label: 'IE3 (Premium Efficiency)' },
  { key: 'flame_proof', label: 'Flame Proof' },
]

export const COMPANY_DOCS = [
  { key: 'brochure', label: 'Air Shower Brochure', path: '/docs/SAM-Air-Shower-Brochure.pdf' },
  { key: 'clients', label: 'Client List', path: '/docs/SAM-Products-Client-List.pdf' },
  { key: 'deck', label: 'Company Deck', path: '/docs/SAM-Products-Company-Deck.pdf' },
]
