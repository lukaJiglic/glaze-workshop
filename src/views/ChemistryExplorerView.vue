<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import { useRouter } from 'vue-router'
import { computeUMF } from '@/composables/useGlazeChemistry'
import {
  materialAnalyses,
  OXIDE_MW,
  OXIDE_GROUPS,
  OXIDE_LABELS,
  EXPANSION_FACTORS,
  UMF_TARGETS,
} from '@/data/material-analyses'
import type { Recipe, UMFResult, UMFBenchmarkProfile } from '@/types'
import GlossaryTip from '@/components/ui/GlossaryTip.vue'
import TagBadge from '@/components/ui/TagBadge.vue'

const store = useGlazeStore()
const workshop = useWorkshopStore()
const router = useRouter()

// ── Tab state ──────────────────────────────────────────────────────────
type Tab = 'landscape' | 'encyclopedia' | 'benchmarks' | 'breakdown' | 'compare' | 'blend'
const activeTab = ref<Tab>('encyclopedia')

// ── Pre-compute UMF for all recipes ──────────────────────────────────
const recipeChemistry = computed(() => {
  const map = new Map<string, UMFResult>()
  for (const r of store.recipes) {
    const umf = computeUMF(r.ingredients, r.firingRangeId)
    if (umf.isValid) map.set(r.id, umf)
  }
  return map
})

// ════════════════════════════════════════════════════════════════════════
// TAB 1: OXIDE LANDSCAPE — scatter plot of SiO₂ vs Al₂O₃
// ════════════════════════════════════════════════════════════════════════

type PlotMode = 'si-al' | 'flux-triangle' | 'expansion'
const plotMode = ref<PlotMode>('si-al')
const showTargets = ref(true)
const hoveredDot = ref<string | null>(null)
const selectedDot = ref<string | null>(null)

// SVG fill/stroke values — must be hex, mirrors --clay/--sage/--stone/--stone-light
const firingRangeColors: Record<string, string> = {
  'high-fire': '#c4532a',
  'mid-fire': '#7a8f6e',
  'low-fire': '#8b7355',
  'raku': '#b0977a',
}

const plotData = computed(() => {
  const points: {
    id: string
    name: string
    firingRangeId: string
    cone: string
    x: number
    y: number
    color: string
    umf: UMFResult
  }[] = []

  for (const r of store.recipes) {
    const umf = recipeChemistry.value.get(r.id)
    if (!umf) continue

    let x = 0, y = 0

    if (plotMode.value === 'si-al') {
      x = umf.totalSi
      y = umf.totalAl
    } else if (plotMode.value === 'flux-triangle') {
      const kna = umf.knaO
      const ca = umf.ro.find(e => e.id === 'cao')?.moles ?? 0
      const mg = umf.ro.find(e => e.id === 'mgo')?.moles ?? 0
      x = kna
      y = ca + mg
    } else {
      x = umf.expansionIndex
      y = umf.siToAl ?? 0
    }

    if (x === 0 && y === 0) continue

    points.push({
      id: r.id,
      name: r.name,
      firingRangeId: r.firingRangeId,
      cone: r.cone,
      x, y,
      color: firingRangeColors[r.firingRangeId] ?? '#8b7355',
      umf,
    })
  }
  return points
})

// SVG viewBox calculation
const plotBounds = computed(() => {
  if (!plotData.value.length) return { minX: 0, maxX: 5, minY: 0, maxY: 1 }
  const xs = plotData.value.map(p => p.x)
  const ys = plotData.value.map(p => p.y)
  const pad = 0.1
  return {
    minX: Math.max(0, Math.min(...xs) - pad),
    maxX: Math.max(...xs) + pad,
    minY: Math.max(0, Math.min(...ys) - pad),
    maxY: Math.max(...ys) + pad,
  }
})

function toSvgX(val: number): number {
  const { minX, maxX } = plotBounds.value
  return 60 + ((val - minX) / (maxX - minX)) * 700
}

function toSvgY(val: number): number {
  const { minY, maxY } = plotBounds.value
  return 390 - ((val - minY) / (maxY - minY)) * 360
}

const targetBoxes = computed(() => {
  if (plotMode.value !== 'si-al' || !showTargets.value) return []
  return Object.entries(UMF_TARGETS).map(([id, t]) => ({
    id,
    label: t.label,
    x1: toSvgX(t.sio2[0]),
    x2: toSvgX(t.sio2[1]),
    y1: toSvgY(t.al2o3[1]),
    y2: toSvgY(t.al2o3[0]),
    color: firingRangeColors[id] ?? '#8b7355',
  }))
})

const xAxisLabel = computed(() => {
  if (plotMode.value === 'si-al') return 'SiO2 (unity moles)'
  if (plotMode.value === 'flux-triangle') return 'KNaO (alkali flux)'
  return 'Expansion Index'
})

const yAxisLabel = computed(() => {
  if (plotMode.value === 'si-al') return 'Al2O3 (unity moles)'
  if (plotMode.value === 'flux-triangle') return 'CaO + MgO (earth flux)'
  return 'Si:Al Ratio'
})

// X-axis ticks
const xTicks = computed(() => {
  const { minX, maxX } = plotBounds.value
  const range = maxX - minX
  const step = range > 50 ? 10 : range > 10 ? 5 : range > 2 ? 0.5 : 0.2
  const ticks: number[] = []
  let v = Math.ceil(minX / step) * step
  while (v <= maxX) {
    ticks.push(v)
    v += step
  }
  return ticks
})

const yTicks = computed(() => {
  const { minY, maxY } = plotBounds.value
  const range = maxY - minY
  const step = range > 50 ? 10 : range > 10 ? 5 : range > 2 ? 0.5 : 0.1
  const ticks: number[] = []
  let v = Math.ceil(minY / step) * step
  while (v <= maxY) {
    ticks.push(v)
    v += step
  }
  return ticks
})

function handleDotClick(recipeId: string) {
  selectedDot.value = selectedDot.value === recipeId ? null : recipeId
}

function openRecipeInDrawer(recipeId: string) {
  const recipe = store.recipeById.get(recipeId)
  if (recipe) workshop.openRecipe(recipe)
}

function loadInCalculator(recipeId: string) {
  const recipe = store.recipeById.get(recipeId)
  if (recipe) {
    workshop.loadRecipeIntoCalculator(recipe)
    router.push('/calculator')
  }
}

const activeDot = computed(() => {
  const id = selectedDot.value || hoveredDot.value
  if (!id) return null
  return plotData.value.find(p => p.id === id) ?? null
})

// ════════════════════════════════════════════════════════════════════════
// TAB 2: OXIDE ENCYCLOPEDIA
// ════════════════════════════════════════════════════════════════════════

interface OxideInfo {
  id: string
  label: string
  name: string
  group: string
  groupLabel: string
  description: string
  effects: string[]
  increaseEffect: string
  decreaseEffect: string
  materials: { id: string; name: string; pct: number }[]
  expansionFactor: number | null
}

const oxideNames: Record<string, string> = {
  sio2: 'Silica', al2o3: 'Alumina', b2o3: 'Boria', cao: 'Calcia',
  mgo: 'Magnesia', k2o: 'Potash', na2o: 'Soda', li2o: 'Lithia',
  zno: 'Zinc Oxide', bao: 'Baria', sro: 'Strontia',
  fe2o3: 'Iron Oxide', tio2: 'Titania', coo: 'Cobalt Oxide',
  cuo: 'Copper Oxide', nio: 'Nickel Oxide', mno: 'Manganese Oxide',
  pbo: 'Lead Oxide', p2o5: 'Phosphorus Pentoxide', cr2o3: 'Chrome Oxide',
  zro2: 'Zirconia', sno2: 'Tin Oxide', mno2: 'Manganese Dioxide',
}

const oxideGroupLabels: Record<string, string> = {
  r2o: 'R₂O — Alkali Fluxes',
  ro: 'RO — Earth Fluxes',
  r2o3: 'R₂O₃ — Stabilisers',
  ro2: 'RO₂ — Glass Formers',
  colorant: 'Colorant Oxides',
  other: 'Other',
}

