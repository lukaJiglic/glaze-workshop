<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import { useRouter } from 'vue-router'
import BatchCalculator from '@/components/calculator/BatchCalculator.vue'
import UMFDisplay from '@/components/calculator/UMFDisplay.vue'
import TagBadge from '@/components/ui/TagBadge.vue'
import ColourGuidePanel from '@/components/recipe/ColourGuidePanel.vue'
import FiringProgramPanel from '@/components/recipe/FiringProgramPanel.vue'
import BodyResponsePanel from '@/components/recipe/BodyResponsePanel.vue'
import { storeToRefs } from 'pinia'
import { cautions } from '@/data/cautions'
import { sources } from '@/data/sources'
import { findCombinationHints } from '@/data/colorant-combinations'
import { colorantHeuristics } from '@/data/materials-knowledge'
import { getMaterialCostTier, type CostTier } from '@/data/material-analyses'

const store = useGlazeStore()
const workshop = useWorkshopStore()
const router = useRouter()
const { scaledIngredients, totalWeight, calculatorRecipe } = storeToRefs(workshop)

// ── Recipe picker ─────────────────────────────────────────────────
const searchQuery = ref('')
const showPicker = ref(false)

const filteredForPicker = computed(() => {
  if (!searchQuery.value) return store.recipes.slice(0, 20)
  const q = searchQuery.value.toLowerCase()
  return store.recipes.filter(r => r.name.toLowerCase().includes(q)).slice(0, 20)
})

const _timeoutIds: ReturnType<typeof setTimeout>[] = []
function safeTimeout(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    const idx = _timeoutIds.indexOf(id)
    if (idx !== -1) _timeoutIds.splice(idx, 1)
    fn()
  }, ms)
  _timeoutIds.push(id)
}

function hidePicker() {
  safeTimeout(() => { showPicker.value = false }, 150)
}

// ── Recipe context data ───────────────────────────────────────────
const profileId = computed(() => {
  if (!calculatorRecipe.value) return null
  return store.profileForRecipe.get(calculatorRecipe.value.id) ?? null
})

const profile = computed(() => {
  return profileId.value ? store.colorProfileById.get(profileId.value) : null
})

const swatchHex = computed(() => profile.value?.swatchHex ?? '#ede6d6')

const scores = computed(() => {
  if (!calculatorRecipe.value) return null
  return store.getScores(calculatorRecipe.value.id, calculatorRecipe.value.firingRangeId)
})

const recipeCautions = computed(() =>
  (calculatorRecipe.value?.cautionIds ?? [])
    .map(id => cautions.get(id))
    .filter(Boolean)
)

const recipeSources = computed(() =>
  (calculatorRecipe.value?.sourceIds ?? [])
    .map(id => sources.get(id))
    .filter(Boolean)
)

const colorantIds = computed(() =>
  (calculatorRecipe.value?.ingredients ?? [])
    .map(i => i.materialId)
    .filter(id => colorantHeuristics.has(id))
)

const combinationHints = computed(() =>
  colorantIds.value.length >= 2 ? findCombinationHints(colorantIds.value) : []
)

const similarRecipes = computed(() => {
  if (!calculatorRecipe.value) return []
  const current = calculatorRecipe.value
  const currentIds = new Set(current.ingredients.map(i => i.materialId))
  const pool = store.recipes.filter(r =>
    r.id !== current.id && r.firingRangeId === current.firingRangeId
  )
  const scored = pool.map(r => {
    const candidateIds = r.ingredients.map(i => i.materialId)
    const matches = candidateIds.filter(id => currentIds.has(id)).length
    const score = matches / Math.max(currentIds.size, candidateIds.length)
    return { recipe: r, score }
  }).filter(s => s.score >= 0.25)
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 4).map(s => s.recipe)
})

// ── Cross-range similar ─────────────────────────────────────────
const crossRangeSimilar = computed(() => {
  if (!calculatorRecipe.value) return []
  const current = calculatorRecipe.value
  const currentIds = new Set(current.ingredients.map(i => i.materialId))
  const pool = store.recipes.filter(r =>
    r.id !== current.id && r.firingRangeId !== current.firingRangeId
  )
  const scored = pool.map(r => {
    const matches = r.ingredients.filter(i => currentIds.has(i.materialId)).length
    return { recipe: r, matches }
  }).filter(s => s.matches >= 3)
  scored.sort((a, b) => b.matches - a.matches)
  return scored.slice(0, 3).map(s => s.recipe)
})

