import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Recipe, ScaledIngredient, CustomRecipe, Ingredient } from '@/types'

export const useWorkshopStore = defineStore('workshop', () => {
  // Active recipe for detail drawer
  const activeRecipe = ref<Recipe | null>(null)
  const isDrawerOpen = ref(false)

  // Compare mode — up to 3 recipes
  const compareIds = ref<string[]>([])
  const isCompareOpen = ref(false)

  function toggleCompare(id: string) {
    const idx = compareIds.value.indexOf(id)
    if (idx >= 0) {
      compareIds.value = compareIds.value.filter(cid => cid !== id)
    } else if (compareIds.value.length < 3) {
      compareIds.value = [...compareIds.value, id]
    }
  }

  function clearCompare() {
    compareIds.value = []
    isCompareOpen.value = false
  }

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

  // Per-recipe user notes — persisted to localStorage
  const userNotes = useStorage<Record<string, string[]>>('glaze-user-notes', {})

  function addUserNote(recipeId: string, note: string) {
    const existing = userNotes.value[recipeId] ?? []
    userNotes.value = { ...userNotes.value, [recipeId]: [...existing, note] }
  }

  function removeUserNote(recipeId: string, index: number) {
    const existing = userNotes.value[recipeId] ?? []
    const updated = existing.filter((_, i) => i !== index)
    if (updated.length === 0) {
      const { [recipeId]: _, ...rest } = userNotes.value
      userNotes.value = rest
    } else {
      userNotes.value = { ...userNotes.value, [recipeId]: updated }
    }
  }

  function getUserNotes(recipeId: string): string[] {
    return userNotes.value[recipeId] ?? []
  }

  function hasUserNotes(recipeId: string): boolean {
    return (userNotes.value[recipeId]?.length ?? 0) > 0
  }

  // Calculator state — persisted to localStorage
  const calculatorRecipeId = useStorage<string | null>('glaze-calculator-recipe-id', null)
  const calculatorRecipe = ref<Recipe | null>(null)
  const batchWeight = useStorage<number>('glaze-calculator-batch-weight', 1000)

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
    calculatorRecipeId.value = recipe.id
  }

  function clearCalculator() {
    calculatorRecipe.value = null
    calculatorRecipeId.value = null
    batchWeight.value = 1000
  }

  // Restore calculator from localStorage (called after store data is loaded)
  function restoreCalculatorRecipe(recipeById: Map<string, Recipe>) {
    if (calculatorRecipeId.value && !calculatorRecipe.value) {
      const recipe = recipeById.get(calculatorRecipeId.value)
      if (recipe) calculatorRecipe.value = recipe
    }
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
      styleIds: custom.styleIds ?? [],
      colourIds: custom.colourIds,
      surfaceIds: custom.surfaceIds,
      ingredients: custom.ingredients,
      tablewareStatus: 'test-only',
      cautionIds: custom.cautionIds ?? [],
      notes: custom.notes,
      sourceIds: [],
    }
  }

  // Batch history — persisted to localStorage
  const batchHistory = useStorage<Array<{ recipeId: string; recipeName: string; weight: number; date: string }>>('glaze-batch-history', [])

  function recordBatchScale(recipeId: string, recipeName: string, weight: number) {
    batchHistory.value = [
      { recipeId, recipeName, weight, date: new Date().toISOString() },
      ...batchHistory.value.filter(b => !(b.recipeId === recipeId && b.weight === weight)),
    ].slice(0, 20)
  }

  // Export custom recipe as JSON
  function exportRecipeJSON(id: string): string | null {
    const recipe = customRecipes.value.find(r => r.id === id)
    if (!recipe) return null
    return JSON.stringify(recipe, null, 2)
  }

  // Import custom recipe from JSON
  function importRecipeJSON(json: string): CustomRecipe | null {
    try {
      const parsed = JSON.parse(json) as CustomRecipe
      if (!parsed.name || !parsed.ingredients || !Array.isArray(parsed.ingredients)) return null
      const imported: CustomRecipe = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: parsed.name,
        firingRangeId: parsed.firingRangeId ?? '',
        cone: parsed.cone ?? '6',
        atmosphereIds: parsed.atmosphereIds ?? [],
        surfaceIds: parsed.surfaceIds ?? [],
        colourIds: parsed.colourIds ?? [],
        ingredients: parsed.ingredients.map((i: Ingredient) => ({
          materialId: i.materialId ?? '',
          sourceLabel: i.sourceLabel ?? '',
          amount: Number(i.amount) || 0,
        })),
        notes: [...(parsed.notes ?? []), 'Imported recipe'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      saveCustomRecipe(imported)
      return imported
    } catch {
      return null
    }
  }

  // Save current scaled batch as a custom recipe
  function saveScaledAsCustom(): CustomRecipe | null {
    const src = calculatorRecipe.value
    if (!src) return null
    const now = new Date().toISOString()
    const custom: CustomRecipe = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${src.name} (${batchWeight.value}g batch)`,
      firingRangeId: src.firingRangeId,
      cone: src.cone,
      atmosphereIds: [...src.atmosphereIds],
      surfaceIds: [...src.surfaceIds],
      colourIds: [...src.colourIds],
      ingredients: src.ingredients.map(i => ({ ...i })),
      notes: [
        `Scaled from: ${src.name}`,
        `Batch weight: ${batchWeight.value}g`,
        ...scaledIngredients.value.map(i => `${i.sourceLabel}: ${i.scaledGrams}g`),
      ],
      createdAt: now,
      updatedAt: now,
    }
    saveCustomRecipe(custom)
    return custom
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
    userNotes,
    addUserNote,
    removeUserNote,
    getUserNotes,
    hasUserNotes,
    calculatorRecipe,
    calculatorRecipeId,
    batchWeight,
    scaledIngredients,
    totalWeight,
    loadRecipeIntoCalculator,
    clearCalculator,
    restoreCalculatorRecipe,
    customRecipes,
    saveCustomRecipe,
    deleteCustomRecipe,
    duplicateRecipeAsCustom,
    customToRecipe,
    batchHistory,
    recordBatchScale,
    compareIds,
    isCompareOpen,
    toggleCompare,
    clearCompare,
    exportRecipeJSON,
    importRecipeJSON,
    saveScaledAsCustom,
  }
})
