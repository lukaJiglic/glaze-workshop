import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Ingredient, UMFResult, OxideEntry, OxideGroup } from '@/types'
import {
  materialAnalyses,
  OXIDE_MW,
  OXIDE_GROUPS,
  OXIDE_LABELS,
  EXPANSION_FACTORS,
} from '@/data/material-analyses'

// ─── Core UMF calculation ──────────────────────────────────────────────────────

function computeUMF(ingredients: Ingredient[], firingRangeId?: string): UMFResult {
  const empty: UMFResult = {
    isValid: false, missingMaterials: [], fluxSum: 0,
    r2o: [], ro: [], r2o3: [], ro2: [], colorants: [], other: [],
    siToAl: null, knaO: 0, totalR2O: 0, totalRO: 0, totalAl: 0, totalSi: 0, totalB: 0,
    expansionIndex: 0, totalLOI: 0, hasApproximateData: false, firingRangeId,
  }

  if (!ingredients.length) return empty

  // ── Step 1: Accumulate raw moles per oxide across all ingredients ──────────
  const rawMoles = new Map<string, number>()
  const missingMaterials: string[] = []
  let hasApproximateData = false
  let weightedLOI = 0
  let totalAmount = ingredients.reduce((s, i) => s + i.amount, 0)
  if (totalAmount === 0) return empty

  for (const ing of ingredients) {
    const analysis = materialAnalyses.get(ing.materialId)
    if (!analysis) {
      if (ing.materialId) missingMaterials.push(ing.materialId)
      continue
    }

    const fraction = ing.amount / totalAmount
    weightedLOI += fraction * analysis.loi

    if (ing.materialId === 'wood-ash') hasApproximateData = true

    for (const [oxideId, pct] of Object.entries(analysis.oxides)) {
      const mw = OXIDE_MW[oxideId]
      if (!mw) continue
      // Oxide grams per 100g batch = (ingredient fraction) × (oxide wt% / 100)
      const oxideGrams = fraction * (pct / 100)
      const moles = oxideGrams / mw
      rawMoles.set(oxideId, (rawMoles.get(oxideId) ?? 0) + moles)
    }
  }

  // ── Step 2: Compute flux sum for UMF normalisation ─────────────────────────
  let fluxSum = 0
  for (const [oxideId, moles] of rawMoles) {
    const group = OXIDE_GROUPS[oxideId]
    if (group === 'r2o' || group === 'ro') fluxSum += moles
  }

  if (fluxSum === 0) {
    return { ...empty, missingMaterials, hasApproximateData, totalLOI: weightedLOI }
  }

  // ── Step 3: Normalise and sort into groups ─────────────────────────────────
  const grouped: Record<OxideGroup, OxideEntry[]> = {
    r2o: [], ro: [], r2o3: [], ro2: [], colorant: [], other: [],
  }

  for (const [oxideId, rawMol] of rawMoles) {
    if (rawMol < 0.0001) continue // skip negligible traces
    const group: OxideGroup = (OXIDE_GROUPS[oxideId] as OxideGroup) ?? 'other'
    const normalised = group === 'colorant' ? rawMol : rawMol / fluxSum
    grouped[group].push({
      id: oxideId,
      label: OXIDE_LABELS[oxideId] ?? oxideId.toUpperCase(),
      moles: Math.round(normalised * 10000) / 10000,
      group,
    })
  }

  // Sort each group by moles descending
  for (const group of Object.values(grouped)) {
    group.sort((a, b) => b.moles - a.moles)
  }

  // ── Step 4: Derived metrics ────────────────────────────────────────────────
  const allUnityEntries = [...grouped.r2o, ...grouped.ro, ...grouped.r2o3, ...grouped.ro2]
  const findMoles = (id: string) => allUnityEntries.find(e => e.id === id)?.moles ?? 0

  const si = findMoles('sio2')
  const al = findMoles('al2o3')
  const b  = findMoles('b2o3')
  const k  = findMoles('k2o')
  const na = findMoles('na2o')
  const knaO = Math.round((k + na) * 10000) / 10000

  const siToAl = al > 0.001 ? Math.round((si / al) * 100) / 100 : null
  const totalR2O = grouped.r2o.reduce((s, e) => s + e.moles, 0)
  const totalRO  = grouped.ro.reduce((s, e) => s + e.moles, 0)

  // ── Step 5: Expansion index (Seger approximation) ─────────────────────────
  let expansionIndex = 0
  for (const entry of allUnityEntries) {
    expansionIndex += (EXPANSION_FACTORS[entry.id] ?? 0) * entry.moles
  }
  expansionIndex = Math.round(expansionIndex * 10) / 10

  return {
    isValid: true,
    missingMaterials,
    fluxSum: Math.round(fluxSum * 100000) / 100000,
    r2o: grouped.r2o,
    ro: grouped.ro,
    r2o3: grouped.r2o3,
    ro2: grouped.ro2,
    colorants: grouped.colorant,
    other: grouped.other,
    siToAl,
    knaO,
    totalR2O: Math.round(totalR2O * 10000) / 10000,
    totalRO:  Math.round(totalRO  * 10000) / 10000,
    totalAl: al,
    totalSi: si,
    totalB:  b,
    expansionIndex,
    totalLOI: Math.round(weightedLOI * 10) / 10,
    hasApproximateData,
    firingRangeId,
  }
}

// ─── Composable ────────────────────────────────────────────────────────────────

export function useGlazeChemistry(
  ingredients: Ref<Ingredient[]> | ComputedRef<Ingredient[]>,
  firingRangeId?: Ref<string | undefined> | ComputedRef<string | undefined>,
) {
  const chemistry = computed<UMFResult>(() =>
    computeUMF(ingredients.value, firingRangeId?.value)
  )
  return { chemistry }
}