// ── Visual twins ────────────────────────────────────────────────
const visualTwins = computed(() => {
  if (!calculatorRecipe.value) return []
  const current = calculatorRecipe.value
  const currentProfile = profileId.value
  const currentSurfaces = new Set(current.surfaceIds)
  const currentIds = new Set(current.ingredients.map(i => i.materialId))

  if (!currentProfile && currentSurfaces.size === 0) return []

  const pool = store.recipes.filter(r => r.id !== current.id)

  return pool.filter(r => {
    const rProfile = store.profileForRecipe.get(r.id)
    const colorMatch = currentProfile && rProfile && (() => {
      const cp = store.colorProfileById.get(currentProfile)
      const rp = store.colorProfileById.get(rProfile)
      return cp && rp && cp.familyId === rp.familyId
    })()
    const surfaceMatch = r.surfaceIds.some(s => currentSurfaces.has(s))
    if (!colorMatch && !surfaceMatch) return false

    const rIds = new Set(r.ingredients.map(i => i.materialId))
    const overlap = [...currentIds].filter(id => rIds.has(id)).length
    const maxLen = Math.max(currentIds.size, rIds.size)
    return overlap / maxLen < 0.3
  }).slice(0, 3)
})

// ── Colour development guides ───────────────────────────────────
const matchingColourGuides = computed(() => {
  if (!calculatorRecipe.value || !store.colourGuides.length) return []
  const r = calculatorRecipe.value
  const rColours = new Set(r.colourIds)
  const rSurfaces = new Set(r.surfaceIds)

  return store.colourGuides.filter(g => {
    if (g.referenceRecipeIds.includes(r.id)) return true
    const gId = g.id.toLowerCase()
    for (const c of rColours) {
      if (gId.includes(c.toLowerCase())) return true
    }
    if (gId.includes('floating') && (rSurfaces.has('variegated') || rSurfaces.has('breaking'))) return true
    return false
  })
})

// ── Firing programs ─────────────────────────────────────────────
const matchingFiringPrograms = computed(() => {
  if (!calculatorRecipe.value || !store.firingPrograms.length) return []
  const r = calculatorRecipe.value
  const cone = r.cone.toLowerCase()
  const firingRange = r.firingRangeId

  return store.firingPrograms.filter(p => {
    if (p.kind === 'bisque') return false
    const target = p.targetConeOrRange.toLowerCase()
    if (target.includes(cone)) return true
    if (firingRange === 'low-fire' && (target.includes('04') || target.includes('06') || target.includes('02'))) return true
    if (firingRange === 'mid-fire' && (target.includes('5') || target.includes('6'))) return true
    if (firingRange === 'high-fire' && (target.includes('9') || target.includes('10') || target.includes('11'))) return true
    return false
  })
})

// ── Body response ───────────────────────────────────────────────
const matchingBodyResponse = computed(() => {
  if (!calculatorRecipe.value || !store.familyResponses.length) return null
  const r = calculatorRecipe.value

  let match = store.familyResponses.find(fr =>
    fr.referenceRecipeIds.includes(r.id)
  )
  if (match) return match

  const rSurfaces = new Set(r.surfaceIds)
  match = store.familyResponses.find(fr => {
    const fId = fr.id.toLowerCase()
    if (r.firingRangeId === 'low-fire' && fId.includes('lowfire')) {
      if (rSurfaces.has('glossy') && fId.includes('clear')) return true
    }
    if (r.firingRangeId === 'mid-fire' && fId.includes('cone6')) {
      if (rSurfaces.has('glossy') && fId.includes('clear')) return true
      if (rSurfaces.has('matte') && fId.includes('matte')) return true
    }
    if (r.firingRangeId === 'high-fire' && fId.includes('highfire')) return true
    return false
  })
  return match ?? null
})

// ── User notes ──────────────────────────────────────────────────
const newNote = ref('')

function submitNote() {
  if (!newNote.value.trim() || !calculatorRecipe.value) return
  workshop.addUserNote(calculatorRecipe.value.id, newNote.value.trim())
  newNote.value = ''
}

