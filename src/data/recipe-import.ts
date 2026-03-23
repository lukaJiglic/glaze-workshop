// ─── Import parsers for Glazy JSON and Digital Fire formats ────────────────────
// Maps external material names to internal materialId keys.
// Unmatched materials are flagged for manual review.

import type { Ingredient, CustomRecipe } from '@/types'
import { materialAnalyses } from '@/data/material-analyses'

// ── Material name → internal materialId mapping ────────────────────────────────
// This map handles common aliases from Glazy, Digital Fire, and Insight exports.
// Keys are lowercased and trimmed before lookup.
const MATERIAL_ALIASES: Record<string, string> = {
  // Silica / Quartz
  'silica': 'silica', 'quartz': 'silica', 'flint': 'silica', 'sio2': 'silica',

  // Kaolins
  'kaolin': 'kaolin', 'china clay': 'kaolin',
  'epk': 'epk-kaolin', 'edgar plastic kaolin': 'epk-kaolin', 'ep kaolin': 'epk-kaolin',
  'grolleg': 'grolleg-kaolin', 'grolleg kaolin': 'grolleg-kaolin',
  'calcined kaolin': 'calcined-kaolin', 'glomax': 'calcined-kaolin', 'glomax ll': 'calcined-kaolin',
  'ball clay': 'ball-clay', 'om4': 'ball-clay', 'om4 ball clay': 'ball-clay', 'om-4': 'ball-clay',
  'bentonite': 'bentonite',

  // Feldspars
  'potash feldspar': 'potash-feldspar', 'k-feldspar': 'potash-feldspar', 'orthoclase': 'potash-feldspar',
  'custer feldspar': 'custer-feldspar', 'custer': 'custer-feldspar',
  'g200 feldspar': 'g200-feldspar', 'g-200': 'g200-feldspar', 'g200 hp': 'g200-feldspar', 'g-200 hp': 'g200-feldspar',
  'soda feldspar': 'soda-feldspar', 'minspar': 'soda-feldspar', 'minspar 200': 'soda-feldspar',
  'kona f-4': 'soda-feldspar', 'kona f4': 'soda-feldspar',
  'nepheline syenite': 'nepheline-syenite', 'neph sy': 'nepheline-syenite', 'neph. sy.': 'nepheline-syenite',
  'cornwall stone': 'cornwall-stone', 'cornish stone': 'cornwall-stone',

  // Calcium / Earth fluxes
  'whiting': 'whiting', 'calcium carbonate': 'whiting', 'caco3': 'whiting',
  'wollastonite': 'wollastonite',
  'dolomite': 'dolomite',
  'talc': 'talc',
  'strontium carbonate': 'strontium-carbonate', 'srco3': 'strontium-carbonate',
  'barium carbonate': 'barium-carbonate', 'baco3': 'barium-carbonate',
  'bone ash': 'bone-ash', 'tri-calcium phosphate': 'bone-ash',

  // Boron / Zinc
  'zinc oxide': 'zinc-oxide', 'zno': 'zinc-oxide',
  'gerstley borate': 'gerstley-borate', 'gb': 'gerstley-borate',
  'colemanite': 'colemanite',

  // Frits
  'frit 3134': 'ferro-frit-3134', 'ferro frit 3134': 'ferro-frit-3134', 'f-3134': 'ferro-frit-3134',
  'frit 3124': 'ferro-frit-3124', 'ferro frit 3124': 'ferro-frit-3124', 'f-3124': 'ferro-frit-3124',
  'frit 3195': 'ferro-frit-3195', 'ferro frit 3195': 'ferro-frit-3195', 'f-3195': 'ferro-frit-3195',
  'frit 3110': 'ferro-frit-3110', 'ferro frit 3110': 'ferro-frit-3110', 'f-3110': 'ferro-frit-3110',
  'frit 3249': 'ferro-frit-3249', 'ferro frit 3249': 'ferro-frit-3249', 'f-3249': 'ferro-frit-3249',
  'frit 4110': 'ferro-frit-4110', 'ferro frit 4110': 'ferro-frit-4110', 'f-4110': 'ferro-frit-4110',
  'frit 3107': 'ferro-frit-3107', 'ferro frit 3107': 'ferro-frit-3107', 'f-3107': 'ferro-frit-3107',

  // Lithium
  'spodumene': 'spodumene',
  'lithium carbonate': 'lithium-carbonate', 'li2co3': 'lithium-carbonate',

  // Slips
  'alberta slip': 'alberta-slip',
  'alberta slip (calcined)': 'alberta-slip-roasted', 'alberta slip calcined': 'alberta-slip-roasted',
  'ravenscrag slip': 'ravenscrag-slip',
  'barnard clay': 'barnard-clay', 'barnard slip': 'barnard-clay', 'blackbird clay': 'barnard-clay',

  // Ash / Soda
  'wood ash': 'wood-ash', 'mixed wood ash': 'wood-ash', 'hardwood ash': 'wood-ash',
  'soda ash': 'soda-ash', 'sodium carbonate': 'soda-ash', 'na2co3': 'soda-ash',

  // Opacifiers
  'tin oxide': 'tin-oxide', 'sno2': 'tin-oxide',
  'zircopax': 'zirconium-silicate', 'zirconium silicate': 'zirconium-silicate', 'opax': 'zirconium-silicate',
  'titanium dioxide': 'titanium-dioxide', 'tio2': 'titanium-dioxide',
  'rutile': 'rutile',

  // Iron colorants
  'red iron oxide': 'red-iron-oxide', 'rio': 'red-iron-oxide', 'fe2o3': 'red-iron-oxide', 'iron oxide': 'red-iron-oxide',
  'yellow iron oxide': 'yellow-iron-oxide', 'yellow ochre': 'yellow-iron-oxide',
  'black iron oxide': 'black-iron-oxide',
  'ilmenite': 'ilmenite',

  // Other colorants
  'cobalt carbonate': 'cobalt-carbonate',
  'cobalt oxide': 'cobalt-oxide',
  'copper carbonate': 'copper-carbonate',
  'copper oxide': 'copper-oxide', 'black copper oxide': 'black-copper-oxide',
  'manganese dioxide': 'manganese-dioxide', 'mno2': 'manganese-dioxide',
  'manganese carbonate': 'manganese-carbonate',
  'chrome oxide': 'chrome-oxide', 'chromium oxide': 'chrome-oxide', 'cr2o3': 'chrome-oxide',
  'nickel oxide': 'nickel-oxide', 'nio': 'nickel-oxide',

  // Misc
  'red lead': 'red-lead', 'minium': 'red-lead',
  'epsom salt': 'epsom-salt', 'epsom salts': 'epsom-salt',
  'cmc': 'cmc-gum', 'cmc gum': 'cmc-gum',
  'mason stain': 'mason-stain-generic',
  'calcined alumina': 'calcined-alumina',
}

