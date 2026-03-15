<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import { useRouter } from 'vue-router'
import BatchCalculator from '@/components/calculator/BatchCalculator.vue'
import UMFDisplay from '@/components/calculator/UMFDisplay.vue'
import TagBadge from '@/components/ui/TagBadge.vue'
import { storeToRefs } from 'pinia'
import { cautions } from '@/data/cautions'
import { sources } from '@/data/sources'
import { findCombinationHints } from '@/data/colorant-combinations'
import { colorantHeuristics } from '@/data/materials-knowledge'

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

function hidePicker() {
  setTimeout(() => { showPicker.value = false }, 150)
}

// ── Recipe context data ───────────────────────────────────────────
const profile = computed(() => {
  if (!calculatorRecipe.value) return null
  const profileId = store.profileForRecipe.get(calculatorRecipe.value.id)
  return profileId ? store.colorProfileById.get(profileId) : null
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
    setTimeout(() => { copyLabel.value = 'Copy Recipe' }, 2000)
  } catch {
    copyLabel.value = 'Copy failed'
    setTimeout(() => { copyLabel.value = 'Copy Recipe' }, 2000)
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
    setTimeout(() => {
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
      <!-- Recipe picker -->
      <div class="picker-section">
        <div class="picker-header">
          <h2 class="picker-title">Load Recipe</h2>
          <button
            v-if="calculatorRecipe"
            class="btn btn-ghost"
            @click="workshop.clearCalculator()"
          >Clear</button>
        </div>

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

      <!-- Main panels -->
      <div class="calc-panels">
        <!-- Left: Batch calculator -->
        <div class="calc-main-panel" v-reveal.slide>
          <BatchCalculator />
        </div>

        <!-- Right: Reference panel -->
        <aside class="calc-side-panel" v-reveal.slide="{ delay: 0.1 }">

          <!-- Recipe overview card (only when loaded) -->
          <template v-if="calculatorRecipe">
            <div class="recipe-overview-card">
              <!-- Swatch strip -->
              <div class="overview-swatch" :style="{ background: swatchHex }">
                <div class="swatch-sheen" />
              </div>

              <div class="overview-body">
                <!-- Tags + name -->
                <div class="overview-tags">
                  <TagBadge :label="'Cone ' + calculatorRecipe.cone" variant="cone" />
                  <TagBadge
                    v-for="atm in calculatorRecipe.atmosphereIds"
                    :key="atm"
                    :label="atm"
                    variant="atmosphere"
                  />
                </div>
                <h3 class="overview-name">{{ calculatorRecipe.name }}</h3>
                <p v-if="profile?.appearance" class="overview-appearance">{{ profile.appearance }}</p>

                <!-- Tableware status inline -->
                <div class="overview-status" :class="calculatorRecipe.tablewareStatus">
                  <span class="status-icon">
                    {{ calculatorRecipe.tablewareStatus === 'functional' ? '✓' : calculatorRecipe.tablewareStatus === 'test-only' ? '⚠' : '◦' }}
                  </span>
                  <span>{{ calculatorRecipe.tablewareStatus.replace(/-/g, ' ') }}</span>
                </div>
              </div>
            </div>

            <!-- Cautions -->
            <div v-if="recipeCautions.length" class="cautions-block">
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
          </template>

          <!-- Batch Profile (weight bars + chemistry) -->
          <UMFDisplay
            :ingredients="scaledIngredients"
            :total-weight="totalWeight"
            :firing-range-id="calculatorRecipe?.firingRangeId"
          />

          <!-- Character scores -->
          <div v-if="scores" class="side-card">
            <h3 class="side-card-title">Character</h3>
            <div class="scores-grid">
              <div class="score-row">
                <span>Gloss</span>
                <span class="score-dots">{{ formatScore(scores.glossLevel) }}</span>
              </div>
              <div class="score-row">
                <span>Opacity</span>
                <span class="score-dots">{{ formatScore(scores.opacityLevel) }}</span>
              </div>
              <div class="score-row">
                <span>Variation</span>
                <span class="score-dots">{{ formatScore(scores.variationLevel) }}</span>
              </div>
              <div class="score-row">
                <span>Run risk</span>
                <span class="score-dots" :class="{ 'high-risk': scores.runRisk >= 4 }">
                  {{ formatScore(scores.runRisk) }}
                </span>
              </div>
              <div class="score-row">
                <span>Texture</span>
                <span class="score-dots">{{ formatScore(scores.textureLevel) }}</span>
              </div>
            </div>
          </div>

          <!-- Colorant combination hints -->
          <div v-if="combinationHints.length" class="side-card">
            <h3 class="side-card-title">Combined Colorant Effect</h3>
            <div class="combo-hints">
              <div v-for="hint in combinationHints" :key="hint.combined" class="combo-hint">
                <span class="combo-combined">{{ hint.combined }}</span>
                <p class="combo-note">{{ hint.note }}</p>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="calculatorRecipe?.notes.length" class="side-card">
            <h3 class="side-card-title">Notes</h3>
            <ul class="notes-list">
              <li v-for="(note, i) in calculatorRecipe.notes" :key="i">{{ note }}</li>
            </ul>
          </div>

          <!-- Similar recipes -->
          <div v-if="similarRecipes.length" class="side-card">
            <h3 class="side-card-title">Similar Recipes</h3>
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

          <!-- Sources & actions -->
          <template v-if="calculatorRecipe">
            <div v-if="recipeSources.length" class="sources-line">
              <span class="sources-label">Source:</span>
              <span v-for="(src, i) in recipeSources" :key="src!.id">
                <a v-if="src!.url" :href="src!.url" target="_blank" rel="noopener" class="source-link">{{ src!.name }}</a>
                <span v-else class="source-name">{{ src!.name }}</span>
                <span v-if="i < recipeSources.length - 1">, </span>
              </span>
            </div>

            <div class="side-actions">
              <button class="btn btn-primary" @click="duplicateAsCustom">
                ✎ Make My Version
              </button>
              <button class="btn btn-secondary" @click="openInWorkshop">
                Open in Workshop
              </button>
              <button class="btn btn-ghost" @click="copyRecipe">
                {{ copyLabel }}
              </button>
              <button class="btn btn-ghost" @click="saveScaledAsCustom">
                {{ saveScaledLabel }}
              </button>
            </div>
          </template>

          <!-- Empty state tips (no recipe loaded) -->
          <div v-if="!calculatorRecipe" class="tips-card">
            <h3 class="tips-title">How to use</h3>
            <ol class="tips-list">
              <li>Search and load a recipe above</li>
              <li>Enter your desired batch weight</li>
              <li>Use preset buttons for common sizes</li>
              <li>Ingredient weights and UMF chemistry update live</li>
              <li>Click ⇄ on any ingredient to explore substitutes</li>
            </ol>
          </div>

          <!-- Batch history -->
          <div v-if="workshop.batchHistory.length" class="batch-history">
            <h3 class="history-title">Recently Scaled</h3>
            <div class="history-list">
              <button
                v-for="(entry, i) in workshop.batchHistory.slice(0, 8)"
                :key="i"
                class="history-item"
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

        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calculator-view {
  min-height: 100vh;
  background: var(--cream);
}

.calc-header {
  background: var(--carbon);
  padding: calc(var(--nav-height) + var(--space-8)) var(--space-8) var(--space-8);
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

.breadcrumb-link:hover { color: var(--cream); }

.breadcrumb-sep {
  color: var(--stone-light);
  opacity: 0.5;
}

.breadcrumb-current {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--cream);
  letter-spacing: 0.03em;
}

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--cream);
}

.page-sub {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone-light);
  letter-spacing: 0.04em;
}

.calc-layout {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* ── Picker ── */
.picker-section {
  background: var(--chalk);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  border: 1px solid var(--ink-10);
  position: relative;
  overflow: visible;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.picker-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--carbon);
}

.picker-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  background: var(--cream);
  font-family: var(--font-body);
  font-size: var(--text-base);
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
  top: calc(100% - var(--space-4));
  left: var(--space-6);
  right: var(--space-6);
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
  padding: var(--space-3) var(--space-4);
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
  font-size: 11px;
  color: var(--stone);
}