// ── Actions ───────────────────────────────────────────────────────
const copyLabel = ref('Copy Recipe')

async function copyRecipe() {
  if (!calculatorRecipe.value) return
  const r = calculatorRecipe.value
  const lines = [
    r.name,
    `Cone: ${r.cone} | ${r.atmosphereIds.join(', ')}`,
    '',
    'Ingredients:',
    ...r.ingredients.map(i => `  ${i.sourceLabel}: ${i.amount}%`),
    '',
    ...(r.notes.length ? ['Notes:', ...r.notes.map(n => `  ${n}`)] : []),
  ]
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copyLabel.value = 'Copied!'
    safeTimeout(() => { copyLabel.value = 'Copy Recipe' }, 2000)
  } catch {
    copyLabel.value = 'Copy failed'
    safeTimeout(() => { copyLabel.value = 'Copy Recipe' }, 2000)
  }
}

function duplicateAsCustom() {
  if (!calculatorRecipe.value) return
  const custom = workshop.duplicateRecipeAsCustom(calculatorRecipe.value)
  router.push(`/my-recipes/${custom.id}`)
}

const saveScaledLabel = ref('Save Batch as Recipe')

function saveScaledAsCustom() {
  const result = workshop.saveScaledAsCustom()
  if (result) {
    saveScaledLabel.value = 'Saved!'
    safeTimeout(() => {
      saveScaledLabel.value = 'Save Batch as Recipe'
      router.push(`/my-recipes/${result.id}`)
    }, 1200)
  }
}

function openInWorkshop() {
  if (!calculatorRecipe.value) return
  workshop.openRecipe(calculatorRecipe.value)
  router.push('/workshop')
}

function formatScore(val: number): string {
  return '●'.repeat(val) + '○'.repeat(5 - val)
}

// ── Cost estimation ────────────────────────────────────────────────
const costTierLabels: Record<CostTier, string> = { cheap: 'Budget', moderate: 'Moderate', expensive: 'Premium' }
const costTierColors: Record<CostTier, string> = { cheap: 'var(--sage)', moderate: 'var(--stone)', expensive: 'var(--clay)' }

const costEstimate = computed(() => {
  if (!scaledIngredients.value.length) return null
  let cheapWeight = 0, moderateWeight = 0, expensiveWeight = 0
  for (const ing of scaledIngredients.value) {
    const tier = getMaterialCostTier(ing.materialId)
    if (tier === 'cheap') cheapWeight += ing.scaledGrams
    else if (tier === 'moderate') moderateWeight += ing.scaledGrams
    else expensiveWeight += ing.scaledGrams
  }
  const total = cheapWeight + moderateWeight + expensiveWeight
  if (total === 0) return null

  // Determine dominant tier
  let overall: CostTier = 'cheap'
  if (expensiveWeight / total > 0.1) overall = 'expensive'
  else if (moderateWeight / total > 0.4) overall = 'moderate'

  const expensiveItems = scaledIngredients.value
    .filter(i => getMaterialCostTier(i.materialId) === 'expensive')
    .map(i => i.sourceLabel)

  return {
    overall,
    overallLabel: costTierLabels[overall],
    cheapPct: Math.round((cheapWeight / total) * 100),
    moderatePct: Math.round((moderateWeight / total) * 100),
    expensivePct: Math.round((expensiveWeight / total) * 100),
    expensiveItems,
  }
})

// ── Record batch to history ───────────────────────────────────────
watch(
  () => [calculatorRecipe.value?.id, workshop.batchWeight] as const,
  ([recipeId, weight]) => {
    if (recipeId && calculatorRecipe.value && weight > 0) {
      workshop.recordBatchScale(recipeId, calculatorRecipe.value.name, weight)
    }
  },
)

