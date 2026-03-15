import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Recipe, ColorProfile, RecipeMapping, VisualMetadata, GlazeFamily, Taxonomy } from '@/types'
import { materialAnalyses } from '@/data/material-analyses'
import { sources } from '@/data/sources'
import { cautions } from '@/data/cautions'

const BASE = '/knowledge/glaze'

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json()
}

export const useGlazeStore = defineStore('glaze', () => {
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const recipes = ref<Recipe[]>([])
  const taxonomy = ref<Taxonomy | null>(null)
  const colorProfiles = ref<ColorProfile[]>([])
  const recipeMappings = ref<RecipeMapping[]>([])
  const visualMetadata = ref<VisualMetadata | null>(null)
  const families = ref<GlazeFamily[]>([])

  // Derived
  const recipeById = computed(() => {
    const map = new Map<string, Recipe>()
    for (const r of recipes.value) map.set(r.id, r)
    return map
  })

  const colorProfileById = computed(() => {
    const map = new Map<string, ColorProfile>()
    for (const p of colorProfiles.value) map.set(p.id, p)
    return map
  })

  const profileForRecipe = computed(() => {
    const map = new Map<string, string>() // recipeId -> profileId
    for (const m of recipeMappings.value) map.set(m.recipeId, m.defaultProfileId)
    return map
  })

  const visualScoresByFamily = computed(() => {
    const map = new Map<string, ReturnType<typeof getScores>>()
    for (const fd of (visualMetadata.value?.familyDefaults ?? [])) {
      map.set(fd.familyId, fd.scores)
    }
    return map
  })

  function getScores(recipeId: string, familyId?: string) {
    const override = visualMetadata.value?.recipeOverrides.find(r => r.recipeId === recipeId)
    if (override) return override.scores
    if (familyId) {
      return visualMetadata.value?.familyDefaults.find(f => f.familyId === familyId)?.scores
    }
    return null
  }

  async function loadAll() {
    if (isLoaded.value || isLoading.value) return
    isLoading.value = true
    error.value = null

    try {
      const [
        highfire,
        highfireExt,
        midfire,
        earthenware,
        raku,
        digitalfireCore,
        digitalfireExt,
        digitalfireSlip,
        tax,
        colours,
        visMeta,
        glazeFamilies,
      ] = await Promise.all([
        loadJson<{ recipes: Recipe[] }>('recipes-highfire.json'),
        loadJson<{ recipes: Recipe[] }>('recipes-highfire-extended.json'),
        loadJson<{ recipes: Recipe[] }>('recipes-midfire.json'),
        loadJson<{ recipes: Recipe[] }>('recipes-earthenware.json'),
        loadJson<{ recipes: Recipe[] }>('recipes-raku.json'),
        loadJson<{ recipes: Recipe[] }>('recipes-digitalfire-core.json'),
        loadJson<{ recipes: Recipe[] }>('recipes-digitalfire-extended.json'),
        loadJson<{ recipes: Recipe[] }>('recipes-digitalfire-slip-bases.json'),
        loadJson<Taxonomy>('taxonomy.json'),
        loadJson<{ meta: unknown; profiles: ColorProfile[]; recipeMappings: RecipeMapping[] }>('colour-profiles.json'),
        loadJson<VisualMetadata>('visual-metadata.json'),
        loadJson<{ families: GlazeFamily[] }>('glaze-families.json'),
      ])

      recipes.value = [
        ...highfire.recipes,
        ...highfireExt.recipes,
        ...midfire.recipes,
        ...earthenware.recipes,
        ...raku.recipes,
        ...digitalfireCore.recipes,
        ...digitalfireExt.recipes,
        ...digitalfireSlip.recipes,
      ]

      taxonomy.value = tax
      colorProfiles.value = colours.profiles
      recipeMappings.value = colours.recipeMappings
      visualMetadata.value = visMeta
      families.value = glazeFamilies.families

      isLoaded.value = true

      // Dev-mode data integrity warnings
      if ((import.meta as any).env?.DEV) {
        const validFiringRanges = new Set(
          tax.taxonomies.firingRanges?.map((fr) => fr.id) ?? []
        )
        for (const recipe of recipes.value) {
          for (const ing of recipe.ingredients ?? []) {
            if (!materialAnalyses.has(ing.materialId)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown materialId "${ing.materialId}"`)
            }
          }
          for (const sid of recipe.sourceIds ?? []) {
            if (!sources.has(sid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown sourceId "${sid}"`)
            }
          }
          for (const cid of recipe.cautionIds ?? []) {
            if (!cautions.has(cid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown cautionId "${cid}"`)
            }
          }
          if (recipe.firingRangeId && !validFiringRanges.has(recipe.firingRangeId)) {
            console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown firingRangeId "${recipe.firingRangeId}"`)
          }
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error loading data'
      console.error('[GlazeStore] Load error:', e)
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoaded,
    isLoading,
    error,
    recipes,
    taxonomy,
    colorProfiles,
    recipeMappings,
    visualMetadata,
    families,
    recipeById,
    colorProfileById,
    profileForRecipe,
    visualScoresByFamily,
    getScores,
    loadAll,
  }
})
