import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Recipe, ScaledIngredient, CustomRecipe, Ingredient } from '@/types'

export const useWorkshopStore = defineStore('workshop', () => {
  // Active recipe for detail drawer
  const activeRecipe = ref<Recipe | null>(null)
  const isDrawerOpen = ref(false)

  // Favorites — persisted to localStorage
  const favoriteIds = useStorage<string[]>('glaze-favorites', [])

  // Recently viewed — persisted to localStorage
  const recentlyViewed = useStorage<string[]>('glaze-recently-viewed', [])

  const isFavorite = computed(() => (id: string) => favoriteIds.value.includes(id))

  function toggleFavorite(id: string) {
    const idx = favoriteIds.value.indexOf(id)
    if (idx === -1) {
      favoriteIds.value = [...favoriteIds.value, id]
    } else {
      favoriteIds.value = favoriteIds.value.filter(fid => fid !== id)
    }
  }

  function openRecipe(recipe: Recipe) {
    activeRecipe.value = recipe
    isDrawerOpen.value = true
    // Track recently viewed (deduplicated, max 8)
    recentlyViewed.value = [
      recipe.id,
      ...recentlyViewed.value.filter(id => id !== recipe.id),
    ].slice(0, 8)
  }

  function closeDrawer() {
    isDrawerOpen.value = false
    setTimeout(() => { activeRecipe.value = null }, 400)
  }

  // Calculator state
  const calculatorRecipe = ref<Recipe | null>(null)
  const batchWeight = ref(1000)

  const scaledIngredients = computed<ScaledIngredient[]>(() => {
    const src = calculatorRecipe.value ?? activeRecipe.value
    if (!src) return []
    return src.ingredients.map(ing => ({
      ...ing,
      scaledGrams: Number(((ing.amount / 100) * batchWeight.value).toFixed(1)),
    }))
  })

  const totalWeight = computed(() =>
    scaledIngredients.value.reduce((sum, i) => sum + i.scaledGrams, 0)
  )

  function loadRecipeIntoCalculator(recipe: Recipe) {
    calculatorRecipe.value = recipe
  }

  function clearCalculator() {
    calculatorRecipe.value = null
    batchWeight.value = 1000
  }

  // --- Custom recipes --- persisted to localStorage
  const customRecipes = useStorage<CustomRecipe[]>('glaze-custom-recipes', [])

  function saveCustomRecipe(recipe: CustomRecipe) {
    const idx = customRecipes.value.findIndex(r => r.id === recipe.id)
    if (idx >= 0) {
      customRecipes.value = customRecipes.value.map((r, i) => i === idx ? { ...recipe, updatedAt: new Date().toISOString() } : r)
    } else {
      customRecipes.value = [...customRecipes.value, { ...recipe, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
    }
  }

  function deleteCustomRecipe(id: string) {
    customRecipes.value = customRecipes.value.filter(r => r.id !== id)
  }

  function duplicateRecipeAsCustom(source: Recipe): CustomRecipe {
    const custom: CustomRecipe = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${source.name} (My Version)`,
      firingRangeId: source.firingRangeId,
      cone: source.cone,
      atmosphereIds: [...source.atmosphereIds],
      surfaceIds: [...source.surfaceIds],
      colourIds: [...source.colourIds],
      ingredients: source.ingredients.map(i => ({ ...i })),
      notes: ['Derived from: ' + source.name],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    customRecipes.value = [...customRecipes.value, custom]
    return custom
  }

  // Convert custom recipe to Recipe shape for compatibility
  function customToRecipe(custom: CustomRecipe): Recipe {
    return {
      id: custom.id,
      name: custom.name,
      firingRangeId: custom.firingRangeId,
      cone: custom.cone,
      atmosphereIds: custom.atmosphereIds,
      kilnIds: [],
      clayIds: [],
      techniqueIds: [],
      styleIds: [],
      colourIds: custom.colourIds,
      surfaceIds: custom.surfaceIds,
      ingredients: custom.ingredients,
      tablewareStatus: 'test-only',
      cautionIds: [],
      notes: custom.notes,
      sourceIds: [],
    }
  }

  return {
    activeRecipe,
    isDrawerOpen,
    favoriteIds,
    recentlyViewed,
    isFavorite,
    toggleFavorite,
    openRecipe,
    closeDrawer,
    calculatorRecipe,
    batchWeight,
    scaledIngredients,
    totalWeight,
    loadRecipeIntoCalculator,
    clearCalculator,
    customRecipes,
    saveCustomRecipe,
    deleteCustomRecipe,
    duplicateRecipeAsCustom,
    customToRecipe,
  }
})