// ── Mount animation ───────────────────────────────────────────────
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
  <div class="calculator-view">
    <!-- Header -->
    <div ref="headerEl" class="calc-header">
      <div class="calc-header-inner">
        <div class="breadcrumb">
          <RouterLink to="/workshop" class="breadcrumb-link">Workshop</RouterLink>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-current">Calculator</span>
        </div>
        <h1 class="page-title">Batch Calculator</h1>
        <p class="page-sub">Scale any recipe by batch weight — with live chemistry and full recipe reference</p>
      </div>
    </div>

    <div class="calc-layout">
      <!-- ═══ TOP ROW: Picker + Overview + Actions compact ═══ -->
      <div class="top-bar">
        <div class="picker-area">
          <div class="picker-header">
            <h2 class="picker-title">Load Recipe</h2>
            <button
              v-if="calculatorRecipe"
              class="btn btn-ghost btn-sm"
              @click="workshop.clearCalculator()"
            >Clear</button>
          </div>
          <div class="picker-input-wrap">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search recipes to load…"
              class="picker-input"
              @focus="showPicker = true"
              @blur="hidePicker"
            />
            <Transition name="fade">
              <div v-if="showPicker" class="picker-dropdown">
                <button
                  v-for="recipe in filteredForPicker"
                  :key="recipe.id"
                  class="picker-item"
                  :class="{ active: calculatorRecipe?.id === recipe.id }"
                  @mousedown.prevent="workshop.loadRecipeIntoCalculator(recipe); showPicker = false; searchQuery = ''"
                >
                  <span class="picker-name">{{ recipe.name }}</span>
                  <span class="picker-meta">C{{ recipe.cone }} · {{ recipe.ingredients.length }} materials</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Compact recipe identity (when loaded) -->
        <div v-if="calculatorRecipe" class="identity-strip">
          <div class="identity-swatch" :style="{ background: swatchHex }" />
          <div class="identity-info">
            <h3 class="identity-name">{{ calculatorRecipe.name }}</h3>
            <div class="identity-tags">
              <TagBadge :label="'Cone ' + calculatorRecipe.cone" variant="cone" />
              <TagBadge
                v-for="atm in calculatorRecipe.atmosphereIds"
                :key="atm"
                :label="atm"
                variant="atmosphere"
              />
              <span class="tw-status" :class="calculatorRecipe.tablewareStatus">
                {{ calculatorRecipe.tablewareStatus.replace(/-/g, ' ') }}
              </span>
            </div>
          </div>
          <div class="identity-actions">
            <button class="btn btn-primary btn-sm" @click="duplicateAsCustom">Make My Version</button>
            <button class="btn btn-ghost btn-sm" @click="openInWorkshop">Workshop</button>
            <button class="btn btn-ghost btn-sm" @click="copyRecipe">{{ copyLabel }}</button>
            <button class="btn btn-ghost btn-sm" @click="saveScaledAsCustom">{{ saveScaledLabel }}</button>
          </div>
        </div>

        <!-- Empty state (no recipe) -->
        <div v-else class="empty-hint">
          <p class="empty-hint-text">Search and load a recipe to start scaling</p>
        </div>
      </div>

      <!-- ═══ MAIN: Calculator + Chemistry side by side ═══ -->
      <div class="main-row">
        <div class="calc-main-panel" v-reveal.slide>
          <BatchCalculator />
        </div>

        <div class="calc-chemistry-panel" v-reveal.slide="{ delay: 0.1 }">
          <UMFDisplay
            :ingredients="scaledIngredients"
            :total-weight="totalWeight"
            :firing-range-id="calculatorRecipe?.firingRangeId"
          />
        </div>
      </div>

      <!-- ═══ REFERENCE GRID: all contextual info ═══ -->
      <div v-if="calculatorRecipe" class="ref-grid" v-reveal="{ delay: 0.15 }">
        <!-- Cautions -->
        <div v-if="recipeCautions.length" class="ref-card">
          <h3 class="ref-card-title">Cautions</h3>
          <div class="cautions-list">
            <div
              v-for="caution in recipeCautions"
              :key="caution!.id"
              class="caution-item"
              :class="caution!.severity"
            >
              <span class="caution-icon">
                {{ caution!.severity === 'danger' ? '⚠' : caution!.severity === 'warning' ? '!' : 'ℹ' }}
              </span>
              <div class="caution-text">
                <strong>{{ caution!.label }}</strong>
                <span>{{ caution!.description }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Character scores -->
        <div v-if="scores" class="ref-card">
          <h3 class="ref-card-title">Character</h3>
          <div class="scores-grid">
            <div class="score-row"><span>Gloss</span><span class="score-dots">{{ formatScore(scores.glossLevel) }}</span></div>
            <div class="score-row"><span>Opacity</span><span class="score-dots">{{ formatScore(scores.opacityLevel) }}</span></div>
            <div class="score-row"><span>Variation</span><span class="score-dots">{{ formatScore(scores.variationLevel) }}</span></div>
            <div class="score-row"><span>Run risk</span><span class="score-dots" :class="{ 'high-risk': scores.runRisk >= 4 }">{{ formatScore(scores.runRisk) }}</span></div>
            <div class="score-row"><span>Texture</span><span class="score-dots">{{ formatScore(scores.textureLevel) }}</span></div>
          </div>
        </div>

        <!-- Cost estimate -->
        <div v-if="costEstimate" class="ref-card">
          <h3 class="ref-card-title">Cost Estimate</h3>
          <div class="cost-overview">
            <span class="cost-tier-badge" :style="{ color: costTierColors[costEstimate.overall] }">
              {{ costEstimate.overallLabel }}
            </span>
          </div>
          <div class="cost-bar">
            <div class="cost-bar-seg cheap" :style="{ width: costEstimate.cheapPct + '%' }" :title="'Budget: ' + costEstimate.cheapPct + '%'" />
            <div class="cost-bar-seg moderate" :style="{ width: costEstimate.moderatePct + '%' }" :title="'Moderate: ' + costEstimate.moderatePct + '%'" />
            <div class="cost-bar-seg expensive" :style="{ width: costEstimate.expensivePct + '%' }" :title="'Premium: ' + costEstimate.expensivePct + '%'" />
          </div>
          <div class="cost-legend">
            <span class="cost-legend-item"><span class="cost-dot cheap" /> Budget {{ costEstimate.cheapPct }}%</span>
            <span class="cost-legend-item"><span class="cost-dot moderate" /> Moderate {{ costEstimate.moderatePct }}%</span>
            <span class="cost-legend-item"><span class="cost-dot expensive" /> Premium {{ costEstimate.expensivePct }}%</span>
          </div>
          <p v-if="costEstimate.expensiveItems.length" class="cost-note">
            Premium materials: {{ costEstimate.expensiveItems.join(', ') }}
          </p>
        </div>

        <!-- Colorant combination hints -->
        <div v-if="combinationHints.length" class="ref-card">
          <h3 class="ref-card-title">Colorant Effects</h3>
          <div class="combo-hints">
            <div v-for="hint in combinationHints" :key="hint.combined" class="combo-hint">
              <span class="combo-combined">{{ hint.combined }}</span>
              <p class="combo-note">{{ hint.note }}</p>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="calculatorRecipe?.notes.length" class="ref-card">
          <h3 class="ref-card-title">Notes</h3>
          <ul class="notes-list">
            <li v-for="(note, i) in calculatorRecipe.notes" :key="i">{{ note }}</li>
          </ul>
        </div>

        <!-- User notes -->
        <div class="ref-card">
          <h3 class="ref-card-title">My Notes</h3>
          <ul v-if="workshop.getUserNotes(calculatorRecipe.id).length" class="notes-list user-notes">
            <li v-for="(note, i) in workshop.getUserNotes(calculatorRecipe.id)" :key="i" class="user-note-row">
              <span>{{ note }}</span>
              <button class="note-remove" @click="workshop.removeUserNote(calculatorRecipe.id, i)">×</button>
            </li>
          </ul>
          <div class="note-input-row">
            <input
              v-model="newNote"
              class="note-input"
              placeholder="Add a note…"
              @keydown.enter="submitNote"
            />
            <button class="note-add-btn" @click="submitNote" :disabled="!newNote.trim()">Add</button>
          </div>
        </div>

        <!-- Similar recipes -->
        <div v-if="similarRecipes.length" class="ref-card">
          <h3 class="ref-card-title">Similar Recipes</h3>
          <div class="similar-list">
            <button
              v-for="sim in similarRecipes"
              :key="sim.id"
              class="similar-card"
              @click="workshop.loadRecipeIntoCalculator(sim)"
            >
              <div
                class="similar-swatch"
                :style="{ background: store.colorProfileById.get(store.profileForRecipe.get(sim.id) ?? '')?.swatchHex ?? '#ede6d6' }"
              />
              <div class="similar-info">
                <span class="similar-name">{{ sim.name }}</span>
                <span class="similar-cone">C{{ sim.cone }} · {{ sim.ingredients.length }} materials</span>
              </div>
              <span class="similar-load">Load</span>
            </button>
          </div>
        </div>

        <!-- Cross-range similar -->
        <div v-if="crossRangeSimilar.length" class="ref-card">
          <h3 class="ref-card-title">Similar at Other Temps</h3>
          <div class="similar-list">
            <button
              v-for="sim in crossRangeSimilar"
              :key="sim.id"
              class="similar-card"
              @click="workshop.loadRecipeIntoCalculator(sim)"
            >
              <div
                class="similar-swatch"
                :style="{ background: store.colorProfileById.get(store.profileForRecipe.get(sim.id) ?? '')?.swatchHex ?? '#ede6d6' }"
              />
              <div class="similar-info">
                <span class="similar-name">{{ sim.name }}</span>
                <span class="similar-cone">C{{ sim.cone }} · {{ sim.firingRangeId.replace(/-/g, ' ') }}</span>
              </div>
              <span class="similar-load">Load</span>
            </button>
          </div>
        </div>

        <!-- Visual twins -->
        <div v-if="visualTwins.length" class="ref-card">
          <h3 class="ref-card-title">Visual Twins</h3>
          <p class="ref-card-hint">Same look, different path</p>
          <div class="similar-list">
            <button
              v-for="twin in visualTwins"
              :key="twin.id"
              class="similar-card"
              @click="workshop.loadRecipeIntoCalculator(twin)"
            >
              <div
                class="similar-swatch"
                :style="{ background: store.colorProfileById.get(store.profileForRecipe.get(twin.id) ?? '')?.swatchHex ?? '#ede6d6' }"
              />
              <div class="similar-info">
                <span class="similar-name">{{ twin.name }}</span>
                <span class="similar-cone">C{{ twin.cone }} · {{ twin.ingredients.length }} materials</span>
              </div>
              <span class="similar-load">Load</span>
            </button>
          </div>
        </div>

        <!-- Sources -->
        <div v-if="recipeSources.length" class="ref-card ref-card-flat">
          <div class="sources-line">
            <span class="sources-label">Source:</span>
            <span v-for="(src, i) in recipeSources" :key="src!.id">
              <a v-if="src!.url" :href="src!.url" target="_blank" rel="noopener" class="source-link">{{ src!.name }}</a>
              <span v-else class="source-name">{{ src!.name }}</span>
              <span v-if="i < recipeSources.length - 1">, </span>
            </span>
          </div>
        </div>
      </div>

      <!-- ═══ EXPANSION: Colour guide, firing programs, body response — full width ═══ -->
      <div v-if="calculatorRecipe && (matchingColourGuides.length || matchingFiringPrograms.length || matchingBodyResponse)" class="expansion-row">
        <div v-if="matchingColourGuides.length" class="expansion-card" v-reveal="{ delay: 0.2 }">
          <h3 class="ref-card-title">Colour Development Guide</h3>
          <ColourGuidePanel :guides="matchingColourGuides" />
        </div>

        <div v-if="matchingFiringPrograms.length" class="expansion-card" v-reveal="{ delay: 0.25 }">
          <h3 class="ref-card-title">Firing Programs</h3>
          <FiringProgramPanel :programs="matchingFiringPrograms" />
        </div>

        <div v-if="matchingBodyResponse" class="expansion-card" v-reveal="{ delay: 0.3 }">
          <h3 class="ref-card-title">Body Response</h3>
          <p class="ref-card-hint">How this glaze behaves on different clays</p>
          <BodyResponsePanel :responses="matchingBodyResponse.responses" :bodies="store.bodyDefinitions" />
        </div>
      </div>

      <!-- ═══ BATCH HISTORY ═══ -->
      <div v-if="workshop.batchHistory.length" class="history-row" v-reveal="{ delay: 0.2 }">
        <h3 class="history-title">Recently Scaled</h3>
        <div class="history-scroll">
          <button
            v-for="(entry, i) in workshop.batchHistory.slice(0, 12)"
            :key="i"
            class="history-chip"
            @mousedown.prevent="() => {
              const recipe = store.recipeById.get(entry.recipeId)
              if (recipe) {
                workshop.loadRecipeIntoCalculator(recipe)
                workshop.batchWeight = entry.weight
                showPicker = false
              }
            }"
          >
            <span class="history-name">{{ entry.recipeName }}</span>
            <span class="history-weight">{{ entry.weight }}g</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calculator-view {
  min-height: 100vh;
  background: var(--cream);
}

