import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Recipe, ColorProfile, RecipeMapping, VisualMetadata, GlazeFamily, Taxonomy,
  ExpandedMaterial, UMFBenchmarkProfile, UMFDiagnostic, ColourDevelopmentGuide,
  MaterialSwitchingPlaybook, FiringProgram, BodyDefinition, FamilyBodyResponse,
  StepProcedure,
} from '@/types'
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

  // ─── Expansion data (eagerly loaded) ────────────────────────────────────────
  const expandedMaterials = ref<ExpandedMaterial[]>([])
  const umfBenchmarks = ref<UMFBenchmarkProfile[]>([])
  const umfDiagnostics = ref<UMFDiagnostic[]>([])

  // ─── Lazy expansion data (loaded on demand) ────────────────────────────────
  const colourGuides = ref<ColourDevelopmentGuide[]>([])
  const switchingPlaybooks = ref<MaterialSwitchingPlaybook[]>([])
  const firingPrograms = ref<FiringProgram[]>([])
  const bodyDefinitions = ref<BodyDefinition[]>([])
  const familyResponses = ref<FamilyBodyResponse[]>([])
  const stepProcedures = ref<StepProcedure[]>([])

  // Track in-flight lazy load promises to prevent duplicate requests
  const _lazyPromises: Record<string, Promise<void> | null> = {
    colourGuides: null,
    switchingPlaybooks: null,
    firingPrograms: null,
    bodyResponse: null,
    stepProcedures: null,
  }

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

  // ─── Expansion computed lookups ────────────────────────────────────────────
  const expandedMaterialById = computed(() => {
    const map = new Map<string, ExpandedMaterial>()
    for (const m of expandedMaterials.value) map.set(m.id, m)
    return map
  })

  const benchmarksByFiringRange = computed(() => {
    const map = new Map<string, UMFBenchmarkProfile[]>()
    for (const b of umfBenchmarks.value) {
      const arr = map.get(b.firingRangeId) ?? []
      arr.push(b)
      map.set(b.firingRangeId, arr)
    }
    return map
  })

  const playbooksByMaterialId = computed(() => {
    const map = new Map<string, MaterialSwitchingPlaybook[]>()
    for (const p of switchingPlaybooks.value) {
      for (const mid of p.fromMaterialIds) {
        const arr = map.get(mid) ?? []
        arr.push(p)
        map.set(mid, arr)
      }
    }
    return map
  })

  // ─── Lazy loaders — fetch on demand, cache after first load ────────────────
  function loadColourGuides() {
    if (!_lazyPromises.colourGuides) {
      _lazyPromises.colourGuides = loadJson<{ families: ColourDevelopmentGuide[] }>('colour-development-guides.json')
        .then(data => { colourGuides.value = data.families })
        .catch(() => { /* silent — data is supplementary */ })
    }
    return _lazyPromises.colourGuides
  }

  function loadSwitchingPlaybooks() {
    if (!_lazyPromises.switchingPlaybooks) {
      _lazyPromises.switchingPlaybooks = loadJson<{ playbooks: MaterialSwitchingPlaybook[] }>('material-switching-playbooks.json')
        .then(data => { switchingPlaybooks.value = data.playbooks })
        .catch(() => { /* silent */ })
    }
    return _lazyPromises.switchingPlaybooks
  }

  function loadFiringPrograms() {
    if (!_lazyPromises.firingPrograms) {
      _lazyPromises.firingPrograms = loadJson<{ programs: FiringProgram[] }>('firing-program-library.json')
        .then(data => { firingPrograms.value = data.programs })
        .catch(() => { /* silent */ })
    }
    return _lazyPromises.firingPrograms
  }

  function loadBodyResponse() {
    if (!_lazyPromises.bodyResponse) {
      _lazyPromises.bodyResponse = loadJson<{ bodies: BodyDefinition[]; familyResponses: FamilyBodyResponse[] }>('body-response-matrix.json')
        .then(data => {
          bodyDefinitions.value = data.bodies
          familyResponses.value = data.familyResponses
        })
        .catch(() => { /* silent */ })
    }
    return _lazyPromises.bodyResponse
  }

  function loadStepProcedures() {
    if (!_lazyPromises.stepProcedures) {
      _lazyPromises.stepProcedures = loadJson<{ procedures: StepProcedure[] }>('step-by-step-instructions.json')
        .then(data => { stepProcedures.value = data.procedures })
        .catch(() => { /* silent */ })
    }
    return _lazyPromises.stepProcedures
  }

  /** Load all expansion panel data in one call (colour guides, firing programs, body response, playbooks) */
  async function loadExpansionPanelData() {
    await Promise.all([
      loadColourGuides(),
      loadFiringPrograms(),
      loadBodyResponse(),
      loadSwitchingPlaybooks(),
    ])
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

      // Load expansion data (non-blocking — UI renders before this finishes)
      // Note: colour guides, firing programs, body response, playbooks, and step
      // procedures are now fully lazy — loaded on demand by components that need them.
      Promise.all([
        loadJson<{ recipes: Recipe[] }>('recipes-expanded.json').catch(() => ({ recipes: [] })),
        loadJson<{ materials: ExpandedMaterial[] }>('materials-expanded.json').catch(() => ({ materials: [] })),
        loadJson<{ profiles: UMFBenchmarkProfile[]; diagnostics: UMFDiagnostic[] }>('umf-benchmarks-expanded.json').catch(() => ({ profiles: [], diagnostics: [] })),
      ]).then(([expRecipes, expMats, umfBench]) => {
        recipes.value = [...recipes.value, ...expRecipes.recipes]
        expandedMaterials.value = expMats.materials
        umfBenchmarks.value = umfBench.profiles
        umfDiagnostics.value = umfBench.diagnostics ?? []
      }).catch((e) => {
        console.error('[GlazeStore] Expansion data load error:', e)
      })

      // Dev-mode data integrity warnings
      if ((import.meta as any).env?.DEV) {
        const validFiringRanges = new Set(
          tax.taxonomies.firingRanges?.map((fr) => fr.id) ?? []
        )
        const validAtmospheres = new Set(
          tax.taxonomies.atmospheres?.map((a) => a.id) ?? []
        )
        const validStyles = new Set(
          tax.taxonomies.styles?.map((s) => s.id) ?? []
        )
        const validColours = new Set(
          tax.taxonomies.colours?.map((c) => c.id) ?? []
        )
        const validSurfaces = new Set(
          tax.taxonomies.surfaces?.map((s) => s.id) ?? []
        )
        const validKilns = new Set(
          tax.taxonomies.kilns?.map((k) => k.id) ?? []
        )
        const validClays = new Set(
          tax.taxonomies.clays?.map((c) => c.id) ?? []
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
          for (const aid of recipe.atmosphereIds ?? []) {
            if (validAtmospheres.size && !validAtmospheres.has(aid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown atmosphereId "${aid}"`)
            }
          }
          for (const sid of recipe.styleIds ?? []) {
            if (validStyles.size && !validStyles.has(sid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown styleId "${sid}"`)
            }
          }
          for (const cid of recipe.colourIds ?? []) {
            if (validColours.size && !validColours.has(cid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown colourId "${cid}"`)
            }
          }
          for (const sid of recipe.surfaceIds ?? []) {
            if (validSurfaces.size && !validSurfaces.has(sid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown surfaceId "${sid}"`)
            }
          }
          for (const kid of recipe.kilnIds ?? []) {
            if (validKilns.size && !validKilns.has(kid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown kilnId "${kid}"`)
            }
          }
          for (const cid of recipe.clayIds ?? []) {
            if (validClays.size && !validClays.has(cid)) {
              console.warn(`[DataIntegrity] Recipe "${recipe.id}" references unknown clayId "${cid}"`)
            }
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
    // Expansion data
    expandedMaterials,
    umfBenchmarks,
    umfDiagnostics,
    colourGuides,
    switchingPlaybooks,
    firingPrograms,
    bodyDefinitions,
    familyResponses,
    stepProcedures,
    // Expansion lookups
    expandedMaterialById,
    benchmarksByFiringRange,
    playbooksByMaterialId,
    // Lazy loaders
    loadColourGuides,
    loadFiringPrograms,
    loadBodyResponse,
    loadSwitchingPlaybooks,
    loadStepProcedures,
    loadExpansionPanelData,
  }
})
