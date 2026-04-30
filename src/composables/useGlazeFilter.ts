import { ref, computed, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Recipe, ChemistryRangeFilter } from '@/types'
import { computeUMF } from '@/composables/useGlazeChemistry'

export interface SavedFilterSet {
  name: string
  filters: {
    cones: string[]
    atmospheres: string[]
    colors: string[]
    surfaces: string[]
    families: string[]
    styles: string[]
    tableware: string[]
    kilns: string[]
    techniques: string[]
    clays: string[]
    ingredients?: string[]
  }
}

export type FilterType = 'cones' | 'atmospheres' | 'colors' | 'surfaces' | 'families' | 'styles' | 'tableware' | 'kilns' | 'techniques' | 'clays' | 'ingredients'

interface DimDef {
  type: FilterType
  selected: Ref<string[]>
  filter: (r: Recipe, sel: Set<string>) => boolean
  extract: (r: Recipe) => string[]
}

export function useGlazeFilter(searchResults: () => Recipe[]) {
  const selectedCones = ref<string[]>([])
  const selectedAtmospheres = ref<string[]>([])
  const selectedColors = ref<string[]>([])
  const selectedSurfaces = ref<string[]>([])
  const selectedFamilies = ref<string[]>([])
  const selectedStyles = ref<string[]>([])
  const selectedTablewareStatuses = ref<string[]>([])
  const selectedKilns = ref<string[]>([])
  const selectedTechniques = ref<string[]>([])
  const selectedClays = ref<string[]>([])
  const selectedIngredients = ref<string[]>([])

  // Chemistry range filters
  const chemistryRanges = ref<ChemistryRangeFilter>({
    siAlMin: null, siAlMax: null,
    expansionMin: null, expansionMax: null,
    knaOMin: null, knaOMax: null,
    fluxSumMin: null, fluxSumMax: null,
  })

  // Lazy chemistry cache for range filtering
  const chemistryCache = computed(() => {
    const hasAnyRange = Object.values(chemistryRanges.value).some(v => v !== null)
    if (!hasAnyRange) return null
    const map = new Map<string, { siToAl: number | null; expansion: number; knaO: number; fluxSum: number }>()
    for (const r of searchResults()) {
      const umf = computeUMF(r.ingredients, r.firingRangeId)
      if (umf.isValid) {
        map.set(r.id, { siToAl: umf.siToAl, expansion: umf.expansionIndex, knaO: umf.knaO, fluxSum: umf.fluxSum })
      }
    }
    return map
  })

  function passesChemistryFilter(r: Recipe): boolean {
    const cache = chemistryCache.value
    if (!cache) return true
    const chem = cache.get(r.id)
    if (!chem) return true // no chemistry data = don't filter out
    const cr = chemistryRanges.value
    if (cr.siAlMin !== null && (chem.siToAl === null || chem.siToAl < cr.siAlMin)) return false
    if (cr.siAlMax !== null && (chem.siToAl === null || chem.siToAl > cr.siAlMax)) return false
    if (cr.expansionMin !== null && chem.expansion < cr.expansionMin) return false
    if (cr.expansionMax !== null && chem.expansion > cr.expansionMax) return false
    if (cr.knaOMin !== null && chem.knaO < cr.knaOMin) return false
    if (cr.knaOMax !== null && chem.knaO > cr.knaOMax) return false
    if (cr.fluxSumMin !== null && chem.fluxSum < cr.fluxSumMin) return false
    if (cr.fluxSumMax !== null && chem.fluxSum > cr.fluxSumMax) return false
    return true
  }

  const chemistryFilterActive = computed(() =>
    Object.values(chemistryRanges.value).some(v => v !== null)
  )

  // Single source of truth for all filter dimensions
  // filter functions receive a Set for O(1) lookups
  const dims: DimDef[] = [
    { type: 'cones', selected: selectedCones, filter: (r, sel) => r.cone.split(',').some(c => sel.has(c.trim())) || sel.has(r.firingRangeId), extract: r => [r.firingRangeId] },
    { type: 'atmospheres', selected: selectedAtmospheres, filter: (r, sel) => r.atmosphereIds.some(a => sel.has(a)), extract: r => r.atmosphereIds },
    { type: 'colors', selected: selectedColors, filter: (r, sel) => r.colourIds.some(c => sel.has(c)), extract: r => r.colourIds },
    { type: 'surfaces', selected: selectedSurfaces, filter: (r, sel) => r.surfaceIds.some(s => sel.has(s)), extract: r => r.surfaceIds },
    { type: 'families', selected: selectedFamilies, filter: (r, sel) => sel.has(r.firingRangeId), extract: r => [r.firingRangeId] },
    { type: 'styles', selected: selectedStyles, filter: (r, sel) => r.styleIds.some(s => sel.has(s)), extract: r => r.styleIds },
    { type: 'tableware', selected: selectedTablewareStatuses, filter: (r, sel) => sel.has(r.tablewareStatus), extract: r => [r.tablewareStatus] },
    { type: 'kilns', selected: selectedKilns, filter: (r, sel) => r.kilnIds.some(k => sel.has(k)), extract: r => r.kilnIds },
    { type: 'techniques', selected: selectedTechniques, filter: (r, sel) => r.techniqueIds.some(t => sel.has(t)), extract: r => r.techniqueIds },
    { type: 'clays', selected: selectedClays, filter: (r, sel) => r.clayIds.some(c => sel.has(c)), extract: r => r.clayIds },
    { type: 'ingredients', selected: selectedIngredients, filter: (r, sel) => { const ids = new Set(r.ingredients.map(i => i.materialId)); for (const id of sel) { if (!ids.has(id)) return false }; return true }, extract: r => r.ingredients.map(i => i.materialId) },
  ]

  const dimByType = Object.fromEntries(dims.map(d => [d.type, d])) as Record<FilterType, DimDef>

  function applyFilters(base: Recipe[], exclude?: FilterType): Recipe[] {
    // Build Set versions of active filters once, then single-pass filter
    const activeDims: { dim: DimDef; selSet: Set<string> }[] = []
    for (const dim of dims) {
      if (dim.type === exclude || dim.selected.value.length === 0) continue
      activeDims.push({ dim, selSet: new Set(dim.selected.value) })
    }
    if (activeDims.length === 0) return base
    return base.filter(r => activeDims.every(({ dim, selSet }) => dim.filter(r, selSet)))
  }

  const filteredRecipes = computed<Recipe[]>(() => {
    let results = applyFilters(searchResults())
    if (chemistryFilterActive.value) {
      results = results.filter(passesChemistryFilter)
    }
    return results
  })

  const activeFilterCount = computed(() =>
    dims.reduce((sum, dim) => sum + dim.selected.value.length, 0)
    + (chemistryFilterActive.value ? 1 : 0)
  )

  // ── Facet counts — cross-filtered per dimension ───────────────────
  const facetCounts = computed<Record<FilterType, Map<string, number>>>(() => {
    const base = searchResults()
    const counts = {} as Record<FilterType, Map<string, number>>

    for (const dim of dims) {
      const pool = applyFilters(base, dim.type)
      const map = new Map<string, number>()
      for (const r of pool) {
        for (const val of dim.extract(r)) {
          map.set(val, (map.get(val) ?? 0) + 1)
        }
      }
      counts[dim.type] = map
    }

    return counts
  })

  function toggleFilter(type: FilterType, value: string) {
    const arr = dimByType[type].selected
    const idx = arr.value.indexOf(value)
    if (idx === -1) {
      arr.value = [...arr.value, value]
    } else {
      arr.value = arr.value.filter(v => v !== value)
    }
  }

  function clearAll() {
    for (const dim of dims) dim.selected.value = []
    chemistryRanges.value = {
      siAlMin: null, siAlMax: null,
      expansionMin: null, expansionMax: null,
      knaOMin: null, knaOMax: null,
      fluxSumMin: null, fluxSumMax: null,
    }
  }

  function removeFilter(type: FilterType, value: string) {
    toggleFilter(type, value)
  }

  // ── Saved filter sets ─────────────────────────────────────────────
  const savedFilterSets = useStorage<SavedFilterSet[]>('glaze-saved-filters', [])

  function saveCurrentFilters(name: string) {
    const filterSet: SavedFilterSet = {
      name,
      filters: {
        cones: [...selectedCones.value],
        atmospheres: [...selectedAtmospheres.value],
        colors: [...selectedColors.value],
        surfaces: [...selectedSurfaces.value],
        families: [...selectedFamilies.value],
        styles: [...selectedStyles.value],
        tableware: [...selectedTablewareStatuses.value],
        kilns: [...selectedKilns.value],
        techniques: [...selectedTechniques.value],
        clays: [...selectedClays.value],
        ingredients: [...selectedIngredients.value],
      },
    }
    const idx = savedFilterSets.value.findIndex(s => s.name === name)
    if (idx >= 0) {
      savedFilterSets.value = savedFilterSets.value.map((s, i) => i === idx ? filterSet : s)
    } else {
      savedFilterSets.value = [...savedFilterSets.value, filterSet]
    }
  }

  function loadFilterSet(set: SavedFilterSet) {
    selectedCones.value = [...set.filters.cones]
    selectedAtmospheres.value = [...set.filters.atmospheres]
    selectedColors.value = [...set.filters.colors]
    selectedSurfaces.value = [...set.filters.surfaces]
    selectedFamilies.value = [...set.filters.families]
    selectedStyles.value = [...set.filters.styles]
    selectedTablewareStatuses.value = [...set.filters.tableware]
    selectedKilns.value = [...set.filters.kilns]
    selectedTechniques.value = [...set.filters.techniques]
    selectedClays.value = [...set.filters.clays]
    selectedIngredients.value = [...(set.filters.ingredients ?? [])]
  }

  function deleteFilterSet(name: string) {
    savedFilterSets.value = savedFilterSets.value.filter(s => s.name !== name)
  }

  return {
    selectedCones,
    selectedAtmospheres,
    selectedColors,
    selectedSurfaces,
    selectedFamilies,
    selectedStyles,
    selectedTablewareStatuses,
    selectedKilns,
    selectedTechniques,
    selectedClays,
    selectedIngredients,
    filteredRecipes,
    activeFilterCount,
    toggleFilter,
    clearAll,
    removeFilter,
    savedFilterSets,
    saveCurrentFilters,
    loadFilterSet,
    deleteFilterSet,
    facetCounts,
    chemistryRanges,
  }
}