const oxideDescriptions: Record<string, {
  description: string
  effects: string[]
  increaseEffect: string
  decreaseEffect: string
}> = {
  sio2: {
    description: 'The primary glass former. Silica creates the glass network that holds the glaze together. Every glaze is fundamentally a silica glass modified by other oxides.',
    effects: ['Forms the glass matrix', 'Increases hardness and durability', 'Raises melting temperature', 'Reduces thermal expansion (less crazing)'],
    increaseEffect: 'Higher silica makes the glaze stiffer, harder, more durable, and more resistant to crazing. Too much and it won\'t melt properly.',
    decreaseEffect: 'Lower silica makes the glaze softer, more fluid, and more prone to crazing. Surface becomes less durable.',
  },
  al2o3: {
    description: 'The primary stabiliser. Alumina stiffens the melt so the glaze stays on vertical surfaces instead of running off. Controls the surface texture from glossy to matte.',
    effects: ['Prevents glaze from running', 'Controls glossy-to-matte spectrum', 'Increases chemical durability', 'Raises viscosity of the melt'],
    increaseEffect: 'More alumina = stiffer melt, more matte surface, less running. High alumina glazes are velvety matte.',
    decreaseEffect: 'Less alumina = more fluid melt, glossier surface, higher run risk. The glaze flows more freely.',
  },
  b2o3: {
    description: 'A powerful flux that also acts as a glass former. Boron is essential for low and mid-fire glazes where feldspar alone can\'t melt the glaze. Usually added via frits.',
    effects: ['Lowers melting temperature dramatically', 'Acts as both flux and glass former', 'Increases glaze hardness at low temperatures', 'Reduces thermal expansion slightly'],
    increaseEffect: 'More boron = lower melting point, more fluid melt. Essential for getting cone 06–6 glazes to melt well.',
    decreaseEffect: 'Less boron at low/mid fire = undermelted, rough, or dry surface. High fire doesn\'t need it.',
  },
  cao: {
    description: 'The workhorse flux of high-fire glazes. Calcium is cheap, reliable, and creates hard, durable surfaces. It\'s the most commonly used flux at cone 6 and above.',
    effects: ['Strong high-temperature flux', 'Creates hard, durable surfaces', 'Promotes crystal growth (when slow cooled)', 'Moderate thermal expansion'],
    increaseEffect: 'More calcium = more fluid at high fire, harder surface, more crystal potential. The backbone of stoneware glazes.',
    decreaseEffect: 'Less calcium often means a softer surface and weaker melt at high fire. Other fluxes must compensate.',
  },
  mgo: {
    description: 'Magnesia creates distinctive surface textures. Small amounts smooth the surface; larger amounts push toward a buttery, silky matte that potters love.',
    effects: ['Creates smooth, buttery matte surfaces', 'Low thermal expansion (anti-crazing)', 'Promotes opacity at higher levels', 'Stiffens the melt slightly'],
    increaseEffect: 'More MgO = silky matte surface, lower expansion (less crazing). The key to satin-matte glazes.',
    decreaseEffect: 'Less MgO removes the matte character. Surface becomes glossier and potentially more prone to crazing.',
  },
  k2o: {
    description: 'Potassium flux from feldspars. Strong melter with high thermal expansion. K₂O and Na₂O together as "KNaO" are the main variables controlling crazing risk.',
    effects: ['Strong flux at all temperatures', 'High thermal expansion (crazing risk)', 'Brightens colours', 'Lower viscosity than Na₂O alone'],
    increaseEffect: 'More K₂O = better melting, brighter colours, but higher crazing risk. Watch the KNaO total.',
    decreaseEffect: 'Less K₂O means other fluxes must work harder. Lower crazing risk but potentially less colour brightness.',
  },
  na2o: {
    description: 'Sodium flux — the highest-expansion oxide commonly found in glazes. Critical for soda glazes and shinos. The main driver of crazing when excessive.',
    effects: ['Very strong flux', 'Highest thermal expansion of common oxides', 'Essential for soda firing effects', 'Bright, clear colours'],
    increaseEffect: 'More Na₂O = very fluid melt, brilliant colours, but high crazing risk. The "danger flux" for fit.',
    decreaseEffect: 'Less Na₂O dramatically reduces crazing risk. Surface may be less brilliant but better fitted to the body.',
  },
  li2o: {
    description: 'Lithium — a powerful flux that brightens colours and lowers expansion more than other alkalis. Used in small amounts for dramatic effect.',
    effects: ['Powerful flux in small amounts', 'Brightens and intensifies colours', 'Lower expansion than K₂O or Na₂O', 'Creates distinctive blue-purple copper colours'],
    increaseEffect: 'More Li₂O = stronger melting, brighter colours, lower expansion than Na₂O. Small additions go far.',
    decreaseEffect: 'Without lithium, copper colours shift toward standard green. Melting point rises slightly.',
  },
  zno: {
    description: 'Zinc oxide — a versatile flux that creates crystalline effects, promotes opacity, and can produce unusual colour responses.',
    effects: ['Promotes crystal growth', 'Enhances opacity', 'Unusual colour responses (especially with copper)', 'Moderate flux power'],
    increaseEffect: 'More ZnO = more crystal potential, more opacity, unexpected colour shifts. Key to crystalline glazes.',
    decreaseEffect: 'Less zinc reduces crystal growth and opacity. Colours become more predictable.',
  },
  bao: {
    description: 'Barium — creates unique crawled matte surfaces prized by studio potters. TOXIC: not for functional ware. The matte surface it creates is unlike any other oxide.',
    effects: ['Unique crawled matte textures', 'Strong flux', 'TOXIC — not food safe', 'Creates "dry" but smooth surfaces'],
    increaseEffect: 'More BaO = more pronounced matte crawl effect. Only for decorative work. Always handle with care.',
    decreaseEffect: 'Without barium, the characteristic crawled matte disappears. Use strontium as a partial substitute.',
  },
  sro: {
    description: 'Strontium — similar to barium but without the toxicity. Creates smooth satin surfaces and is increasingly used as a safer alternative to BaO.',
    effects: ['Satin matte surfaces (safer than BaO)', 'Good mid-fire flux', 'Low toxicity', 'Moderate thermal expansion'],
    increaseEffect: 'More SrO = smoother satin surface. A good way to get barium-like effects with less risk.',
    decreaseEffect: 'Less strontium = losing the satin quality. Calcium is the common fallback.',
  },
  fe2o3: {
    description: 'Iron oxide — the most versatile colorant in ceramics. Produces colours from pale celadon to rich amber to deep tenmoku black, depending on amount and atmosphere.',
    effects: ['Celadon (1–2% in reduction)', 'Amber/honey (3–5% in oxidation)', 'Tenmoku/oil-spot (8–12%)', 'Also acts as a flux at high concentrations'],
    increaseEffect: 'More iron intensifies colour toward brown-black. Above 8% it starts to flux and create metallic surfaces.',
    decreaseEffect: 'Less iron lightens toward clear/pale celadon. Below 1% the colour becomes subtle.',
  },
  tio2: {
    description: 'Titanium dioxide — an opacifier and colour modifier. Creates cream-yellow tints and promotes surface variegation. Rutile (impure TiO₂) is especially prized.',
    effects: ['Opacifies the glaze', 'Creates cream-yellow tints', 'Promotes surface breaking and variegation', 'Interacts strongly with iron'],
    increaseEffect: 'More TiO₂ = more opacity, stronger cream tint, more surface variation. Rutile adds iron for extra warmth.',
    decreaseEffect: 'Less titanium = more transparent surface with less variegation.',
  },
  coo: {
    description: 'Cobalt — the strongest and most reliable blue colorant. Produces vivid blue in both oxidation and reduction at very low concentrations (0.25–2%).',
    effects: ['Intense blue at tiny amounts', 'Stable in both oxidation and reduction', 'Can overpower other colours', 'Used in cobalt blue, blue-celadon'],
    increaseEffect: 'More CoO = deeper blue, quickly becoming navy/black. 0.5% is already strong. Use sparingly.',
    decreaseEffect: 'Less cobalt = paler blue, eventually clear. Even traces give a noticeable blue cast.',
  },
  cuo: {
    description: 'Copper — versatile colorant that gives green in oxidation, red in reduction, and turquoise with alkaline fluxes. One of the most atmosphere-sensitive oxides.',
    effects: ['Green in oxidation', 'Red/copper-red in reduction', 'Turquoise with high Na₂O or K₂O', 'Volatilizes at high temperatures'],
    increaseEffect: 'More CuO = deeper green (ox) or richer red (red). Above 3% can cause metallic/black surfaces.',
    decreaseEffect: 'Less copper = lighter tint. Below 0.5% the colour becomes very subtle.',
  },
  nio: {
    description: 'Nickel oxide — produces muted grey-green-brown colours. Most useful as a modifier of other colorants rather than as a standalone colour.',
    effects: ['Grey-green-brown tones', 'Modifies other colorants', 'Creates "earthy" subdued effects', 'Sensitive to base glaze chemistry'],
    increaseEffect: 'More NiO = murky grey-brown. Usually used at 0.5–2% maximum.',
    decreaseEffect: 'Less nickel lets other colorants dominate. Removes the grey overtone.',
  },
  mno: {
    description: 'Manganese — creates brown-purple tones. Also acts as a flux. Combined with cobalt creates dark gunmetal colours. Common in tenmoku-style glazes.',
    effects: ['Brown-purple colours', 'Flux action (especially at cone 6+)', 'Metallic speckling (coarse manganese)', 'Combines well with iron and cobalt'],
    increaseEffect: 'More MnO = deeper brown-purple. Above 5% creates dark metallic surfaces.',
    decreaseEffect: 'Less manganese removes the purple-brown tone.',
  },
  pbo: {
    description: 'Lead oxide — historically the primary low-fire flux. Creates brilliant, smooth, highly reflective surfaces. EXTREMELY TOXIC. Rarely used in modern studio work.',
    effects: ['Extremely powerful low-fire flux', 'Brilliant, smooth surface', 'HIGHLY TOXIC — health risk', 'High thermal expansion'],
    increaseEffect: 'More PbO = more fluid, more brilliant. Historical earthenware and majolica. Avoid in modern practice.',
    decreaseEffect: 'Modern practice substitutes with boron frits for safety.',
  },
  p2o5: {
    description: 'Phosphorus — creates opalescence and milkiness. Found in bone ash and wood ash. Responsible for the beautiful chun blue effect in some glazes.',
    effects: ['Opalescence and milkiness', 'Chun blue effect (with copper)', 'Liquid-liquid phase separation', 'Distinct from opacity — more like internal glow'],
    increaseEffect: 'More P₂O₅ = more opalescent quality. 1–3% bone ash in a transparent glaze gives a beautiful milky depth.',
    decreaseEffect: 'Without phosphorus the glaze becomes a standard transparent.',
  },
  cr2o3: {
    description: 'Chrome oxide — produces green at low concentrations and pink-red with tin (chrome-tin pink). One of the most refractory colorants.',
    effects: ['Green colour (0.5–2%)', 'Chrome-tin pink (with SnO₂)', 'Very refractory — resists melting', 'Can produce brown-black at high concentrations'],
    increaseEffect: 'More Cr₂O₃ = darker green, eventually brown-black. Combine with tin for pink instead.',
    decreaseEffect: 'Less chrome removes the green. Very small amounts still give noticeable tinting.',
  },
  zro2: {
    description: 'Zirconia — a powerful opacifier. Makes glazes white and opaque. Common in zirconium silicate (Zircopax) form.',
    effects: ['Strong opacification', 'Stiffens the melt', 'Whiter than tin oxide', 'Contributes to durability'],
    increaseEffect: 'More ZrO₂ = more white opacity. 10–15% zirconium silicate is typical for full opaque white.',
    decreaseEffect: 'Less zirconia = more transparent glaze.',
  },
  sno2: {
    description: 'Tin oxide — the classic opacifier. Creates soft white opacity and enables chrome-tin pink reactions. More expensive than zirconium but gives a warmer white.',
    effects: ['Soft white opacity', 'Enables chrome-tin pink', 'Warmer white than zirconium', 'Traditional majolica opacifier'],
    increaseEffect: 'More SnO₂ = more opacity, warmer white. 5–10% typical for full opaque. Add chrome for pink.',
    decreaseEffect: 'Less tin = more transparent. Chrome-tin pink reaction requires tin present.',
  },
  mno2: {
    description: 'Manganese dioxide — higher oxidation state of manganese. Acts as both a colorant (brown-purple) and a glass former in the UMF system.',
    effects: ['Brown-purple colour', 'Glass former role in UMF', 'Speckling when coarse', 'Flux at high temperatures'],
    increaseEffect: 'More MnO₂ = deeper brown-purple, eventually metallic.',
    decreaseEffect: 'Less MnO₂ = lighter, cleaner colours from other oxides.',
  },
}