export interface ImportResult {
  recipe: CustomRecipe
  unmappedMaterials: string[]
  warnings: string[]
}

function resolveMaterialId(name: string): { materialId: string; matched: boolean } {
  const key = name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')

  // Direct alias match
  if (MATERIAL_ALIASES[key]) {
    return { materialId: MATERIAL_ALIASES[key], matched: true }
  }

  // Try kebab-case version
  const kebab = key.replace(/\s+/g, '-')
  if (materialAnalyses.has(kebab)) {
    return { materialId: kebab, matched: true }
  }

  // Partial match — find any alias that contains the search term
  for (const [alias, id] of Object.entries(MATERIAL_ALIASES)) {
    if (alias.includes(key) || key.includes(alias)) {
      return { materialId: id, matched: true }
    }
  }

  return { materialId: kebab, matched: false }
}

// ── Glazy JSON format ──────────────────────────────────────────────────────────
// Glazy exports recipes as JSON with structure:
// { name, cone, atmospheres, materials: [{ name, amount }], ... }
interface GlazyMaterial {
  name?: string
  material_name?: string
  percentageAmount?: number
  amount?: number
}

interface GlazyRecipe {
  name?: string
  title?: string
  cone?: string | number
  from_orton_cone?: string | number
  to_orton_cone?: string | number
  atmospheres?: string[]
  atmosphere?: string
  surface_type?: string
  materials?: GlazyMaterial[]
  components?: GlazyMaterial[]
  description?: string
  notes?: string
}

