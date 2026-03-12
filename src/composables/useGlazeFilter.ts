import { ref, computed } from 'vue'
import type { Recipe } from '@/types'

export type FilterType = 'cones' | 'atmospheres' | 'colors' | 'surfaces' | 'families' | 'styles' | 'tableware'

export function useGlazeFilter(searchResults: () => Recipe[]) {
  const selectedCones = ref<string[]>([])
  const selectedAtmospheres = ref<string[]>([])
  const selectedColors = ref<string[]>([])
  const selectedSurfaces = ref<string[]>([])
  const selectedFamilies = ref<string[]>([])
  const selectedStyles = ref<string[]>([])
  const selectedTablewareStatuses = ref<string[]>([])

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

    return results
  })

  const activeFilterCount = computed(() =>
    selectedCones.value.length +
    selectedAtmospheres.value.length +
    selectedColors.value.length +
    selectedSurfaces.value.length +
    selectedFamilies.value.length +
    selectedStyles.value.length +
    selectedTablewareStatuses.value.length
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
  }

  function removeFilter(type: FilterType, value: string) {
    toggleFilter(type, value)
  }

  return {
    selectedCones,
    selectedAtmospheres,
    selectedColors,
    selectedSurfaces,
    selectedFamilies,
    selectedStyles,
    selectedTablewareStatuses,
    filteredRecipes,
    activeFilterCount,
    toggleFilter,
    clearAll,
    removeFilter,
  }
}