const oxideEncyclopedia = computed<OxideInfo[]>(() => {
  const result: OxideInfo[] = []

  for (const [oxideId, label] of Object.entries(OXIDE_LABELS)) {
    const group = OXIDE_GROUPS[oxideId] ?? 'other'
    const desc = oxideDescriptions[oxideId]
    if (!desc) continue

    // Find materials that contribute this oxide
    const materials: { id: string; name: string; pct: number }[] = []
    for (const [matId, analysis] of materialAnalyses) {
      const pct = analysis.oxides[oxideId]
      if (pct && pct > 0.5) {
        // Get display name from materialInfo or format from ID
        const name = matId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        materials.push({ id: matId, name, pct })
      }
    }
    materials.sort((a, b) => b.pct - a.pct)

    result.push({
      id: oxideId,
      label,
      name: oxideNames[oxideId] ?? oxideId,
      group,
      groupLabel: oxideGroupLabels[group] ?? group,
      description: desc.description,
      effects: desc.effects,
      increaseEffect: desc.increaseEffect,
      decreaseEffect: desc.decreaseEffect,
      materials: materials.slice(0, 8),
      expansionFactor: EXPANSION_FACTORS[oxideId] ?? null,
    })
  }

  // Sort by group order
  const groupOrder = ['ro2', 'r2o3', 'r2o', 'ro', 'colorant', 'other']
  result.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group))

  return result
})

const encyclopediaGrouped = computed(() => {
  const groups: { key: string; label: string; oxides: OxideInfo[] }[] = []
  let currentGroup = ''
  for (const oxide of oxideEncyclopedia.value) {
    if (oxide.group !== currentGroup) {
      currentGroup = oxide.group
      groups.push({ key: oxide.group, label: oxide.groupLabel, oxides: [] })
    }
    groups[groups.length - 1].oxides.push(oxide)
  }
  return groups
})

const expandedOxide = ref<string | null>(null)

function toggleOxide(id: string) {
  expandedOxide.value = expandedOxide.value === id ? null : id
}

// ════════════════════════════════════════════════════════════════════════
// TAB 3: BENCHMARK PROFILES
// ════════════════════════════════════════════════════════════════════════

const benchmarkProfiles = computed(() => store.umfBenchmarks ?? [])
const expandedBenchmark = ref<string | null>(null)

const bandKeyLabels: Record<string, string> = {
  sio2: 'SiO₂', al2o3: 'Al₂O₃', b2o3: 'B₂O₃', cao: 'CaO', mgo: 'MgO',
  k2o: 'K₂O', na2o: 'Na₂O', li2o: 'Li₂O', zno: 'ZnO', bao: 'BaO',
  sro: 'SrO', fe2o3: 'Fe₂O₃', tio2: 'TiO₂',
  knao: 'KNaO', siAlRatio: 'Si:Al', expansionDirection: 'Expansion',
}
function formatBandKey(key: string): string {
  return bandKeyLabels[key] ?? key
}

function toggleBenchmark(id: string) {
  expandedBenchmark.value = expandedBenchmark.value === id ? null : id
}

function recipesInBenchmark(profile: UMFBenchmarkProfile): Recipe[] {
  return profile.bestReferenceRecipeIds
    .map(id => store.recipeById.get(id))
    .filter(Boolean) as Recipe[]
}

// ════════════════════════════════════════════════════════════════════════
// TAB 4: MATERIAL CONTRIBUTION BREAKDOWN
// ════════════════════════════════════════════════════════════════════════

const breakdownRecipeId = ref<string | null>(null)
const breakdownSearch = ref('')
const showBreakdownPicker = ref(false)

const breakdownPickerResults = computed(() => {
  if (!breakdownSearch.value) return store.recipes.slice(0, 15)
  const q = breakdownSearch.value.toLowerCase()
  return store.recipes.filter(r => r.name.toLowerCase().includes(q)).slice(0, 15)
})

const breakdownRecipe = computed(() =>
  breakdownRecipeId.value ? store.recipeById.get(breakdownRecipeId.value) : null
)

function selectBreakdownRecipe(r: Recipe) {
  breakdownRecipeId.value = r.id
  showBreakdownPicker.value = false
  breakdownSearch.value = ''
}

const _timeoutIds: ReturnType<typeof setTimeout>[] = []
function safeTimeout(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    const idx = _timeoutIds.indexOf(id)
    if (idx !== -1) _timeoutIds.splice(idx, 1)
    fn()
  }, ms)
  _timeoutIds.push(id)
}

function hideBreakdownPicker() {
  safeTimeout(() => { showBreakdownPicker.value = false }, 150)
}

interface MaterialOxideContribution {
  materialId: string
  materialLabel: string
  oxideId: string
  oxideLabel: string
  moles: number
  percentage: number // % of total for that oxide
}

const breakdownData = computed(() => {
  const recipe = breakdownRecipe.value
  if (!recipe) return null

  const totalAmount = recipe.ingredients.reduce((s, i) => s + i.amount, 0)
  if (totalAmount === 0) return null

  // Collect per-material per-oxide moles
  const perMaterial = new Map<string, Map<string, number>>()
  const oxideTotals = new Map<string, number>()
  const allOxides = new Set<string>()

  for (const ing of recipe.ingredients) {
    const analysis = materialAnalyses.get(ing.materialId)
    if (!analysis) continue

    const fraction = ing.amount / totalAmount
    const matOxides = new Map<string, number>()

    for (const [oxideId, pct] of Object.entries(analysis.oxides)) {
      const mw = OXIDE_MW[oxideId]
      if (!mw || pct < 0.01) continue
      const moles = (fraction * pct / 100) / mw
      matOxides.set(oxideId, moles)
      oxideTotals.set(oxideId, (oxideTotals.get(oxideId) ?? 0) + moles)
      allOxides.add(oxideId)
    }
    perMaterial.set(ing.materialId, matOxides)
  }

  // Sort oxides by total moles
  const sortedOxides = Array.from(allOxides)
    .filter(id => (oxideTotals.get(id) ?? 0) > 0.00005)
    .sort((a, b) => (oxideTotals.get(b) ?? 0) - (oxideTotals.get(a) ?? 0))

  // Build stacked data per oxide
  const stacks: {
    oxideId: string
    oxideLabel: string
    group: string
    total: number
    segments: { materialId: string; label: string; moles: number; pct: number; color: string }[]
  }[] = []

  const matColors: Record<string, string> = {}
  const palette = [
    '#c4532a', '#7a8f6e', '#8b7355', '#b0977a', '#d4714a',
    '#5a6f4e', '#6b5535', '#9aaf8e', '#a3431f', '#e8cda8',
    '#4a7a6e', '#8f6e7a',
  ]

  recipe.ingredients.forEach((ing, i) => {
    matColors[ing.materialId] = palette[i % palette.length]
  })

  for (const oxideId of sortedOxides) {
    const total = oxideTotals.get(oxideId) ?? 0
    const segments: typeof stacks[0]['segments'] = []

    for (const ing of recipe.ingredients) {
      const matOxides = perMaterial.get(ing.materialId)
      const moles = matOxides?.get(oxideId) ?? 0
      if (moles < 0.00001) continue
      segments.push({
        materialId: ing.materialId,
        label: ing.sourceLabel,
        moles,
        pct: total > 0 ? (moles / total) * 100 : 0,
        color: matColors[ing.materialId] ?? '#8b7355',
      })
    }

    segments.sort((a, b) => b.moles - a.moles)

    stacks.push({
      oxideId,
      oxideLabel: OXIDE_LABELS[oxideId] ?? oxideId,
      group: OXIDE_GROUPS[oxideId] ?? 'other',
      total,
      segments,
    })
  }

  return { recipe, stacks, matColors }
})

// ════════════════════════════════════════════════════════════════════════
// TAB 5: CHEMISTRY COMPARISON TABLE
// ════════════════════════════════════════════════════════════════════════

const compareRecipeIds = ref<string[]>([])
const compareSearch = ref('')
const showComparePicker = ref(false)

const comparePickerResults = computed(() => {
  const q = compareSearch.value.toLowerCase()
  const selected = new Set(compareRecipeIds.value)
  return store.recipes
    .filter(r => !selected.has(r.id) && (!q || r.name.toLowerCase().includes(q)))
    .slice(0, 15)
})

function addCompareRecipe(r: Recipe) {
  if (compareRecipeIds.value.length >= 4) return
  compareRecipeIds.value = [...compareRecipeIds.value, r.id]
  compareSearch.value = ''
  showComparePicker.value = false
}

function removeCompareRecipe(id: string) {
  compareRecipeIds.value = compareRecipeIds.value.filter(x => x !== id)
}

function hideComparePicker() {
  safeTimeout(() => { showComparePicker.value = false }, 150)
}

const compareColumns = computed(() =>
  compareRecipeIds.value
    .map(id => {
      const recipe = store.recipeById.get(id)
      if (!recipe) return null
      const umf = recipeChemistry.value.get(id)
      return { recipe, umf: umf ?? null }
    })
    .filter(Boolean) as { recipe: Recipe; umf: UMFResult | null }[]
)

// Collect all oxides across compared recipes for the full table
const compareAllOxides = computed(() => {
  const oxides = new Set<string>()
  for (const col of compareColumns.value) {
    if (!col.umf) continue
    for (const group of [col.umf.r2o, col.umf.ro, col.umf.r2o3, col.umf.ro2, col.umf.colorants]) {
      for (const entry of group) oxides.add(entry.id)
    }
  }
  // Sort by group order
  const groupOrder = ['ro2', 'r2o3', 'r2o', 'ro', 'colorant', 'other']
  return Array.from(oxides).sort((a, b) => {
    const gA = groupOrder.indexOf(OXIDE_GROUPS[a] ?? 'other')
    const gB = groupOrder.indexOf(OXIDE_GROUPS[b] ?? 'other')
    return gA - gB
  })
})

function getOxideMoles(umf: UMFResult, oxideId: string): number {
  for (const group of [umf.r2o, umf.ro, umf.r2o3, umf.ro2, umf.colorants, umf.other]) {
    const entry = group.find(e => e.id === oxideId)
    if (entry) return entry.moles
  }
  return 0
}