function inferFiringRange(cone: string): string {
  const num = parseFloat(cone)
  if (isNaN(num)) return ''
  if (num >= 8) return 'high-fire'
  if (num >= 4) return 'mid-fire'
  if (num >= 0) return 'low-fire'
  return 'low-fire'
}

function inferAtmospheres(atmo: string | string[] | undefined): string[] {
  if (!atmo) return []
  const list = Array.isArray(atmo) ? atmo : [atmo]
  const result: string[] = []
  for (const a of list) {
    const lower = a.toLowerCase()
    if (lower.includes('oxidation') || lower.includes('ox')) result.push('oxidation')
    if (lower.includes('reduction') || lower.includes('red')) result.push('reduction')
    if (lower.includes('neutral')) result.push('neutral')
  }
  return [...new Set(result)]
}

function inferSurfaces(surface: string | undefined): string[] {
  if (!surface) return []
  const lower = surface.toLowerCase()
  const result: string[] = []
  if (lower.includes('matte') || lower.includes('mat')) result.push('matte')
  if (lower.includes('satin')) result.push('satin')
  if (lower.includes('gloss')) result.push('glossy')
  if (lower.includes('semi')) result.push('satin')
  return [...new Set(result)]
}

export function importGlazyJSON(json: string): ImportResult | null {
  try {
    const data = JSON.parse(json) as GlazyRecipe
    if (!data) return null

    const name = data.name || data.title || 'Imported Glazy Recipe'
    const cone = String(data.cone ?? data.from_orton_cone ?? data.to_orton_cone ?? '6')
    const materials = data.materials || data.components || []

    if (!materials.length) return null

    const ingredients: Ingredient[] = []
    const unmappedMaterials: string[] = []
    const warnings: string[] = []

    for (const mat of materials) {
      const matName = mat.name || mat.material_name || ''
      const amount = mat.percentageAmount ?? mat.amount ?? 0
      if (!matName || !amount) continue

      const { materialId, matched } = resolveMaterialId(matName)
      if (!matched) unmappedMaterials.push(matName)

      ingredients.push({
        materialId,
        sourceLabel: matName,
        amount: Number(amount),
      })
    }

    if (!ingredients.length) return null

    // Normalize amounts to sum to ~100 if they don't already
    const sum = ingredients.reduce((s, i) => s + i.amount, 0)
    if (sum > 0 && (sum < 90 || sum > 110)) {
      warnings.push(`Ingredient sum is ${sum.toFixed(1)}% — normalized to 100%`)
      const factor = 100 / sum
      for (const ing of ingredients) {
        ing.amount = Number((ing.amount * factor).toFixed(2))
      }
    }

    const atmosphereIds = inferAtmospheres(data.atmospheres ?? data.atmosphere)
    const surfaceIds = inferSurfaces(data.surface_type)

    const now = new Date().toISOString()
    const recipe: CustomRecipe = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      firingRangeId: inferFiringRange(cone),
      cone,
      atmosphereIds,
      surfaceIds,
      colourIds: [],
      ingredients,
      notes: [
        'Imported from Glazy format',
        ...(data.description ? [data.description] : []),
        ...(data.notes ? [data.notes] : []),
      ],
      createdAt: now,
      updatedAt: now,
    }

    if (unmappedMaterials.length) {
      warnings.push(`${unmappedMaterials.length} material(s) not auto-mapped: ${unmappedMaterials.join(', ')}`)
    }

    return { recipe, unmappedMaterials, warnings }
  } catch {
    return null
  }
}

// ── Digital Fire / Insight XML-ish format ─────────────────────────────────────
// Digital Fire exports a text format with lines like:
// Silica       30.00
// Kaolin       20.00
// ...
// Also handle their JSON export variant.
interface DigitalFireRecipe {
  name?: string
  title?: string
  code?: string
  cone?: string | number
  firing?: string
  materials?: Array<{ name: string; amount: number }>
  ingredients?: Array<{ name: string; percent: number }>
}

