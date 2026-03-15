import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Recipe } from '@/types'

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
  }
}

export type FilterType = 'cones' | 'atmospheres' | 'colors' | 'surfaces' | 'families' | 'styles' | 'tableware' | 'kilns' | 'techniques' | 'clays'

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

  const filteredRecipes = computed<Recipe[]>(() => {
    let results = searchResults()

    if (selectedCones.value.length > 0) {
      results = results.filter(r =>
        selectedCones.value.some(cone => r.cone.includes(cone) || r.firingRangeId === cone)
      )
    }

    if (selectedAtmospheres.value.length > 0) {
      results = results.filter(r =>
        r.atmosphereIds.some(a => selectedAtmospheres.value.includes(a))
      )
    }

    if (selectedColors.value.length > 0) {
      results = results.filter(r =>
        r.colourIds.some(c => selectedColors.value.includes(c))
      )
    }

    if (selectedSurfaces.value.length > 0) {
      results = results.filter(r =>
        r.surfaceIds.some(s => selectedSurfaces.value.includes(s))
      )
    }

    if (selectedFamilies.value.length > 0) {
      results = results.filter(r =>
        selectedFamilies.value.includes(r.firingRangeId)
      )
    }

    if (selectedStyles.value.length > 0) {
      results = results.filter(r =>
        r.styleIds.some(s => selectedStyles.value.includes(s))
      )
    }

    if (selectedTablewareStatuses.value.length > 0) {
      results = results.filter(r =>
        selectedTablewareStatuses.value.includes(r.tablewareStatus)
      )
    }

    if (selectedKilns.value.length > 0) {
      results = results.filter(r =>
        r.kilnIds.some(k => selectedKilns.value.includes(k))
      )
    }

    if (selectedTechniques.value.length > 0) {
      results = results.filter(r =>
        r.techniqueIds.some(t => selectedTechniques.value.includes(t))
      )
    }

    if (selectedClays.value.length > 0) {
      results = results.filter(r =>
        r.clayIds.some(c => selectedClays.value.includes(c))
      )
    }

    return results
  })

  const activeFilterCount = computed(() =>
    selectedCones.value.length +
    selectedAtmospheres.value.length +
    selectedColors.value.length +
    selectedSurfaces.value.length +
    selectedFamilies.value.length +
    selectedStyles.value.length +
    selectedTablewareStatuses.value.length +
    selectedKilns.value.length +
    selectedTechniques.value.length +
    selectedClays.value.length
  )

  function toggleFilter(type: FilterType, value: string) {
    const map = {
      cones: selectedCones,
      atmospheres: selectedAtmospheres,
      colors: selectedColors,
      surfaces: selectedSurfaces,
      families: selectedFamilies,
      styles: selectedStyles,
      tableware: selectedTablewareStatuses,
      kilns: selectedKilns,
      techniques: selectedTechniques,
      clays: selectedClays,
    }
    const arr = map[type]
    const idx = arr.value.indexOf(value)
    if (idx === -1) {
      arr.value = [...arr.value, value]
    } else {
      arr.value = arr.value.filter(v => v !== value)
    }
  }

  function clearAll() {
    selectedCones.value = []
    selectedAtmospheres.value = []
    selectedColors.value = []
    selectedSurfaces.value = []
    selectedFamilies.value = []
    selectedStyles.value = []
    selectedTablewareStatuses.value = []
    selectedKilns.value = []
    selectedTechniques.value = []
    selectedClays.value = []
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
      },
    }
    // Replace existing with same name, or append
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
    filteredRecipes,
    activeFilterCount,
    toggleFilter,
    clearAll,
    removeFilter,
    savedFilterSets,
    saveCurrentFilters,
    loadFilterSet,
    deleteFilterSet,
  }
}