// Compute delta (max divergence) per oxide
const compareDivergence = computed(() => {
  const divs = new Map<string, number>()
  for (const oxideId of compareAllOxides.value) {
    const vals = compareColumns.value
      .filter(c => c.umf?.isValid)
      .map(c => getOxideMoles(c.umf!, oxideId))
    if (vals.length < 2) continue
    divs.set(oxideId, Math.max(...vals) - Math.min(...vals))
  }
  return divs
})

// ════════════════════════════════════════════════════════════════════════
// TAB 6: LINE BLEND CALCULATOR
// ════════════════════════════════════════════════════════════════════════

const blendRecipeA = ref<string | null>(null)
const blendRecipeB = ref<string | null>(null)
const blendSteps = ref(10) // percentage increments
const blendSearchA = ref('')
const blendSearchB = ref('')
const showBlendPickerA = ref(false)
const showBlendPickerB = ref(false)

const blendPickerResultsA = computed(() => {
  const q = blendSearchA.value.toLowerCase()
  return store.recipes.filter(r => !q || r.name.toLowerCase().includes(q)).slice(0, 15)
})

const blendPickerResultsB = computed(() => {
  const q = blendSearchB.value.toLowerCase()
  return store.recipes.filter(r => !q || r.name.toLowerCase().includes(q)).slice(0, 15)
})

function selectBlendA(r: Recipe) { blendRecipeA.value = r.id; showBlendPickerA.value = false; blendSearchA.value = '' }
function selectBlendB(r: Recipe) { blendRecipeB.value = r.id; showBlendPickerB.value = false; blendSearchB.value = '' }
function hideBlendPickerA() { safeTimeout(() => { showBlendPickerA.value = false }, 150) }
function hideBlendPickerB() { safeTimeout(() => { showBlendPickerB.value = false }, 150) }

const blendRecipeObjA = computed(() => blendRecipeA.value ? store.recipeById.get(blendRecipeA.value) : null)
const blendRecipeObjB = computed(() => blendRecipeB.value ? store.recipeById.get(blendRecipeB.value) : null)

interface BlendPoint {
  pctA: number
  pctB: number
  umf: UMFResult
}

const blendResults = computed<BlendPoint[]>(() => {
  const rA = blendRecipeObjA.value
  const rB = blendRecipeObjB.value
  if (!rA || !rB) return []

  const totalA = rA.ingredients.reduce((s, i) => s + i.amount, 0)
  const totalB = rB.ingredients.reduce((s, i) => s + i.amount, 0)
  if (totalA === 0 || totalB === 0) return []

  const points: BlendPoint[] = []
  const step = blendSteps.value

  for (let pctA = 0; pctA <= 100; pctA += step) {
    const pctB = 100 - pctA
    const fracA = pctA / 100
    const fracB = pctB / 100

    // Blend ingredients by interpolating amounts
    const blended: { materialId: string; sourceLabel: string; amount: number }[] = []
    const matMap = new Map<string, { materialId: string; sourceLabel: string; amount: number }>()

    for (const ing of rA.ingredients) {
      const normed = (ing.amount / totalA) * fracA * 100
      matMap.set(ing.materialId, { materialId: ing.materialId, sourceLabel: ing.sourceLabel, amount: normed })
    }
    for (const ing of rB.ingredients) {
      const normed = (ing.amount / totalB) * fracB * 100
      const existing = matMap.get(ing.materialId)
      if (existing) {
        existing.amount += normed
      } else {
        matMap.set(ing.materialId, { materialId: ing.materialId, sourceLabel: ing.sourceLabel, amount: normed })
      }
    }

    for (const v of matMap.values()) {
      if (v.amount > 0.01) blended.push(v)
    }

    const firingRange = rA.firingRangeId === rB.firingRangeId ? rA.firingRangeId : rA.firingRangeId
    const umf = computeUMF(blended, firingRange)
    points.push({ pctA, pctB, umf })
  }

  return points
})

// Suggested blend: find the blend point closest to average of both recipes' Si:Al
const suggestedBlend = computed(() => {
  if (blendResults.value.length < 3) return null
  const umfA = blendRecipeA.value ? recipeChemistry.value.get(blendRecipeA.value) : null
  const umfB = blendRecipeB.value ? recipeChemistry.value.get(blendRecipeB.value) : null
  if (!umfA || !umfB) return null
  const targetSiAl = ((umfA.siToAl ?? 0) + (umfB.siToAl ?? 0)) / 2
  let best = blendResults.value[0]
  let bestDist = Infinity
  for (const pt of blendResults.value) {
    const dist = Math.abs((pt.umf.siToAl ?? 0) - targetSiAl)
    if (dist < bestDist) { bestDist = dist; best = pt }
  }
  return best
})

// ── Tab/mode option arrays for template ──────────────────────────────
const tabOptions: { id: Tab; label: string }[] = [
  { id: 'encyclopedia', label: 'Oxide Encyclopedia' },
  { id: 'benchmarks', label: 'Benchmark Profiles' },
  { id: 'breakdown', label: 'Material Breakdown' },
  { id: 'landscape', label: 'Oxide Landscape' },
  { id: 'compare', label: 'Chemistry Compare' },
  { id: 'blend', label: 'Line Blend' },
]

const plotModeOptions: { id: PlotMode; label: string }[] = [
  { id: 'si-al', label: 'SiO₂ vs Al₂O₃' },
  { id: 'flux-triangle', label: 'Flux Balance' },
  { id: 'expansion', label: 'Expansion vs Si:Al' },
]

// ── Mount animation ──────────────────────────────────────────────────
const headerEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (headerEl.value) {
    gsap.fromTo(headerEl.value, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
  }
})

onUnmounted(() => {
  _timeoutIds.forEach(id => clearTimeout(id))
})
</script>