export function importDigitalFireJSON(json: string): ImportResult | null {
  try {
    const data = JSON.parse(json) as DigitalFireRecipe
    if (!data) return null

    const name = data.name || data.title || data.code || 'Imported Digital Fire Recipe'
    const cone = String(data.cone ?? '6')
    const rawMaterials = data.materials || data.ingredients || []

    if (!rawMaterials.length) return null

    const ingredients: Ingredient[] = []
    const unmappedMaterials: string[] = []
    const warnings: string[] = []

    for (const mat of rawMaterials) {
      const matName = mat.name || ''
      const amount = (mat as any).amount ?? (mat as any).percent ?? 0
      if (!matName || !amount) continue

      const { materialId, matched } = resolveMaterialId(matName)
      if (!matched) unmappedMaterials.push(matName)

      ingredients.push({
        materialId,
        sourceLabel: matName,
        amount: Number(amount),
      })
    }

    if (!ingredients.length) return null

    const atmosphereIds = inferAtmospheres(data.firing)

    const now = new Date().toISOString()
    const recipe: CustomRecipe = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      firingRangeId: inferFiringRange(cone),
      cone,
      atmosphereIds,
      surfaceIds: [],
      colourIds: [],
      ingredients,
      notes: ['Imported from Digital Fire format'],
      createdAt: now,
      updatedAt: now,
    }

    if (unmappedMaterials.length) {
      warnings.push(`${unmappedMaterials.length} material(s) not auto-mapped: ${unmappedMaterials.join(', ')}`)
    }

    return { recipe, unmappedMaterials, warnings }
  } catch {
    return null
  }
}

// ── Plain text recipe format ─────────────────────────────────────────────────
// Handles simple "Material  Amount" line format:
// Silica       30.00
// EPK          20.00
export function importPlainTextRecipe(text: string, recipeName?: string): ImportResult | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('/'))
  const ingredients: Ingredient[] = []
  const unmappedMaterials: string[] = []
  const warnings: string[] = []

  for (const line of lines) {
    // Match "Material Name   30.00" or "Material Name, 30.00" or "Material Name: 30.00"
    const match = line.match(/^(.+?)\s*[,:\t]\s*([\d.]+)\s*%?\s*$/)
    if (!match) continue

    const matName = match[1].trim()
    const amount = parseFloat(match[2])
    if (!matName || isNaN(amount) || amount <= 0) continue

    const { materialId, matched } = resolveMaterialId(matName)
    if (!matched) unmappedMaterials.push(matName)

    ingredients.push({
      materialId,
      sourceLabel: matName,
      amount,
    })
  }

  if (!ingredients.length) return null

  const now = new Date().toISOString()
  const recipe: CustomRecipe = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: recipeName || 'Imported Recipe',
    firingRangeId: '',
    cone: '6',
    atmosphereIds: [],
    surfaceIds: [],
    colourIds: [],
    ingredients,
    notes: ['Imported from plain text format'],
    createdAt: now,
    updatedAt: now,
  }

  if (unmappedMaterials.length) {
    warnings.push(`${unmappedMaterials.length} material(s) not auto-mapped: ${unmappedMaterials.join(', ')}`)
  }

  return { recipe, unmappedMaterials, warnings }
}

// ── Auto-detect format and import ────────────────────────────────────────────
export function autoImportRecipe(content: string, filename?: string): ImportResult | null {
  const trimmed = content.trim()

  // Try JSON formats first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Try Glazy format
    const glazyResult = importGlazyJSON(trimmed)
    if (glazyResult) return glazyResult

    // Try Digital Fire format
    const dfResult = importDigitalFireJSON(trimmed)
    if (dfResult) return dfResult
  }

  // Try plain text format
  const name = filename?.replace(/\.[^.]+$/, '') || undefined
  return importPlainTextRecipe(trimmed, name)
}