/* ── Header ── */
.calc-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-6)) var(--space-8) var(--space-6);
}

.calc-header-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-1);
}

.breadcrumb-link {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone-light);
  text-decoration: none;
  letter-spacing: 0.03em;
}

.breadcrumb-link:hover { color: var(--on-band); }

.breadcrumb-sep {
  color: var(--stone-light);
  opacity: 0.5;
}

.breadcrumb-current {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--on-band);
  letter-spacing: 0.03em;
}

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

/* ── Layout ── */
.calc-layout {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* ═══ TOP BAR — Picker + Identity strip ═══ */
.top-bar {
  display: flex;
  gap: var(--space-4);
  align-items: stretch;
}

.picker-area {
  width: 320px;
  flex-shrink: 0;
  background: var(--chalk);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--ink-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
}

.picker-input-wrap {
  position: relative;
}

.picker-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  background: var(--cream);
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
  max-height: 320px;
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

.picker-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  font-weight: 500;
}

.picker-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

/* ── Identity strip ── */
.identity-strip {
  flex: 1;
  min-width: 0;
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
}

.identity-swatch {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
}

.identity-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.identity-name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--carbon);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.identity-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  align-items: center;
}

.tw-status {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--ink-05);
  color: var(--stone);
}

.tw-status.functional { background: var(--sage-15); color: var(--sage-dark); }
.tw-status.test-only { background: var(--clay-10); color: var(--clay); }