<template>
  <div class="chemistry-view">
    <!-- Header -->
    <div ref="headerEl" class="chem-header">
      <div class="chem-header-inner">
        <div class="breadcrumb">
          <RouterLink to="/workshop" class="breadcrumb-link">Workshop</RouterLink>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-current">Chemistry Explorer</span>
        </div>
        <h1 class="page-title">Chemistry Explorer</h1>
        <p class="page-sub">Visualise oxide landscapes, explore what each oxide does, and understand what makes a glaze work</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="store.error" class="chem-error">
      <p class="error-message">{{ store.error }}</p>
      <button class="btn btn-primary" @click="store.loadAll()">Retry</button>
    </div>

    <!-- Tab bar -->
    <div v-else class="tab-bar">
      <div class="tab-bar-inner">
        <button
          v-for="tab in tabOptions"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="chem-layout">
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 1: OXIDE LANDSCAPE                                     -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'landscape'" class="tab-panel" v-reveal.fade>
        <div class="landscape-controls">
          <div class="control-group">
            <span class="control-label">Plot</span>
            <div class="control-pills">
              <button
                v-for="mode in plotModeOptions"
                :key="mode.id"
                class="pill-btn"
                :class="{ active: plotMode === mode.id }"
                @click="plotMode = mode.id"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>
          <label v-if="plotMode === 'si-al'" class="toggle-label">
            <input type="checkbox" v-model="showTargets" />
            Show target ranges
          </label>
          <div class="legend">
            <span v-for="(color, range) in firingRangeColors" :key="range" class="legend-item">
              <span class="legend-dot" :style="{ background: color }" />
              {{ (range as string).replace(/-/g, ' ') }}
            </span>
          </div>
        </div>

        <div class="landscape-chart">
          <svg viewBox="0 0 780 440" class="scatter-svg">
            <defs>
              <!-- Chart area background -->
              <linearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--parchment)" />
                <stop offset="100%" stop-color="var(--chalk)" />
              </linearGradient>
              <!-- Dot glow -->
              <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Chart area background -->
            <rect x="60" y="30" width="700" height="360" fill="url(#chartBg)" rx="4" />

            <!-- Grid lines — subtle dotted -->
            <line v-for="t in xTicks" :key="'xg'+t" :x1="toSvgX(t)" :x2="toSvgX(t)" y1="30" y2="390" class="grid-line" />
            <line v-for="t in yTicks" :key="'yg'+t" x1="60" x2="760" :y1="toSvgY(t)" :y2="toSvgY(t)" class="grid-line" />

            <!-- Axes -->
            <line x1="60" y1="390" x2="760" y2="390" class="axis-line" />
            <line x1="60" y1="30" x2="60" y2="390" class="axis-line" />

            <!-- Axis tick labels -->
            <text v-for="t in xTicks" :key="'xl'+t" :x="toSvgX(t)" y="408" class="axis-label" text-anchor="middle">{{ Number.isInteger(t) ? t : t.toFixed(1) }}</text>
            <text v-for="t in yTicks" :key="'yl'+t" x="54" :y="toSvgY(t) + 4" class="axis-label" text-anchor="end">{{ Number.isInteger(t) ? t : t.toFixed(2) }}</text>

            <!-- Axis titles -->
            <text x="410" y="432" class="axis-title" text-anchor="middle">{{ xAxisLabel }}</text>
            <text x="16" y="210" class="axis-title" text-anchor="middle" transform="rotate(-90, 16, 210)">{{ yAxisLabel }}</text>

            <!-- Target range boxes -->
            <rect
              v-for="box in targetBoxes"
              :key="box.id"
              :x="Math.min(box.x1, box.x2)"
              :y="Math.min(box.y1, box.y2)"
              :width="Math.abs(box.x2 - box.x1)"
              :height="Math.abs(box.y2 - box.y1)"
              :fill="box.color"
              fill-opacity="0.08"
              :stroke="box.color"
              stroke-opacity="0.35"
              stroke-width="1.5"
              stroke-dasharray="6 4"
              rx="6"
            />
            <text
              v-for="box in targetBoxes"
              :key="box.id + '-label'"
              :x="Math.min(box.x1, box.x2) + 6"
              :y="Math.min(box.y1, box.y2) + 14"
              class="target-label"
              :fill="box.color"
            >{{ box.label }}</text>

            <!-- Data points — dimmed first, then active on top -->
            <circle
              v-for="pt in plotData"
              :key="pt.id"
              :cx="toSvgX(pt.x)"
              :cy="toSvgY(pt.y)"
              :r="hoveredDot === pt.id || selectedDot === pt.id ? 7 : 4.5"
              :fill="pt.color"
              :fill-opacity="selectedDot && selectedDot !== pt.id ? 0.15 : 0.8"
              :stroke="selectedDot === pt.id ? 'var(--carbon)' : hoveredDot === pt.id ? 'white' : 'rgba(255,255,255,0.5)'"
              :stroke-width="selectedDot === pt.id ? 2.5 : hoveredDot === pt.id ? 2 : 0.75"
              :filter="hoveredDot === pt.id || selectedDot === pt.id ? 'url(#dotGlow)' : ''"
              class="plot-dot"
              @mouseenter="hoveredDot = pt.id"
              @mouseleave="hoveredDot = null"
              @click="handleDotClick(pt.id)"
            />
          </svg>

          <!-- Tooltip card -->
          <Transition name="fade">
            <div v-if="activeDot" class="dot-tooltip" :class="{ selected: selectedDot }">
              <div class="tooltip-swatch" :style="{ background: activeDot.color }" />
              <div class="tooltip-inner">
                <h4 class="tooltip-name">{{ activeDot.name }}</h4>
                <div class="tooltip-meta">
                  Cone {{ activeDot.cone }} · {{ activeDot.firingRangeId.replace(/-/g, ' ') }}
                </div>
                <div class="tooltip-stats">
                  <div class="tooltip-stat">
                    <span class="stat-label">Si:Al</span>
                    <span class="stat-value">{{ activeDot.umf.siToAl?.toFixed(1) ?? '—' }}</span>
                  </div>
                  <div class="tooltip-stat">
                    <span class="stat-label">KNaO</span>
                    <span class="stat-value">{{ activeDot.umf.knaO.toFixed(2) }}</span>
                  </div>
                  <div class="tooltip-stat">
                    <span class="stat-label">Exp</span>
                    <span class="stat-value">{{ activeDot.umf.expansionIndex.toFixed(1) }}</span>
                  </div>
                </div>
                <div v-if="selectedDot" class="tooltip-actions">
                  <button class="tooltip-btn" @click="openRecipeInDrawer(selectedDot)">View Recipe</button>
                  <button class="tooltip-btn" @click="loadInCalculator(selectedDot)">Calculator</button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <p class="landscape-note">
          Each dot is a recipe. {{ plotData.length }} recipes plotted.
          <template v-if="plotMode === 'si-al'">
            Dashed boxes show typical UMF target ranges per firing temperature. Recipes inside the box have "standard" chemistry for their range.
          </template>
          <template v-else-if="plotMode === 'flux-triangle'">
            X-axis shows alkali flux (K₂O + Na₂O) — high values increase crazing risk. Y-axis shows earth flux (CaO + MgO) — these create harder, more durable surfaces.
          </template>
          <template v-else>
            X-axis shows thermal expansion index (higher = more crazing risk). Y-axis shows Si:Al ratio (higher = glossier surface).
          </template>
        </p>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 2: OXIDE ENCYCLOPEDIA                                   -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'encyclopedia'" class="tab-panel" v-reveal.fade>
        <p class="section-intro">
          Every glaze is a combination of oxides. Understanding what each oxide does is the key to
          predicting how a glaze will look and behave — and to fixing problems when they arise.
        </p>

        <div v-for="group in encyclopediaGrouped" :key="group.key" class="oxide-group-section">
          <h2 class="oxide-group-title" v-html="group.label" />

          <div class="oxide-cards">
            <div
              v-for="oxide in group.oxides"
              :key="oxide.id"
              class="oxide-card"
              :class="{ expanded: expandedOxide === oxide.id }"
            >
              <button class="oxide-card-header" @click="toggleOxide(oxide.id)">
                <span class="oxide-formula" v-html="oxide.label" />
                <span class="oxide-common-name">{{ oxide.name }}</span>
                <span v-if="oxide.expansionFactor !== null" class="oxide-expansion">
                  exp: {{ oxide.expansionFactor > 0 ? '+' : '' }}{{ oxide.expansionFactor }}
                </span>
                <span class="oxide-toggle">{{ expandedOxide === oxide.id ? '−' : '+' }}</span>
              </button>

              <div class="oxide-card-body">
                <p class="oxide-desc">{{ oxide.description }}</p>

                <div class="oxide-effects">
                  <h4 class="oxide-sub-title">What it does</h4>
                  <ul>
                    <li v-for="(effect, i) in oxide.effects" :key="i">{{ effect }}</li>
                  </ul>
                </div>

                <div class="oxide-shift-grid">
                  <div class="shift-card increase">
                    <h5>↑ More</h5>
                    <p>{{ oxide.increaseEffect }}</p>
                  </div>
                  <div class="shift-card decrease">
                    <h5>↓ Less</h5>
                    <p>{{ oxide.decreaseEffect }}</p>
                  </div>
                </div>

                <div v-if="oxide.materials.length" class="oxide-materials">
                  <h4 class="oxide-sub-title">Materials that contribute {{ oxide.label }}</h4>
                  <div class="material-bars">
                    <div v-for="mat in oxide.materials" :key="mat.id" class="material-bar-row">
                      <span class="mat-name">{{ mat.name }}</span>
                      <div class="mat-bar-track">
                        <div class="mat-bar-fill" :style="{ width: mat.pct + '%' }" />
                      </div>
                      <span class="mat-pct">{{ mat.pct.toFixed(1) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 3: BENCHMARK PROFILES                                   -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'benchmarks'" class="tab-panel" v-reveal.fade>
        <p class="section-intro">
          Benchmark profiles define what "typical" chemistry looks like for specific glaze types.
          Compare your recipes against these profiles to understand if the chemistry is in a well-tested zone.
        </p>

        <!-- Fallback to UMF_TARGETS if no expanded benchmarks loaded -->
        <div v-if="!benchmarkProfiles.length" class="benchmark-grid">
          <div v-for="(target, rangeId) in UMF_TARGETS" :key="rangeId" class="benchmark-card">
            <div class="benchmark-header">
              <h3 class="benchmark-name">{{ target.label }}</h3>
              <span class="benchmark-range">{{ (rangeId as string).replace(/-/g, ' ') }}</span>
            </div>
            <div class="benchmark-bands">
              <div class="band-row">
                <span class="band-label">SiO₂</span>
                <span class="band-value">{{ target.sio2[0] }} – {{ target.sio2[1] }}</span>
              </div>
              <div class="band-row">
                <span class="band-label">Al₂O₃</span>
                <span class="band-value">{{ target.al2o3[0] }} – {{ target.al2o3[1] }}</span>
              </div>
              <div v-if="target.b2o3" class="band-row">
                <span class="band-label">B₂O₃</span>
                <span class="band-value">{{ target.b2o3[0] }} – {{ target.b2o3[1] }}</span>
              </div>
              <div class="band-row">
                <span class="band-label">KNaO</span>
                <span class="band-value">{{ target.knao[0] }} – {{ target.knao[1] }}</span>
              </div>
              <div class="band-row">
                <span class="band-label">Si:Al</span>
                <span class="band-value">{{ target.siToAl[0] }} – {{ target.siToAl[1] }}</span>
              </div>
              <div class="band-row">
                <span class="band-label">Expansion</span>
                <span class="band-value">{{ target.expansion[0] }} – {{ target.expansion[1] }}</span>
              </div>
            </div>
            <p class="benchmark-note">{{ target.note }}</p>
          </div>
        </div>

        <!-- Expanded benchmark profiles -->
        <div v-else class="benchmark-grid">
          <div
            v-for="profile in benchmarkProfiles"
            :key="profile.id"
            class="benchmark-card"
            :class="{ expanded: expandedBenchmark === profile.id }"
          >
            <button class="benchmark-header" @click="toggleBenchmark(profile.id)">
              <div class="benchmark-header-info">
                <h3 class="benchmark-name">{{ profile.name }}</h3>
                <div class="benchmark-meta">
                  <TagBadge :label="profile.coneRange" variant="cone" />
                  <span class="benchmark-surface">{{ profile.surfaceGoal }}</span>
                </div>
              </div>
              <span class="benchmark-toggle">{{ expandedBenchmark === profile.id ? '−' : '+' }}</span>
            </button>

            <div v-if="expandedBenchmark === profile.id" class="benchmark-body">
              <div class="benchmark-bands">
                <div v-for="(value, key) in profile.targetBands" :key="key" class="band-row">
                  <span class="band-label">{{ formatBandKey(key as string) }}</span>
                  <span class="band-value">{{ value }}</span>
                </div>
              </div>

              <div v-if="profile.chemistrySignals.length" class="benchmark-signals">
                <h4 class="benchmark-sub-title">Chemistry Signals</h4>
                <ul>
                  <li v-for="(sig, i) in profile.chemistrySignals" :key="i">{{ sig }}</li>
                </ul>
              </div>

              <div v-if="profile.watchFor.length" class="benchmark-watch">
                <h4 class="benchmark-sub-title">Watch For</h4>
                <ul class="watch-list">
                  <li v-for="(w, i) in profile.watchFor" :key="i">{{ w }}</li>
                </ul>
              </div>

              <div v-if="recipesInBenchmark(profile).length" class="benchmark-recipes">
                <h4 class="benchmark-sub-title">Reference Recipes</h4>
                <div class="bench-recipe-list">
                  <button
                    v-for="r in recipesInBenchmark(profile)"
                    :key="r.id"
                    class="bench-recipe-btn"
                    @click="openRecipeInDrawer(r.id)"
                  >
                    <span class="bench-recipe-name">{{ r.name }}</span>
                    <span class="bench-recipe-cone">C{{ r.cone }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 4: MATERIAL CONTRIBUTION BREAKDOWN                      -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'breakdown'" class="tab-panel" v-reveal.fade>
        <p class="section-intro">
          See which material contributes which oxides to the final chemistry. This answers the question:
          "If I remove this ingredient, what do I lose?"
        </p>

        <!-- Recipe picker -->
        <div class="breakdown-picker">
          <div class="picker-input-wrap">
            <input
              v-model="breakdownSearch"
              type="search"
              placeholder="Search a recipe to analyze…"
              class="picker-input"
              @focus="showBreakdownPicker = true"
              @blur="hideBreakdownPicker"
            />
            <Transition name="fade">
              <div v-if="showBreakdownPicker" class="picker-dropdown">
                <button
                  v-for="r in breakdownPickerResults"
                  :key="r.id"
                  class="picker-item"
                  :class="{ active: breakdownRecipeId === r.id }"
                  @mousedown.prevent="selectBreakdownRecipe(r)"
                >
                  <span class="picker-name">{{ r.name }}</span>
                  <span class="picker-meta">C{{ r.cone }} · {{ r.ingredients.length }} materials</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Breakdown chart -->
        <div v-if="breakdownData" class="breakdown-content">
          <h3 class="breakdown-recipe-name">{{ breakdownData.recipe.name }}</h3>

          <!-- Legend -->
          <div class="breakdown-legend">
            <span
              v-for="ing in breakdownData.recipe.ingredients"
              :key="ing.materialId"
              class="legend-chip"
            >
              <span class="legend-swatch" :style="{ background: breakdownData.matColors[ing.materialId] }" />
              {{ ing.sourceLabel }}
              <span class="legend-pct">{{ ing.amount }}%</span>
            </span>
          </div>

          <!-- Stacked bars -->
          <div class="breakdown-bars">
            <div class="breakdown-table-header">
              <span class="breakdown-col-oxide">Oxide</span>
              <span class="breakdown-col-bar">Contribution by material</span>
            </div>
            <div v-for="stack in breakdownData.stacks" :key="stack.oxideId" class="breakdown-row">
              <div class="breakdown-oxide-col">
                <span class="breakdown-oxide-label" v-html="stack.oxideLabel" />
                <span class="breakdown-oxide-name">{{ oxideNames[stack.oxideId] ?? '' }}</span>
              </div>
              <div class="breakdown-bar-col">
                <div class="breakdown-bar-track">
                  <div
                    v-for="(seg, i) in stack.segments"
                    :key="seg.materialId"
                    class="breakdown-bar-seg"
                    :style="{ width: seg.pct + '%', background: seg.color }"
                  >
                    <span v-if="seg.pct > 15" class="seg-inline-label">{{ seg.label }} {{ seg.pct.toFixed(0) }}%</span>
                  </div>
                </div>
                <div class="breakdown-seg-list">
                  <span
                    v-for="seg in stack.segments"
                    :key="seg.materialId"
                    class="seg-detail"
                  >
                    <span class="seg-dot" :style="{ background: seg.color }" />
                    {{ seg.label }}
                    <span class="seg-pct">{{ seg.pct.toFixed(1) }}%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="breakdown-empty">
          <div class="empty-icon">🧪</div>
          <p>Select a recipe above to see which materials contribute each oxide</p>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 5: CHEMISTRY COMPARISON TABLE                          -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'compare'" class="tab-panel" v-reveal.fade>
        <p class="section-intro">
          Select 2–4 recipes to compare their full oxide profiles side by side.
          Differences are highlighted so you can see exactly which oxides diverge.
        </p>

        <!-- Recipe picker -->
        <div class="compare-picker-row">
          <div class="picker-input-wrap" v-if="compareRecipeIds.length < 4">
            <input
              v-model="compareSearch"
              type="search"
              :placeholder="compareRecipeIds.length === 0 ? 'Add a recipe to compare…' : 'Add another recipe…'"
              class="picker-input"
              @focus="showComparePicker = true"
              @blur="hideComparePicker"
            />
            <Transition name="fade">
              <div v-if="showComparePicker" class="picker-dropdown">
                <button
                  v-for="r in comparePickerResults"
                  :key="r.id"
                  class="picker-item"
                  @mousedown.prevent="addCompareRecipe(r)"
                >
                  <span class="picker-name">{{ r.name }}</span>
                  <span class="picker-meta">C{{ r.cone }} · {{ r.firingRangeId.replace(/-/g, ' ') }}</span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Selected chips -->
          <div class="compare-selected-chips">
            <span
              v-for="id in compareRecipeIds"
              :key="id"
              class="compare-chip"
            >
              {{ store.recipeById.get(id)?.name ?? id }}
              <button class="compare-chip-remove" @click="removeCompareRecipe(id)">×</button>
            </span>
          </div>
        </div>

        <!-- Comparison table -->
        <div v-if="compareColumns.length >= 2" class="chem-compare-table-wrap">
          <table class="chem-compare-table">
            <thead>
              <tr>
                <th class="chem-th-oxide">Metric</th>
                <th v-for="col in compareColumns" :key="col.recipe.id" class="chem-th-recipe">
                  <span class="chem-th-name">{{ col.recipe.name }}</span>
                  <span class="chem-th-cone">C{{ col.recipe.cone }}</span>
                </th>
                <th v-if="compareColumns.length === 2" class="chem-th-delta">Delta</th>
              </tr>
            </thead>
            <tbody>
              <!-- Key metrics -->
              <tr class="chem-metric-row">
                <td class="chem-td-oxide"><span class="chem-td-formula">Si : Al</span></td>
                <td v-for="col in compareColumns" :key="col.recipe.id" class="chem-td-value">
                  {{ col.umf?.siToAl?.toFixed(1) ?? '—' }}
                </td>
                <td v-if="compareColumns.length === 2" class="chem-td-delta">
                  {{ compareColumns[0].umf && compareColumns[1].umf
                    ? ((compareColumns[0].umf.siToAl ?? 0) - (compareColumns[1].umf.siToAl ?? 0)).toFixed(2)
                    : '—' }}
                </td>
              </tr>
              <tr class="chem-metric-row">
                <td class="chem-td-oxide"><span class="chem-td-formula">KNaO</span></td>
                <td v-for="col in compareColumns" :key="col.recipe.id" class="chem-td-value">
                  {{ col.umf?.knaO?.toFixed(3) ?? '—' }}
                </td>
                <td v-if="compareColumns.length === 2" class="chem-td-delta">
                  {{ compareColumns[0].umf && compareColumns[1].umf
                    ? (compareColumns[0].umf.knaO - compareColumns[1].umf.knaO).toFixed(3)
                    : '—' }}
                </td>
              </tr>
              <tr class="chem-metric-row">
                <td class="chem-td-oxide"><span class="chem-td-formula">Expansion</span></td>
                <td v-for="col in compareColumns" :key="col.recipe.id" class="chem-td-value">
                  {{ col.umf?.expansionIndex?.toFixed(1) ?? '—' }}
                </td>
                <td v-if="compareColumns.length === 2" class="chem-td-delta">
                  {{ compareColumns[0].umf && compareColumns[1].umf
                    ? (compareColumns[0].umf.expansionIndex - compareColumns[1].umf.expansionIndex).toFixed(1)
                    : '—' }}
                </td>
              </tr>
              <tr class="chem-metric-row">
                <td class="chem-td-oxide"><span class="chem-td-formula">LOI</span></td>
                <td v-for="col in compareColumns" :key="col.recipe.id" class="chem-td-value">
                  {{ col.umf?.totalLOI?.toFixed(1) ?? '—' }}%
                </td>
                <td v-if="compareColumns.length === 2" class="chem-td-delta">
                  {{ compareColumns[0].umf && compareColumns[1].umf
                    ? (compareColumns[0].umf.totalLOI - compareColumns[1].umf.totalLOI).toFixed(1)
                    : '—' }}
                </td>
              </tr>

              <!-- Separator -->
              <tr class="chem-separator-row">
                <td :colspan="compareColumns.length + (compareColumns.length === 2 ? 2 : 1)" class="chem-separator">
                  Full Oxide Profile (Unity Formula)
                </td>
              </tr>

              <!-- Per-oxide rows -->
              <tr
                v-for="oxideId in compareAllOxides"
                :key="oxideId"
                class="chem-oxide-row"
                :class="{ 'high-divergence': (compareDivergence.get(oxideId) ?? 0) > 0.05 }"
              >
                <td class="chem-td-oxide">
                  <span class="chem-td-formula" v-html="OXIDE_LABELS[oxideId] ?? oxideId" />
                  <span class="chem-td-common">{{ oxideNames[oxideId] ?? '' }}</span>
                </td>
                <td v-for="col in compareColumns" :key="col.recipe.id" class="chem-td-value">
                  {{ col.umf?.isValid ? getOxideMoles(col.umf, oxideId).toFixed(4) : '—' }}
                </td>
                <td v-if="compareColumns.length === 2" class="chem-td-delta"
                    :class="{
                      positive: compareColumns[0].umf && compareColumns[1].umf && getOxideMoles(compareColumns[0].umf, oxideId) > getOxideMoles(compareColumns[1].umf, oxideId),
                      negative: compareColumns[0].umf && compareColumns[1].umf && getOxideMoles(compareColumns[0].umf, oxideId) < getOxideMoles(compareColumns[1].umf, oxideId),
                    }"
                >
                  {{ compareColumns[0].umf && compareColumns[1].umf
                    ? (getOxideMoles(compareColumns[0].umf, oxideId) - getOxideMoles(compareColumns[1].umf, oxideId)).toFixed(4)
                    : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="compareColumns.length < 2" class="breakdown-empty">
          <div class="empty-icon">⇔</div>
          <p>Select at least 2 recipes to compare their chemistry</p>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 6: LINE BLEND CALCULATOR                               -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'blend'" class="tab-panel" v-reveal.fade>
        <p class="section-intro">
          Pick two recipes and see how the chemistry shifts across a line blend — from 100% A to 100% B in
          even steps. Ceramicists use line blends to find the sweet spot between two glazes.
        </p>

        <div class="blend-pickers">
          <!-- Recipe A -->
          <div class="blend-picker-col">
            <span class="blend-label">Recipe A</span>
            <div class="picker-input-wrap">
              <input
                v-model="blendSearchA"
                type="search"
                :placeholder="blendRecipeObjA ? blendRecipeObjA.name : 'Select recipe A…'"
                class="picker-input"
                :class="{ filled: blendRecipeObjA }"
                @focus="showBlendPickerA = true"
                @blur="hideBlendPickerA"
              />
              <Transition name="fade">
                <div v-if="showBlendPickerA" class="picker-dropdown">
                  <button
                    v-for="r in blendPickerResultsA"
                    :key="r.id"
                    class="picker-item"
                    :class="{ active: blendRecipeA === r.id }"
                    @mousedown.prevent="selectBlendA(r)"
                  >
                    <span class="picker-name">{{ r.name }}</span>
                    <span class="picker-meta">C{{ r.cone }} · {{ r.ingredients.length }} materials</span>
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Recipe B -->
          <div class="blend-picker-col">
            <span class="blend-label">Recipe B</span>
            <div class="picker-input-wrap">
              <input
                v-model="blendSearchB"
                type="search"
                :placeholder="blendRecipeObjB ? blendRecipeObjB.name : 'Select recipe B…'"
                class="picker-input"
                :class="{ filled: blendRecipeObjB }"
                @focus="showBlendPickerB = true"
                @blur="hideBlendPickerB"
              />
              <Transition name="fade">
                <div v-if="showBlendPickerB" class="picker-dropdown">
                  <button
                    v-for="r in blendPickerResultsB"
                    :key="r.id"
                    class="picker-item"
                    :class="{ active: blendRecipeB === r.id }"
                    @mousedown.prevent="selectBlendB(r)"
                  >
                    <span class="picker-name">{{ r.name }}</span>
                    <span class="picker-meta">C{{ r.cone }} · {{ r.ingredients.length }} materials</span>
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Blend step selector -->
          <div class="blend-step-col">
            <span class="blend-label">Step size</span>
            <div class="control-pills">
              <button v-for="s in [5, 10, 20, 25]" :key="s" class="pill-btn" :class="{ active: blendSteps === s }" @click="blendSteps = s">
                {{ s }}%
              </button>
            </div>
          </div>
        </div>

        <!-- Blend results table -->
        <div v-if="blendResults.length > 0" class="blend-results">
          <div class="blend-results-table-wrap">
            <table class="blend-table">
              <thead>
                <tr>
                  <th class="blend-th">A %</th>
                  <th class="blend-th">B %</th>
                  <th class="blend-th">SiO₂</th>
                  <th class="blend-th">Al₂O₃</th>
                  <th class="blend-th">Si:Al</th>
                  <th class="blend-th">KNaO</th>
                  <th class="blend-th">CaO</th>
                  <th class="blend-th">Exp</th>
                  <th class="blend-th">LOI</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="pt in blendResults"
                  :key="pt.pctA"
                  class="blend-row"
                  :class="{
                    pure: pt.pctA === 100 || pt.pctA === 0,
                    suggested: suggestedBlend && pt.pctA === suggestedBlend.pctA && pt.pctA !== 0 && pt.pctA !== 100
                  }"
                >
                  <td class="blend-td pct-col">{{ pt.pctA }}</td>
                  <td class="blend-td pct-col">{{ pt.pctB }}</td>
                  <td class="blend-td">{{ pt.umf.isValid ? pt.umf.totalSi.toFixed(2) : '—' }}</td>
                  <td class="blend-td">{{ pt.umf.isValid ? pt.umf.totalAl.toFixed(3) : '—' }}</td>
                  <td class="blend-td">{{ pt.umf.siToAl?.toFixed(1) ?? '—' }}</td>
                  <td class="blend-td">{{ pt.umf.isValid ? pt.umf.knaO.toFixed(3) : '—' }}</td>
                  <td class="blend-td">{{ pt.umf.isValid ? (pt.umf.ro.find(e => e.id === 'cao')?.moles ?? 0).toFixed(3) : '—' }}</td>
                  <td class="blend-td">{{ pt.umf.isValid ? pt.umf.expansionIndex.toFixed(1) : '—' }}</td>
                  <td class="blend-td">{{ pt.umf.isValid ? pt.umf.totalLOI.toFixed(1) : '—' }}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Visual blend bar -->
          <div class="blend-visual">
            <div class="blend-bar-track">
              <div
                v-for="pt in blendResults"
                :key="'bar-' + pt.pctA"
                class="blend-bar-segment"
                :style="{
                  left: pt.pctA + '%',
                  background: pt.umf.isValid ? `hsl(${15 + (pt.umf.siToAl ?? 5) * 8}, 55%, 55%)` : 'var(--stone)',
                }"
                :title="`${pt.pctA}A / ${pt.pctB}B — Si:Al ${pt.umf.siToAl?.toFixed(1) ?? '?'}`"
              />
            </div>
            <div class="blend-bar-labels">
              <span class="blend-bar-label-a">100% {{ blendRecipeObjA?.name }}</span>
              <span class="blend-bar-label-b">100% {{ blendRecipeObjB?.name }}</span>
            </div>
          </div>

          <p v-if="suggestedBlend && suggestedBlend.pctA > 0 && suggestedBlend.pctA < 100" class="blend-suggestion">
            Midpoint blend at <strong>{{ suggestedBlend.pctA }}% A / {{ suggestedBlend.pctB }}% B</strong>
            gives Si:Al of {{ suggestedBlend.umf.siToAl?.toFixed(1) ?? '?' }}
            and expansion {{ suggestedBlend.umf.expansionIndex.toFixed(1) }}.
          </p>
        </div>

        <div v-else class="breakdown-empty">
          <div class="empty-icon">⚗</div>
          <p>Select two recipes above to generate a line blend</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chemistry-view {
  min-height: 100vh;
  background: var(--cream);
}

.chem-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) var(--space-8);
  text-align: center;
}