/* ── Panels layout ── */
.calc-panels {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-6);
  align-items: start;
}

.calc-side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── Recipe overview card ── */
.recipe-overview-card {
  background: var(--chalk);
  border-radius: var(--radius-xl);
  border: 1px solid var(--ink-10);
  overflow: hidden;
}

.overview-swatch {
  height: 80px;
  position: relative;
}

.swatch-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
}

.overview-body {
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.overview-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.overview-name {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--carbon);
  line-height: 1.2;
}

.overview-appearance {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--stone);
  font-size: var(--text-sm);
}

.overview-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--stone);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--ink-05);
  width: fit-content;
}

.overview-status.functional { background: rgba(122, 143, 110, 0.15); color: var(--sage-dark); }
.overview-status.test-only { background: rgba(196, 83, 42, 0.1); color: var(--clay-dark); }

.status-icon { font-size: 11px; }

/* ── Cautions ── */
.cautions-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.caution-item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border-left: 3px solid;
}

.caution-item.info { background: rgba(122, 143, 110, 0.1); border-color: var(--sage); }
.caution-item.warning { background: rgba(196, 83, 42, 0.08); border-color: var(--clay); }
.caution-item.danger { background: rgba(192, 57, 43, 0.08); border-color: #c0392b; }

.caution-icon { font-size: var(--text-base); flex-shrink: 0; margin-top: 1px; line-height: 1.4; }
.caution-item.info .caution-icon { color: var(--sage-dark); }
.caution-item.warning .caution-icon { color: var(--clay); }
.caution-item.danger .caution-icon { color: #c0392b; }

.caution-text { display: flex; flex-direction: column; gap: 2px; }

.caution-text strong {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.caution-item.info .caution-text strong { color: var(--sage-dark); }
.caution-item.warning .caution-text strong { color: var(--clay-dark); }
.caution-item.danger .caution-text strong { color: #c0392b; }

.caution-text span {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

/* ── Generic side card ── */
.side-card {
  background: var(--chalk);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  border: 1px solid var(--ink-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.side-card-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone);
}

/* ── Character scores ── */
.scores-grid { display: flex; flex-direction: column; gap: var(--space-2); }

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

.score-dots.high-risk { color: #c0392b; }

/* ── Colorant combo hints ── */
.combo-hints { display: flex; flex-direction: column; gap: var(--space-3); }

.combo-hint {
  padding: var(--space-3) var(--space-4);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--clay);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
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
  gap: var(--space-2);
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

/* ── Similar recipes ── */
.similar-list { display: flex; flex-direction: column; gap: var(--space-2); }

.similar-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.similar-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.similar-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
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
  padding: 0 var(--space-1);
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

/* ── Actions ── */
.side-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Tips card (empty state) ── */
.tips-card {
  background: var(--parchment);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--ink-10);
}

.tips-title {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
  margin-bottom: var(--space-3);
}

.tips-list {
  list-style: decimal;
  padding-left: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tips-list li {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.5;
}

/* Batch history */
.batch-history {
  background: var(--parchment);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--ink-10);
}

.history-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  margin-bottom: var(--space-3);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--chalk);
  border: 1px solid var(--ink-05);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;
}

.history-item:hover {
  border-color: var(--clay);
  transform: translateX(3px);
}

.history-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.history-weight {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--clay);
  font-weight: 700;
  flex-shrink: 0;
  margin-left: var(--space-2);
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 960px) {
  .calc-panels { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .calc-layout { padding: var(--space-4); }
}
</style>