.identity-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  flex-shrink: 0;
}

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--parchment);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--ink-10);
  padding: var(--space-4);
}

.empty-hint-text {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  font-style: italic;
}

/* ═══ MAIN ROW — Calculator + Chemistry ═══ */
.main-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  align-items: start;
}

.calc-chemistry-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ═══ REFERENCE GRID ═══ */
.ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.ref-card {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--ink-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ref-card-flat {
  padding: var(--space-3) var(--space-4);
}

.ref-card-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone);
}

.ref-card-hint {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-style: italic;
  color: var(--stone);
  margin-top: -2px;
}

/* ── Cautions ── */
.cautions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.caution-item {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border-left: 3px solid;
}

.caution-item.info { background: var(--sage-10); border-color: var(--sage); }
.caution-item.warning { background: var(--clay-08); border-color: var(--clay); }
.caution-item.danger { background: var(--danger-10); border-color: var(--danger); }

.caution-icon { font-size: var(--text-sm); flex-shrink: 0; margin-top: 1px; line-height: 1.4; }
.caution-item.info .caution-icon { color: var(--sage-dark); }
.caution-item.warning .caution-icon { color: var(--clay); }
.caution-item.danger .caution-icon { color: var(--danger); }

.caution-text { display: flex; flex-direction: column; gap: 1px; }