.chem-error .error-message {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--danger);
}

/* ── Header ── */
.chem-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-6)) var(--space-8) var(--space-6);
}

.chem-header-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.breadcrumb { display: flex; align-items: center; gap: var(--space-1); margin-bottom: var(--space-1); }
.breadcrumb-link { font-family: var(--font-mono); font-size: 11px; color: var(--stone-light); text-decoration: none; letter-spacing: 0.03em; }
.breadcrumb-link:hover { color: var(--on-band); }
.breadcrumb-sep { color: var(--stone-light); opacity: 0.5; }
.breadcrumb-current { font-family: var(--font-mono); font-size: 11px; color: var(--on-band); letter-spacing: 0.03em; }

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--on-band);
}

.page-sub {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone-light);
  letter-spacing: 0.04em;
}

/* ── Tab bar ── */
.tab-bar {
  background: var(--band);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  position: sticky;
  top: var(--nav-height);
  z-index: var(--z-above);
}

.tab-bar-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  gap: var(--space-1);
  padding: 0 var(--space-8);
  overflow-x: auto;
}

.tab-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--stone-light);
  background: none;
  border: none;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover { color: var(--on-band); }

.tab-btn.active {
  color: var(--on-band);
  border-bottom-color: var(--clay);
}

/* ── Layout ── */
.chem-layout {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-8);
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.section-intro {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  line-height: 1.7;
  max-width: 680px;
}

