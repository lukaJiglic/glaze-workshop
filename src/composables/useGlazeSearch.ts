import { ref, computed, watch } from 'vue'
import Fuse from 'fuse.js'
import { useDebounceFn } from '@vueuse/core'
import type { Recipe } from '@/types'

export function useGlazeSearch(recipes: () => Recipe[]) {
  const query = ref('')
  const debouncedQuery = ref('')

  const updateDebounced = useDebounceFn((val: string) => {
    debouncedQuery.value = val
  }, 250)

  watch(query, (val) => updateDebounced(val))

  const fuse = computed(() => new Fuse(recipes(), {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'notes', weight: 1 },
      { name: 'ingredients.sourceLabel', weight: 1 },
      { name: 'colourIds', weight: 0.5 },
      { name: 'styleIds', weight: 0.5 },
      { name: 'surfaceIds', weight: 0.5 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
  }))

  const results = computed<Recipe[]>(() => {
    const q = debouncedQuery.value.trim()
    if (!q) return recipes()
    return fuse.value.search(q).map(r => r.item)
  })

  const isSearching = computed(() => debouncedQuery.value.trim().length > 0)

  function clearSearch() {
    query.value = ''
  }

  return { query, results, isSearching, clearSearch }
}