.caution-text strong {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.caution-item.info .caution-text strong { color: var(--sage-dark); }
.caution-item.warning .caution-text strong { color: var(--clay-dark); }
.caution-item.danger .caution-text strong { color: var(--danger); }

.caution-text span {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

/* ── Scores ── */
.scores-grid { display: flex; flex-direction: column; gap: var(--space-1); }

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
}

.score-dots {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--clay);
  letter-spacing: 2px;
}

.score-dots.high-risk { color: var(--danger); }

/* ── Cost estimate ── */
.cost-overview {
  margin-bottom: var(--space-2);
}

.cost-tier-badge {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cost-bar {
  display: flex;
  height: 12px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--ink-05);
}

.cost-bar-seg {
  height: 100%;
  transition: width 0.4s ease;
  min-width: 0;
}

.cost-bar-seg.cheap { background: var(--sage); }
.cost-bar-seg.moderate { background: var(--stone); }
.cost-bar-seg.expensive { background: var(--clay); }

.cost-legend {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.cost-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.cost-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.cost-dot.cheap { background: var(--sage); }
.cost-dot.moderate { background: var(--stone); }
.cost-dot.expensive { background: var(--clay); }

.cost-note {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--clay-dark);
  font-style: italic;
  margin-top: var(--space-2);
  line-height: 1.5;
}