/* ════════════════════════════════════════════════════════════════════════
   TAB 1: OXIDE LANDSCAPE
   ════════════════════════════════════════════════════════════════════════ */

.landscape-controls {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-wrap: wrap;
  padding: var(--space-4);
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.control-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone);
}

.control-pills {
  display: flex;
  gap: 2px;
  background: var(--ink-05);
  border-radius: var(--radius-full);
  padding: 2px;
}

.pill-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.pill-btn.active {
  background: var(--clay);
  color: white;
}

.pill-btn:hover:not(.active) {
  color: var(--ink);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
  cursor: pointer;
}

.toggle-label input { accent-color: var(--clay); }

.legend {
  display: flex;
  gap: var(--space-3);
  margin-left: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  text-transform: capitalize;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.landscape-chart {
  position: relative;
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
  padding: var(--space-3);
  box-shadow: inset 0 1px 3px var(--clay-06);
}

.scatter-svg {
  width: 100%;
  height: auto;
  display: block;
}

.grid-line {
  stroke: var(--ink-10);
  stroke-width: 0.5;
  stroke-dasharray: 2 4;
}

.axis-line {
  stroke: var(--ink-20);
  stroke-width: 1.5;
}

.axis-label {
  font-family: var(--font-mono);
  font-size: 9px;
  fill: var(--stone);
}

.axis-title {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--ink);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.target-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  opacity: 0.7;
}

.plot-dot {
  cursor: pointer;
  transition: r 0.2s ease, fill-opacity 0.2s ease, stroke-width 0.2s ease;
}

.dot-tooltip {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  background: var(--band);
  color: var(--on-band);
  border-radius: var(--radius-lg);
  min-width: 220px;
  box-shadow: var(--shadow-clay);
  z-index: var(--z-above);
  overflow: hidden;
}

.dot-tooltip.selected {
  background: var(--parchment);
  color: var(--carbon);
  box-shadow: var(--shadow-clay), 0 0 0 1px var(--ink-10);
}

.dot-tooltip.selected .tooltip-meta { color: var(--stone); }
.dot-tooltip.selected .stat-label { color: var(--stone); }
.dot-tooltip.selected .stat-value { color: var(--carbon); }
.dot-tooltip.selected .tooltip-stats { border-top-color: var(--ink-10); }
.dot-tooltip.selected .tooltip-actions { border-top-color: var(--ink-10); }
.dot-tooltip.selected .tooltip-btn {
  color: var(--carbon);
  border-color: var(--ink-20);
}
.dot-tooltip.selected .tooltip-btn:hover {
  background: var(--clay);
  border-color: var(--clay);
  color: white;
}

.tooltip-swatch {
  height: 4px;
  width: 100%;
}

.tooltip-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}

.tooltip-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
}

.tooltip-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone-light);
  text-transform: capitalize;
}

.tooltip-stats {
  display: flex;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid rgba(255,255,255,0.08);
}

.tooltip-stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone-light);
  opacity: 0.7;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--on-band);
}

.tooltip-actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid rgba(255,255,255,0.08);
}

.tooltip-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: var(--on-band);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tooltip-btn:hover {
  background: var(--clay);
  border-color: var(--clay);
}

.landscape-note {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  font-style: italic;
  line-height: 1.6;
}

/* ════════════════════════════════════════════════════════════════════════
   TAB 2: OXIDE ENCYCLOPEDIA
   ════════════════════════════════════════════════════════════════════════ */

.oxide-group-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.oxide-group-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--carbon);
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--ink-10);
}

.oxide-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.oxide-card {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.oxide-card.expanded {
  border-color: var(--clay);
}

.oxide-card-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

.oxide-card-header:hover {
  background: var(--parchment);
}

.oxide-formula {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--carbon);
  min-width: 64px;
}

.oxide-common-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  font-style: italic;
}

.oxide-expansion {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  margin-left: auto;
}

.oxide-toggle {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: var(--stone);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.oxide-card-body {
  display: none;
  padding: 0 var(--space-4) var(--space-4);
  flex-direction: column;
  gap: var(--space-4);
}

.oxide-card.expanded .oxide-card-body {
  display: flex;
}

.oxide-desc {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.7;
}

.oxide-sub-title {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  margin-bottom: var(--space-1);
}

.oxide-effects ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.oxide-effects li {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  padding-left: var(--space-4);
  position: relative;
  line-height: 1.5;
}

.oxide-effects li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: var(--clay);
}

.oxide-shift-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.shift-card {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border-left: 3px solid;
}

.shift-card.increase {
  background: var(--clay-06);
  border-color: var(--clay);
}

.shift-card.decrease {
  background: var(--sage-06);
  border-color: var(--sage);
}

.shift-card h5 {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-1);
}

.shift-card.increase h5 { color: var(--clay-dark); }
.shift-card.decrease h5 { color: var(--sage-dark); }

.shift-card p {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.6;
}

.oxide-materials {
  border-top: 1px solid var(--ink-10);
  padding-top: var(--space-3);
}

.material-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.material-bar-row {
  display: grid;
  grid-template-columns: 160px 1fr 52px;
  gap: var(--space-2);
  align-items: center;
}

.mat-name {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mat-bar-track {
  height: 10px;
  background: var(--ink-05);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.mat-bar-fill {
  height: 100%;
  background: var(--clay);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.mat-pct {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  text-align: right;
}

/* ════════════════════════════════════════════════════════════════════════
   TAB 3: BENCHMARK PROFILES
   ════════════════════════════════════════════════════════════════════════ */

.benchmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.benchmark-card {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.benchmark-card.expanded {
  border-color: var(--clay);
}

.benchmark-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.benchmark-header-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.benchmark-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--carbon);
}

.benchmark-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.benchmark-surface {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  text-transform: capitalize;
}

.benchmark-range {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  text-transform: capitalize;
}

.benchmark-toggle {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: var(--stone);
}

.benchmark-body {
  padding: 0 var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.benchmark-bands {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.band-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--ink-05);
}

.band-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--stone);
}

.band-value {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--ink);
}

.benchmark-sub-title {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
}

.benchmark-signals ul,
.benchmark-watch ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.benchmark-signals li,
.benchmark-watch li {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  padding-left: var(--space-3);
  position: relative;
  line-height: 1.5;
}

.benchmark-signals li::before { content: '→'; position: absolute; left: 0; color: var(--sage); }
.benchmark-watch li::before { content: '!'; position: absolute; left: 0; color: var(--clay); font-weight: 700; }

.benchmark-note {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  font-style: italic;
  line-height: 1.6;
  padding: var(--space-3);
  background: var(--parchment);
  border-radius: var(--radius-md);
}

.bench-recipe-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.bench-recipe-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border: 1px solid var(--ink-05);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;
}

.bench-recipe-btn:hover {
  border-color: var(--clay);
  background: var(--clay-10);
}

.bench-recipe-name {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--carbon);
}

.bench-recipe-cone {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

/* ════════════════════════════════════════════════════════════════════════
   TAB 4: MATERIAL BREAKDOWN
   ════════════════════════════════════════════════════════════════════════ */

.breakdown-picker {
  max-width: 400px;
}

.picker-input-wrap { position: relative; }

.picker-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  background: var(--chalk);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.picker-input:focus {
  border-color: var(--clay);
  box-shadow: 0 0 0 3px var(--clay-10);
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-drawer);
  max-height: 300px;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--ink-05);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.picker-item:hover, .picker-item.active { background: var(--clay-10); }
.picker-name { font-family: var(--font-body); font-size: var(--text-sm); color: var(--ink); font-weight: 500; }
.picker-meta { font-family: var(--font-mono); font-size: 10px; color: var(--stone); }

.breakdown-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.breakdown-recipe-name {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--carbon);
}

.breakdown-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.legend-chip {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink);
  padding: var(--space-1) var(--space-2);
  background: var(--chalk);
  border-radius: var(--radius-full);
  border: 1px solid var(--ink-10);
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-pct {
  color: var(--stone);
  font-size: 10px;
}

.breakdown-bars {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
  overflow: hidden;
}

.breakdown-table-header {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--parchment);
  border-bottom: 1px solid var(--ink-10);
}

.breakdown-col-oxide,
.breakdown-col-bar {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
}

.breakdown-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--ink-05);
  align-items: center;
}

.breakdown-row:last-child {
  border-bottom: none;
}

.breakdown-oxide-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.breakdown-oxide-label {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--carbon);
}

.breakdown-oxide-name {
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--stone);
  font-style: italic;
}

.breakdown-bar-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.breakdown-bar-track {
  display: flex;
  height: 24px;
  background: var(--ink-05);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.breakdown-bar-seg {
  height: 100%;
  transition: width 0.4s ease;
  min-width: 2px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.breakdown-bar-seg:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.breakdown-bar-seg:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.seg-inline-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
  text-shadow: 0 1px 2px var(--ink-30);
  padding: 0 4px;
}

.breakdown-seg-list {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.seg-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink);
}

.seg-pct {
  color: var(--stone);
}

.seg-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.breakdown-empty {
  text-align: center;
  padding: var(--space-16) var(--space-8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.breakdown-empty .empty-icon {
  font-size: 3rem;
  opacity: 0.3;
}

.breakdown-empty p {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  font-style: italic;
}

/* ════════════════════════════════════════════════════════════════════════
   TAB 5: CHEMISTRY COMPARISON TABLE
   ════════════════════════════════════════════════════════════════════════ */

.compare-picker-row {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  flex-wrap: wrap;
}

.compare-picker-row .picker-input-wrap {
  min-width: 300px;
}

.compare-selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.compare-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--clay-10);
  border: 1px solid var(--clay-30);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--clay-dark);
}

.compare-chip-remove {
  background: none;
  border: none;
  font-size: 14px;
  color: var(--stone);
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.compare-chip-remove:hover { color: var(--clay); }

.chem-compare-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
  background: var(--chalk);
}

.chem-compare-table {
  width: 100%;
  border-collapse: collapse;
}

.chem-compare-table th,
.chem-compare-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--ink-05);
}

.chem-th-oxide {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  background: var(--parchment);
  min-width: 120px;
  position: sticky;
  left: 0;
  z-index: 1;
}

.chem-th-recipe {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--carbon);
  background: var(--parchment);
  min-width: 120px;
}

.chem-th-name {
  display: block;
  font-size: var(--text-sm);
}

.chem-th-cone {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  font-weight: 400;
}

.chem-th-delta {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  background: var(--parchment);
  min-width: 80px;
}

.chem-td-oxide {
  position: sticky;
  left: 0;
  background: var(--chalk);
  z-index: 1;
}

.chem-td-formula {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--carbon);
  display: block;
}

.chem-td-common {
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--stone);
  font-style: italic;
}

.chem-td-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--ink);
}

.chem-td-delta {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
  font-weight: 600;
}

.chem-td-delta.positive { color: var(--clay); }
.chem-td-delta.negative { color: var(--sage-dark); }

.chem-separator-row td {
  border-bottom: none;
}

.chem-separator {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  padding-top: var(--space-4) !important;
  padding-bottom: var(--space-1) !important;
  border-top: 2px solid var(--ink-10);
}

.chem-metric-row {
  background: var(--parchment);
}

.chem-metric-row .chem-td-oxide {
  background: var(--parchment);
}

.chem-oxide-row.high-divergence {
  background: var(--clay-06);
}

.chem-oxide-row.high-divergence .chem-td-oxide {
  background: var(--clay-06);
}

.chem-oxide-row.high-divergence .chem-td-value {
  font-weight: 700;
  color: var(--clay-dark);
}

/* ════════════════════════════════════════════════════════════════════════
   TAB 6: LINE BLEND CALCULATOR
   ════════════════════════════════════════════════════════════════════════ */

.blend-pickers {
  display: flex;
  gap: var(--space-5);
  align-items: flex-end;
  flex-wrap: wrap;
}

.blend-picker-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 260px;
}

.blend-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
}

.blend-step-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.picker-input.filled {
  border-color: var(--sage);
  background: var(--sage-06);
}

.blend-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.blend-results-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
  background: var(--chalk);
}

.blend-table {
  width: 100%;
  border-collapse: collapse;
}

.blend-th {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--stone);
  padding: var(--space-2) var(--space-3);
  background: var(--parchment);
  border-bottom: 1px solid var(--ink-10);
  text-align: right;
  white-space: nowrap;
}

.blend-th:first-child,
.blend-th:nth-child(2) { text-align: center; min-width: 50px; }

.blend-td {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--ink);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--ink-05);
  text-align: right;
}

.blend-td.pct-col {
  text-align: center;
  font-weight: 700;
  color: var(--carbon);
}

.blend-row.pure {
  background: var(--parchment);
}

.blend-row.pure .blend-td {
  font-weight: 700;
}

.blend-row.suggested {
  background: var(--clay-08);
}

.blend-row.suggested .blend-td {
  color: var(--clay-dark);
}

.blend-visual {
  padding: var(--space-4);
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
}

.blend-bar-track {
  position: relative;
  height: 28px;
  background: var(--ink-05);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.blend-bar-segment {
  position: absolute;
  top: 0;
  width: 3px;
  height: 100%;
  border-radius: 1px;
  opacity: 0.8;
  transition: opacity var(--transition-fast);
}

.blend-bar-segment:hover {
  opacity: 1;
  width: 5px;
}

.blend-bar-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-1);
}

.blend-bar-label-a,
.blend-bar-label-b {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blend-suggestion {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--clay-06);
  border-left: 3px solid var(--clay);
  padding: var(--space-3) var(--space-4);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  line-height: 1.6;
}

.blend-suggestion strong {
  font-family: var(--font-mono);
  color: var(--clay-dark);
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .chem-layout { padding: var(--space-4); }
  .chem-header { padding-left: var(--space-4); padding-right: var(--space-4); }
  .tab-bar-inner { padding: 0 var(--space-4); }
  .landscape-controls { flex-direction: column; align-items: stretch; }
  .legend { margin-left: 0; flex-wrap: wrap; }
  .oxide-shift-grid { grid-template-columns: 1fr; }
  .benchmark-grid { grid-template-columns: 1fr; }
  .material-bar-row { grid-template-columns: 120px 1fr 44px; }
  .breakdown-table-header,
  .breakdown-row { grid-template-columns: 80px 1fr; }
  .blend-pickers { flex-direction: column; }
  .blend-picker-col { min-width: 100%; }
  .compare-picker-row .picker-input-wrap { min-width: 100%; }
}
</style>