/* ── Colorant hints ── */
.combo-hints { display: flex; flex-direction: column; gap: var(--space-2); }

.combo-hint {
  padding: var(--space-2) var(--space-3);
  background: var(--parchment);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--clay);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.combo-combined {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--carbon);
}

.combo-note {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  line-height: 1.5;
  font-style: italic;
}

/* ── Notes ── */
.notes-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.notes-list li {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  padding-left: var(--space-4);
  position: relative;
  line-height: 1.55;
}

.notes-list li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: var(--stone);
}

/* ── User notes ── */
.user-notes li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.user-note-row {
  padding-right: 0;
}

.user-note-row span {
  flex: 1;
}

.note-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-base);
  color: var(--stone);
  flex-shrink: 0;
  line-height: 1;
  padding: 0 2px;
  transition: color var(--transition-fast);
}

.note-remove:hover { color: var(--danger); }

.note-input-row {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.note-input {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  background: var(--cream);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  outline: none;
  transition: border-color var(--transition-fast);
}

.note-input:focus { border-color: var(--clay); }

.note-add-btn {
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: var(--clay);
  color: white;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.note-add-btn:hover { background: var(--clay-dark, #a0522d); }
.note-add-btn:disabled { opacity: 0.4; cursor: default; }

/* ── Similar recipes ── */
.similar-list { display: flex; flex-direction: column; gap: var(--space-1); }

.similar-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--ink-10);
  background: var(--parchment);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all var(--transition-fast);
}

.similar-card:hover {
  border-color: var(--clay);
  background: var(--clay-10);
}

.similar-swatch {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.similar-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.similar-name {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--carbon);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.similar-cone {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.similar-load {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--clay);
  opacity: 0;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}

.similar-card:hover .similar-load { opacity: 1; }

/* ── Sources ── */
.sources-line {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
}

.sources-label {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 10px;
}

.source-link {
  color: var(--clay);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition-fast);
}

.source-link:hover { color: var(--clay-dark); }
.source-name { color: var(--stone); }

/* ═══ EXPANSION ROW — full-width deep data ═══ */
.expansion-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-5);
}

.expansion-card {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--ink-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ═══ HISTORY ROW ═══ */
.history-row {
  background: var(--parchment);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--ink-10);
}

.history-title {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  margin-bottom: var(--space-2);
}

.history-scroll {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
  -webkit-overflow-scrolling: touch;
}

.history-scroll::-webkit-scrollbar { height: 4px; }
.history-scroll::-webkit-scrollbar-track { background: var(--ink-05); border-radius: 2px; }
.history-scroll::-webkit-scrollbar-thumb { background: var(--ink-20); border-radius: 2px; }

.history-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--chalk);
  border: 1px solid var(--ink-05);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
}

.history-chip:hover {
  border-color: var(--clay);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.history-chip .history-name {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-chip .history-weight {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--clay);
  font-weight: 700;
}

/* ── Buttons ── */
.btn {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}

.btn-primary {
  background: var(--clay);
  color: white;
}

.btn-primary:hover {
  background: var(--clay-dark, #a0522d);
}

.btn-secondary {
  background: var(--sage);
  color: white;
}

.btn-secondary:hover { opacity: 0.9; }

.btn-ghost {
  background: transparent;
  color: var(--stone);
  border: 1px solid var(--ink-10);
}

.btn-ghost:hover {
  border-color: var(--clay);
  color: var(--clay);
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 1080px) {
  .top-bar { flex-direction: column; }
  .picker-area { width: 100%; }
  .identity-strip { flex-wrap: wrap; }
  .identity-actions { width: 100%; justify-content: flex-start; }
}

@media (max-width: 960px) {
  .main-row { grid-template-columns: 1fr; }
  .ref-grid { grid-template-columns: 1fr; }
  .expansion-row { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .calc-layout { padding: var(--space-4); }
  .calc-header { padding-left: var(--space-4); padding-right: var(--space-4); }
  .identity-strip { flex-direction: column; align-items: flex-start; }
}
</style>
