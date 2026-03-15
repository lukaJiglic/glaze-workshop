<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkshopStore } from '@/stores/workshop'
import { useGlazeStore } from '@/stores/glaze'
import { materialInfo, changeImpacts, substitutions, colorantHeuristics } from '@/data/materials-knowledge'
import { cautions } from '@/data/cautions'
import type { SubstitutionOption } from '@/data/materials-knowledge'
import TagBadge from '@/components/ui/TagBadge.vue'
import IngredientSwitcher from '@/components/recipe/IngredientSwitcher.vue'
import { useDebounceFn } from '@vueuse/core'
import type { CustomRecipe, Ingredient } from '@/types'
import { useGlazeChemistry } from '@/composables/useGlazeChemistry'
import ChemistryPanel from '@/components/recipe/ChemistryPanel.vue'

const route = useRoute()
const router = useRouter()
const workshopStore = useWorkshopStore()
const glazeStore = useGlazeStore()

// ── Editable recipe state ──────────────────────────────────────────
const editableRecipe = ref<CustomRecipe | null>(null)
const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle')
const expandedImpactPanels = ref<Set<number>>(new Set())
const openSwitcherIndex = ref<number | null>(null)
const swapToast = ref<{ fromLabel: string; toLabel: string } | null>(null)

// ── Firing & atmosphere options ────────────────────────────────────
const firingOptions = [
  { id: 'low-fire', label: 'Low-fire' },
  { id: 'mid-fire', label: 'Mid-fire' },
  { id: 'high-fire', label: 'High-fire' },
  { id: 'raku', label: 'Raku' },
]

const atmosphereOptions = [
  { id: 'oxidation', label: 'Oxidation' },
  { id: 'reduction', label: 'Reduction' },
  { id: 'neutral', label: 'Neutral' },
]

// ── Caution options ───────────────────────────────────────────────
const cautionOptions = computed(() => {
  const items: { id: string; label: string; severity: string }[] = []
  cautions.forEach((c, id) => { items.push({ id, label: c.label, severity: c.severity }) })
  return items.sort((a, b) => a.label.localeCompare(b.label))
})

function toggleCaution(id: string) {
  if (!editableRecipe.value) return
  if (!editableRecipe.value.cautionIds) editableRecipe.value.cautionIds = []
  const idx = editableRecipe.value.cautionIds.indexOf(id)
  if (idx === -1) {
    editableRecipe.value.cautionIds.push(id)
  } else {
    editableRecipe.value.cautionIds.splice(idx, 1)
  }
}

// ── Surface & style options ──────────────────────────────────────
const surfaceOptions = computed(() => {
  const surfaces = new Set<string>()
  for (const r of glazeStore.recipes) {
    for (const s of r.surfaceIds) surfaces.add(s)
  }
  return Array.from(surfaces).sort()
})

const styleOptions = computed(() => {
  const styles = new Set<string>()
  for (const r of glazeStore.recipes) {
    for (const s of r.styleIds) styles.add(s)
  }
  return Array.from(styles).sort()
})

function toggleSurface(id: string) {
  if (!editableRecipe.value) return
  const idx = editableRecipe.value.surfaceIds.indexOf(id)
  if (idx === -1) {
    editableRecipe.value.surfaceIds.push(id)
  } else {
    editableRecipe.value.surfaceIds.splice(idx, 1)
  }
}

function toggleStyle(id: string) {
  if (!editableRecipe.value) return
  if (!editableRecipe.value.styleIds) editableRecipe.value.styleIds = []
  const idx = editableRecipe.value.styleIds.indexOf(id)
  if (idx === -1) {
    editableRecipe.value.styleIds.push(id)
  } else {
    editableRecipe.value.styleIds.splice(idx, 1)
  }
}

// ── Swatch color presets ──────────────────────────────────────────
const swatchPresets = [
  '#ede6d6', '#e7efef', '#f1ede4', '#a5b8a0', '#cf7a37',
  '#2b211b', '#cdb99e', '#89a8ba', '#8d3026', '#ddd9d1',
  '#7a5a43', '#d6c1a1', '#d9cfbc', '#b8a088', '#5a7862',
  '#c4a35a', '#3d5a80', '#614a3a', '#d4a373', '#a0522d',
]

// ── Material list for dropdowns ────────────────────────────────────
const materialList = computed(() => {
  const items: { id: string; name: string }[] = []
  materialInfo.forEach((info, id) => {
    items.push({ id, name: info.name })
  })
  return items.sort((a, b) => a.name.localeCompare(b.name))
})

// ── Total percentage ───────────────────────────────────────────────
const totalPercentage = computed(() => {
  if (!editableRecipe.value) return 0
  return editableRecipe.value.ingredients.reduce((sum, ing) => sum + ing.amount, 0)
})

const totalInRange = computed(() => totalPercentage.value >= 98 && totalPercentage.value <= 102)

const totalBarWidth = computed(() => {
  return Math.min(totalPercentage.value, 120)
})

// ── UMF Chemistry ──────────────────────────────────────────────────
const editorIngredients = computed(() => editableRecipe.value?.ingredients ?? [])
const editorFiringRange = computed(() => editableRecipe.value?.firingRangeId)
const { chemistry } = useGlazeChemistry(editorIngredients, editorFiringRange)

// ── Ingredient helpers ─────────────────────────────────────────────
function addIngredient() {
  if (!editableRecipe.value) return
  editableRecipe.value.ingredients.push({
    materialId: '',
    sourceLabel: 'New ingredient',
    amount: 0,
  })
}

function removeIngredient(index: number) {
  if (!editableRecipe.value) return
  editableRecipe.value.ingredients.splice(index, 1)
  expandedImpactPanels.value.delete(index)
}

function toggleImpactPanel(index: number) {
  if (expandedImpactPanels.value.has(index)) {
    expandedImpactPanels.value.delete(index)
  } else {
    expandedImpactPanels.value.add(index)
  }
}

function onMaterialSelect(index: number, matId: string) {
  if (!editableRecipe.value) return
  const ing = editableRecipe.value.ingredients[index]
  ing.materialId = matId
  const info = materialInfo.get(matId)
  if (info) {
    ing.sourceLabel = info.name
  }
}

// ── Atmosphere toggles ─────────────────────────────────────────────
function toggleAtmosphere(id: string) {
  if (!editableRecipe.value) return
  const idx = editableRecipe.value.atmosphereIds.indexOf(id)
  if (idx === -1) {
    editableRecipe.value.atmosphereIds.push(id)
  } else {
    editableRecipe.value.atmosphereIds.splice(idx, 1)
  }
}

// ── Lookup helpers ─────────────────────────────────────────────────
function getMaterialInfo(materialId: string) {
  return materialInfo.get(materialId) ?? null
}

function getChangeImpact(materialId: string) {
  return changeImpacts.get(materialId) ?? null
}

function getSubstitutions(materialId: string) {
  return substitutions.get(materialId) ?? null
}

function getColorantHeuristic(materialId: string) {
  return colorantHeuristics.get(materialId) ?? null
}

// ── Ingredient switcher ────────────────────────────────────────────
function toggleSwitcher(idx: number) {
  openSwitcherIndex.value = openSwitcherIndex.value === idx ? null : idx
}

function handleSwap(idx: number, _originalId: string, opt: SubstitutionOption) {
  if (!editableRecipe.value) return
  const ing = editableRecipe.value.ingredients[idx]
  const fromLabel = ing.sourceLabel
  ing.materialId = opt.materialId
  ing.sourceLabel = opt.label
  editableRecipe.value.notes.push(`Substituted: replaced ${fromLabel} with ${opt.label}. ${opt.difficultyNote}`)
  openSwitcherIndex.value = null
  swapToast.value = { fromLabel, toLabel: opt.label }
  setTimeout(() => { swapToast.value = null }, 3000)
}

// ── Auto-save with debounce ────────────────────────────────────────
const debouncedSave = useDebounceFn(() => {
  if (!editableRecipe.value) return
  autoSaveStatus.value = 'saving'
  workshopStore.saveCustomRecipe({ ...editableRecipe.value })
  setTimeout(() => {
    autoSaveStatus.value = 'saved'
    setTimeout(() => { autoSaveStatus.value = 'idle' }, 2000)
  }, 300)
}, 1000)

watch(
  () => editableRecipe.value,
  () => {
    if (editableRecipe.value) {
      autoSaveStatus.value = 'saving'
      debouncedSave()
    }
  },
  { deep: true },
)

// ── Manual save ────────────────────────────────────────────────────
function saveRecipe() {
  if (!editableRecipe.value) return
  workshopStore.saveCustomRecipe({ ...editableRecipe.value })
  autoSaveStatus.value = 'saved'
  setTimeout(() => { autoSaveStatus.value = 'idle' }, 2000)
}

// ── Open in calculator ─────────────────────────────────────────────
function openInCalculator() {
  if (!editableRecipe.value) return
  const recipe = workshopStore.customToRecipe(editableRecipe.value)
  workshopStore.loadRecipeIntoCalculator(recipe)
  router.push('/calculator')
}

// ── Notes handling ─────────────────────────────────────────────────
const notesText = computed({
  get: () => editableRecipe.value?.notes.join('\n') ?? '',
  set: (val: string) => {
    if (!editableRecipe.value) return
    editableRecipe.value.notes = val.split('\n')
  },
})

// ── On mount ───────────────────────────────────────────────────────
onMounted(() => {
  const id = route.params.id as string
  const found = workshopStore.customRecipes.find(r => r.id === id)
  if (!found) {
    router.replace('/my-recipes')
    return
  }
  // Deep clone into editable state
  editableRecipe.value = JSON.parse(JSON.stringify(found))
})
</script>

<template>
  <div class="recipe-editor" v-if="editableRecipe">
    <!-- ═══ HEADER BAND ═══ -->
    <header class="editor-header">
      <div class="editor-header-inner">
        <RouterLink to="/my-recipes" class="back-link">
          <span class="back-arrow">&larr;</span>
          Back to My Recipes
        </RouterLink>
        <div class="header-title-row">
          <input
            v-model="editableRecipe.name"
            type="text"
            class="recipe-name-input"
            placeholder="Recipe name..."
            spellcheck="false"
          />
          <div class="header-actions">
            <span
              class="auto-save-badge"
              :class="autoSaveStatus"
            >
              <span v-if="autoSaveStatus === 'saving'" class="pulse-dot"></span>
              {{ autoSaveStatus === 'idle' ? '' : autoSaveStatus === 'saving' ? 'Saving...' : 'Saved' }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- ═══ MAIN CONTENT ═══ -->
    <div class="editor-body">
      <div class="editor-layout">
        <!-- ─── LEFT: EDITOR PANEL ─── -->
        <main class="editor-main">
          <!-- Firing & Atmosphere Section -->
          <section class="editor-card" v-reveal>
            <h2 class="card-title">Firing Profile</h2>

            <div class="field-group">
              <label class="field-label">Firing Range</label>
              <div class="firing-buttons">
                <button
                  v-for="opt in firingOptions"
                  :key="opt.id"
                  class="toggle-btn"
                  :class="{ active: editableRecipe.firingRangeId === opt.id }"
                  @click="editableRecipe.firingRangeId = opt.id"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="cone-input">Cone</label>
              <input
                id="cone-input"
                v-model="editableRecipe.cone"
                type="text"
                class="text-input cone-input"
                placeholder='e.g. "6" or "8-10"'
              />
            </div>

            <div class="field-group">
              <label class="field-label">Atmosphere</label>
              <div class="firing-buttons">
                <button
                  v-for="atm in atmosphereOptions"
                  :key="atm.id"
                  class="toggle-btn"
                  :class="{ active: editableRecipe.atmosphereIds.includes(atm.id) }"
                  @click="toggleAtmosphere(atm.id)"
                >
                  {{ atm.label }}
                </button>
              </div>
            </div>
          </section>

          <!-- ─── INGREDIENT SLIDERS ─── -->
          <section class="editor-card" v-reveal="{ delay: 0.05 }">
            <h2 class="card-title">Ingredients</h2>

            <div class="ingredients-list">
              <TransitionGroup name="ingredient" tag="div">
                <div
                  v-for="(ing, idx) in editableRecipe.ingredients"
                  :key="idx"
                  class="ingredient-row"
                >
                  <div class="ingredient-header">
                    <div class="ingredient-name-area">
                      <select
                        class="material-select"
                        :value="ing.materialId"
                        @change="onMaterialSelect(idx, ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="" disabled>Select material...</option>
                        <option
                          v-for="mat in materialList"
                          :key="mat.id"
                          :value="mat.id"
                        >
                          {{ mat.name }}
                        </option>
                      </select>
                      <input
                        v-model="ing.sourceLabel"
                        type="text"
                        class="label-input"
                        placeholder="Label..."
                      />
                    </div>
                    <div class="ingredient-actions">
                      <button
                        v-if="ing.materialId && getSubstitutions(ing.materialId)?.options?.length"
                        class="sub-trigger-editor"
                        :class="{ active: openSwitcherIndex === idx }"
                        @click="toggleSwitcher(idx)"
                        title="Show substitutes"
                      >⇄</button>
                      <button
                        class="remove-btn"
                        title="Remove ingredient"
                        @click="removeIngredient(idx)"
                      >&times;</button>
                    </div>
                  </div>

                  <!-- Switcher (shown when active) -->
                  <IngredientSwitcher
                    :ingredient="ing"
                    :visible="openSwitcherIndex === idx"
                    :all-ingredients="editableRecipe.ingredients"
                    :firing-range-id="editableRecipe.firingRangeId"
                    @close="openSwitcherIndex = null"
                    @swap="(origId, opt) => handleSwap(idx, origId, opt)"
                  />

                  <div class="slider-row">
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="0.5"
                      v-model.number="ing.amount"
                      class="ingredient-slider"
                      :style="{ '--slider-pct': (ing.amount / 80) * 100 + '%' }"
                    />
                    <span class="pct-display">{{ ing.amount.toFixed(1) }}%</span>
                  </div>

                  <!-- Colorant heuristic inline hint -->
                  <div
                    v-if="getColorantHeuristic(ing.materialId)"
                    class="colorant-hint"
                  >
                    <span class="hint-range">{{ getColorantHeuristic(ing.materialId)!.range }}</span>
                    <span class="hint-sep">&middot;</span>
                    <span class="hint-note">{{ getColorantHeuristic(ing.materialId)!.notes }}</span>
                  </div>

                  <!-- Impact Panel Toggle -->
                  <button
                    v-if="ing.materialId"
                    class="impact-toggle"
                    :class="{ open: expandedImpactPanels.has(idx) }"
                    @click="toggleImpactPanel(idx)"
                  >
                    <span class="impact-toggle-icon">{{ expandedImpactPanels.has(idx) ? '&#9650;' : '&#9660;' }}</span>
                    Material info &amp; change impact
                  </button>

                  <!-- Expanded Impact Panel -->
                  <Transition name="expand">
                    <div
                      v-if="ing.materialId && expandedImpactPanels.has(idx)"
                      class="impact-panel"
                    >
                      <!-- Beginner description -->
                      <div v-if="getMaterialInfo(ing.materialId)" class="impact-section">
                        <h4 class="impact-heading">About this material</h4>
                        <p class="impact-text">{{ getMaterialInfo(ing.materialId)!.beginner }}</p>
                        <div v-if="getMaterialInfo(ing.materialId)!.watchFor.length" class="watch-for">
                          <span class="watch-label">Watch for:</span>
                          <TagBadge
                            v-for="(warn, wi) in getMaterialInfo(ing.materialId)!.watchFor"
                            :key="wi"
                            :label="warn"
                            variant="default"
                          />
                        </div>
                      </div>

                      <!-- Change impact / visual hint -->
                      <div v-if="getChangeImpact(ing.materialId)" class="impact-section">
                        <h4 class="impact-heading">{{ getChangeImpact(ing.materialId)!.change }}</h4>
                        <p class="impact-visual-hint">{{ getChangeImpact(ing.materialId)!.visualHint }}</p>
                        <ul class="impact-list">
                          <li
                            v-for="(effect, ei) in getChangeImpact(ing.materialId)!.usuallyDoes"
                            :key="ei"
                          >{{ effect }}</li>
                        </ul>
                        <div v-if="getChangeImpact(ing.materialId)!.watchFor.length" class="watch-for">
                          <span class="watch-label">Caution:</span>
                          <TagBadge
                            v-for="(warn, wi) in getChangeImpact(ing.materialId)!.watchFor"
                            :key="wi"
                            :label="warn"
                            variant="default"
                          />
                        </div>
                      </div>

                      <!-- Substitution note (when switcher is already accessible above) -->
                      <div v-if="getSubstitutions(ing.materialId)?.options?.length" class="impact-section impact-sub-prompt">
                        <p class="sub-prompt-text">
                          {{ getSubstitutions(ing.materialId)!.options!.length }} substitute{{ getSubstitutions(ing.materialId)!.options!.length > 1 ? 's' : '' }} available —
                          <button class="sub-inline-link" @click="toggleSwitcher(idx)">view &amp; swap ⇄</button>
                        </p>
                      </div>
                    </div>
                  </Transition>
                </div>
              </TransitionGroup>
            </div>

            <button class="add-ingredient-btn" @click="addIngredient">
              <span class="add-icon">+</span>
              Add ingredient
            </button>
          </section>

          <!-- ─── NOTES SECTION ─── -->
          <section class="editor-card" v-reveal="{ delay: 0.1 }">
            <h2 class="card-title">Notes</h2>
            <textarea
              v-model="notesText"
              class="notes-textarea"
              rows="6"
              placeholder="Firing observations, surface results, glaze thickness notes..."
            ></textarea>
          </section>

          <!-- ─── CAUTION PICKER ─── -->
          <section class="editor-card" v-reveal="{ delay: 0.12 }">
            <h2 class="card-title">Cautions</h2>
            <p class="field-hint">Flag safety concerns for anyone using this recipe.</p>
            <div class="tag-picker">
              <button
                v-for="opt in cautionOptions"
                :key="opt.id"
                class="tag-pick-btn"
                :class="{
                  active: editableRecipe.cautionIds?.includes(opt.id),
                  warning: opt.severity === 'warning',
                  danger: opt.severity === 'danger',
                }"
                @click="toggleCaution(opt.id)"
              >
                {{ opt.label }}
              </button>
            </div>
          </section>

          <!-- ─── SURFACE & STYLE TAGS ─── -->
          <section class="editor-card" v-reveal="{ delay: 0.14 }">
            <h2 class="card-title">Surface & Style</h2>

            <div class="field-group">
              <label class="field-label">Surface</label>
              <div class="tag-picker">
                <button
                  v-for="s in surfaceOptions"
                  :key="s"
                  class="tag-pick-btn"
                  :class="{ active: editableRecipe.surfaceIds.includes(s) }"
                  @click="toggleSurface(s)"
                >
                  {{ s.replace(/-/g, ' ') }}
                </button>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">Style</label>
              <div class="tag-picker">
                <button
                  v-for="s in styleOptions"
                  :key="s"
                  class="tag-pick-btn"
                  :class="{ active: editableRecipe.styleIds?.includes(s) }"
                  @click="toggleStyle(s)"
                >
                  {{ s.replace(/-/g, ' ') }}
                </button>
              </div>
            </div>
          </section>

          <!-- ─── SWATCH COLOR ─── -->
          <section class="editor-card" v-reveal="{ delay: 0.16 }">
            <h2 class="card-title">Swatch Color</h2>
            <p class="field-hint">Pick a color to represent this recipe on cards.</p>
            <div class="swatch-picker">
              <button
                v-for="hex in swatchPresets"
                :key="hex"
                class="swatch-preset"
                :class="{ active: editableRecipe.swatchColor === hex }"
                :style="{ background: hex }"
                @click="editableRecipe.swatchColor = hex"
              />
              <div class="swatch-custom-row">
                <input
                  type="color"
                  :value="editableRecipe.swatchColor || '#ede6d6'"
                  @input="editableRecipe.swatchColor = ($event.target as HTMLInputElement).value"
                  class="swatch-color-input"
                />
                <span class="swatch-hex-label">{{ editableRecipe.swatchColor || '#ede6d6' }}</span>
              </div>
            </div>
          </section>

          <!-- Swap toast -->
          <Transition name="toast">
            <div v-if="swapToast" class="editor-swap-toast">
              <span class="toast-icon">⇄</span>
              <div class="toast-text">
                <strong>Ingredient swapped</strong>
                <span>{{ swapToast.fromLabel }} → {{ swapToast.toLabel }}</span>
              </div>
            </div>
          </Transition>

          <!-- ─── ACTION BUTTONS ─── -->
          <div class="action-bar" v-reveal="{ delay: 0.15 }">
            <button class="btn btn-primary" @click="saveRecipe">
              Save Recipe
            </button>
            <button class="btn btn-secondary" @click="openInCalculator">
              Open in Calculator
            </button>
            <RouterLink to="/my-recipes" class="btn btn-ghost">
              Back to My Recipes
            </RouterLink>
          </div>
        </main>

        <!-- ─── RIGHT: SUMMARY SIDEBAR ─── -->
        <aside class="editor-sidebar">
          <div class="sidebar-card" v-reveal.slide="{ delay: 0.1 }">
            <h3 class="sidebar-title">Live Summary</h3>

            <!-- Total percentage bar -->
            <div class="total-section">
              <div class="total-header">
                <span class="total-label">Total</span>
                <span
                  class="total-value"
                  :class="{ 'in-range': totalInRange, 'out-range': !totalInRange }"
                >{{ totalPercentage.toFixed(1) }}%</span>
              </div>
              <div class="total-bar-track">
                <div
                  class="total-bar-fill"
                  :class="{ 'in-range': totalInRange, 'out-range': !totalInRange }"
                  :style="{ width: (totalBarWidth / 120) * 100 + '%' }"
                ></div>
                <div class="total-bar-target"></div>
              </div>
              <p class="total-hint" v-if="!totalInRange">
                Target: 98 &ndash; 102%
              </p>
            </div>

            <!-- Stats -->
            <div class="sidebar-stats">
              <div class="stat-row">
                <span class="stat-label">Ingredients</span>
                <span class="stat-value">{{ editableRecipe.ingredients.length }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Firing</span>
                <span class="stat-value">{{ editableRecipe.firingRangeId || '---' }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Cone</span>
                <span class="stat-value">{{ editableRecipe.cone || '---' }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Atmosphere</span>
                <span class="stat-value">{{ editableRecipe.atmosphereIds.join(', ') || '---' }}</span>
              </div>
            </div>

            <!-- Auto-save indicator -->
            <div class="sidebar-save-status">
              <div class="save-dot" :class="autoSaveStatus"></div>
              <span class="save-text">
                {{ autoSaveStatus === 'idle' ? 'Auto-save active' : autoSaveStatus === 'saving' ? 'Saving changes...' : 'All changes saved' }}
              </span>
            </div>
          </div>

          <!-- Ingredient breakdown mini-list -->
          <div class="sidebar-card breakdown-card" v-reveal.slide="{ delay: 0.15 }">
            <h3 class="sidebar-title">Breakdown</h3>
            <div
              v-for="(ing, idx) in editableRecipe.ingredients"
              :key="idx"
              class="breakdown-row"
            >
              <span class="breakdown-name">{{ ing.sourceLabel || 'Unnamed' }}</span>
              <span class="breakdown-bar-track">
                <span
                  class="breakdown-bar-fill"
                  :style="{ width: Math.min(ing.amount / 80 * 100, 100) + '%' }"
                ></span>
              </span>
              <span class="breakdown-pct">{{ ing.amount.toFixed(1) }}%</span>
            </div>
          </div>

          <!-- Live UMF Chemistry -->
          <div class="sidebar-card chemistry-sidebar-card" v-reveal.slide="{ delay: 0.2 }">
            <ChemistryPanel :chemistry="chemistry" :compact="false" />
          </div>
        </aside>
      </div>
    </div>
  </div>

  <!-- Loading / not found state -->
  <div v-else class="editor-loading">
    <p>Loading recipe...</p>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════
   RECIPE EDITOR VIEW
   ═══════════════════════════════════════════════════ */

.recipe-editor {
  min-height: 100vh;
  background: var(--cream);
}

/* ─── HEADER ─── */
.editor-header {
  background: var(--carbon);
  padding: calc(var(--nav-height) + var(--space-6)) var(--space-8) var(--space-6);
}

.editor-header-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone-light);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--cream);
}

.back-arrow {
  font-size: var(--text-lg);
  line-height: 1;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.recipe-name-input {
  flex: 1;
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--cream);
  background: transparent;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-3);
  outline: none;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.recipe-name-input:hover {
  border-color: var(--ink-20, rgba(255, 255, 255, 0.15));
}

.recipe-name-input:focus {
  border-color: var(--clay);
  background: rgba(255, 255, 255, 0.05);
}

.recipe-name-input::placeholder {
  color: var(--stone);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.auto-save-badge {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--stone-light);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 20px;
}

.auto-save-badge.saved {
  color: var(--sage);
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--clay);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ─── BODY LAYOUT ─── */
.editor-body {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-8);
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--space-6);
  align-items: start;
}

/* ─── EDITOR CARDS ─── */
.editor-card {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-5);
}

.card-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--carbon);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--ink-05);
}

/* ─── FIELD GROUPS ─── */
.field-group {
  margin-bottom: var(--space-5);
}

.field-group:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  margin-bottom: var(--space-2);
}

.firing-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.toggle-btn {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  background: var(--cream);
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toggle-btn:hover {
  border-color: var(--clay);
  color: var(--clay);
}

.toggle-btn.active {
  background: var(--clay);
  border-color: var(--clay);
  color: white;
}

.text-input {
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  background: var(--cream);
  color: var(--ink);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.text-input:focus {
  border-color: var(--clay);
  box-shadow: 0 0 0 3px var(--clay-10);
}

.cone-input {
  width: 120px;
}

/* ═══ INGREDIENTS ═══ */
.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.ingredient-row {
  background: var(--cream);
  border: 1px solid var(--ink-05);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.ingredient-row:hover {
  border-color: var(--ink-10);
  box-shadow: var(--shadow-sm);
}

.ingredient-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.ingredient-name-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.material-select {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  background: var(--chalk);
  color: var(--ink);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
  max-width: 300px;
}

.material-select:focus {
  border-color: var(--clay);
}

.label-input {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--stone);
  outline: none;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.label-input:hover {
  border-color: var(--ink-10);
}

.label-input:focus {
  border-color: var(--clay);
  background: var(--chalk);
}

.ingredient-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.sub-trigger-editor {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--stone);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.sub-trigger-editor:hover,
.sub-trigger-editor.active {
  background: var(--clay);
  border-color: var(--clay);
  color: white;
}

.remove-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--stone);
  font-size: var(--text-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #e74c3c;
  border-color: #e74c3c;
  color: white;
}

/* Substitution prompt inside impact panel */
.impact-sub-prompt {
  background: rgba(196, 83, 42, 0.06);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.sub-prompt-text {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  line-height: 1.5;
}

.sub-inline-link {
  background: none;
  border: none;
  color: var(--clay);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition-fast);
}

.sub-inline-link:hover {
  color: var(--clay-dark);
}

/* Editor swap toast */
.editor-swap-toast {
  background: var(--carbon);
  color: var(--cream);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.editor-swap-toast .toast-icon {
  font-size: var(--text-xl);
  color: var(--sage);
  flex-shrink: 0;
}

.editor-swap-toast .toast-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.editor-swap-toast .toast-text strong {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
}

.editor-swap-toast .toast-text span {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  opacity: 0.8;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-6px); }

/* ─── SLIDER ─── */
.slider-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.ingredient-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    var(--clay) 0%,
    var(--clay) var(--slider-pct, 0%),
    var(--parchment) var(--slider-pct, 0%),
    var(--parchment) 100%
  );
  outline: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

/* Webkit thumb */
.ingredient-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--clay);
  border: 3px solid white;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.ingredient-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: var(--shadow-md);
}

/* Firefox thumb */
.ingredient-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--clay);
  border: 3px solid white;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.ingredient-slider::-moz-range-thumb:hover {
  transform: scale(1.15);
  box-shadow: var(--shadow-md);
}

/* Firefox track */
.ingredient-slider::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: var(--parchment);
}

.ingredient-slider::-moz-range-progress {
  height: 6px;
  border-radius: 3px;
  background: var(--clay);
}

.pct-display {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
  min-width: 60px;
  text-align: right;
}

/* ─── COLORANT HINT ─── */
.colorant-hint {
  margin-top: var(--space-2);
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.hint-range {
  color: var(--clay);
  font-weight: 600;
}

.hint-sep {
  color: var(--ink-10);
}

.hint-note {
  color: var(--stone);
}

/* ─── IMPACT PANEL ─── */
.impact-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.impact-toggle:hover,
.impact-toggle.open {
  color: var(--clay);
}

.impact-toggle-icon {
  font-size: 9px;
}

.impact-panel {
  margin-top: var(--space-3);
  padding: var(--space-4);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border: 1px solid var(--ink-05);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.impact-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.impact-section + .impact-section {
  padding-top: var(--space-3);
  border-top: 1px solid var(--ink-05);
}

.impact-heading {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--carbon);
}

.impact-text {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.6;
}

.impact-visual-hint {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--clay);
  line-height: 1.6;
}

.impact-list {
  list-style: disc;
  padding-left: var(--space-5);
}

.impact-list li {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.6;
}

.watch-for {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.watch-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
  font-weight: 600;
}

.sub-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sub-alt {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  padding: var(--space-1) var(--space-3);
  background: var(--chalk);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ink-05);
}

.sub-note {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
  line-height: 1.5;
}

/* ─── ADD INGREDIENT ─── */
.add-ingredient-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-5);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--clay);
  background: transparent;
  border: 2px dashed var(--clay);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-ingredient-btn:hover {
  background: var(--clay-10);
  border-style: solid;
}

.add-icon {
  font-size: var(--text-xl);
  font-weight: 300;
  line-height: 1;
}

/* ─── NOTES ─── */
.notes-textarea {
  width: 100%;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--cream);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  resize: vertical;
  outline: none;
  line-height: 1.7;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.notes-textarea:focus {
  border-color: var(--clay);
  box-shadow: 0 0 0 3px var(--clay-10);
}

/* ─── TAG PICKER ─── */
.field-hint {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  font-style: italic;
  line-height: 1.5;
  margin-bottom: var(--space-2);
}

.tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag-pick-btn {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: capitalize;
  border: 1px solid var(--ink-10);
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: transparent;
}

.tag-pick-btn:hover {
  background: var(--parchment);
  color: var(--ink);
}

.tag-pick-btn.active {
  background: var(--carbon);
  border-color: var(--carbon);
  color: var(--cream);
}

.tag-pick-btn.active.warning {
  background: var(--clay);
  border-color: var(--clay);
}

.tag-pick-btn.active.danger {
  background: #c0392b;
  border-color: #c0392b;
}

/* ─── SWATCH PICKER ─── */
.swatch-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.swatch-preset {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  border: 2px solid var(--ink-10);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-block;
  margin: 0 var(--space-1) var(--space-1) 0;
}

.swatch-preset:hover {
  transform: scale(1.15);
  border-color: var(--ink-20);
}

.swatch-preset.active {
  border-color: var(--carbon);
  box-shadow: 0 0 0 2px var(--chalk), 0 0 0 4px var(--carbon);
}

.swatch-custom-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.swatch-color-input {
  width: 36px;
  height: 36px;
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: 2px;
  background: var(--chalk);
}

.swatch-hex-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
}

/* ─── ACTION BAR ─── */
.action-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-bottom: var(--space-8);
}

.btn {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--clay);
  color: white;
}

.btn-primary:hover {
  background: var(--clay-dark, #a0522d);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--sage);
  color: white;
}

.btn-secondary:hover {
  opacity: 0.9;
  box-shadow: var(--shadow-md);
}

.btn-ghost {
  background: transparent;
  color: var(--stone);
  border: 1px solid var(--ink-10);
}

.btn-ghost:hover {
  border-color: var(--clay);
  color: var(--clay);
}

/* ═══ SIDEBAR ═══ */
.editor-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: sticky;
  top: calc(var(--nav-height) + var(--space-4));
}

.sidebar-card {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
}

.sidebar-title {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--ink-05);
}

/* Total bar */
.total-section {
  margin-bottom: var(--space-5);
}

.total-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
}

.total-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
}

.total-value {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: 700;
  transition: color var(--transition-fast);
}

.total-value.in-range {
  color: var(--sage);
}

.total-value.out-range {
  color: #e67e22;
}

.total-bar-track {
  height: 10px;
  background: var(--parchment);
  border-radius: 5px;
  position: relative;
  overflow: hidden;
}

.total-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease, background 0.3s ease;
}

.total-bar-fill.in-range {
  background: linear-gradient(90deg, var(--sage), #6d9e6d);
}

.total-bar-fill.out-range {
  background: linear-gradient(90deg, #e67e22, #d35400);
}

.total-bar-target {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(100 / 120 * 100%);
  width: 2px;
  background: var(--carbon);
  opacity: 0.25;
}

.total-hint {
  font-family: var(--font-mono);
  font-size: 11px;
  color: #e67e22;
  margin-top: var(--space-1);
}

/* Stats */
.sidebar-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stat-value {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--carbon);
  font-weight: 500;
}

/* Save status */
.sidebar-save-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--ink-05);
}

.save-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background var(--transition-fast);
}

.save-dot.idle {
  background: var(--stone);
}

.save-dot.saving {
  background: var(--clay);
  animation: pulse 1s ease-in-out infinite;
}

.save-dot.saved {
  background: var(--sage);
}

.save-text {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
}

/* Breakdown */
.breakdown-card {
  max-height: 360px;
  overflow-y: auto;
}

.chemistry-sidebar-card {
  padding: 0;
  overflow: hidden;
}

.breakdown-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}

.breakdown-row + .breakdown-row {
  border-top: 1px solid var(--ink-05);
}

.breakdown-name {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--stone);
  min-width: 80px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breakdown-bar-track {
  flex: 1;
  height: 4px;
  background: var(--parchment);
  border-radius: 2px;
  overflow: hidden;
}

.breakdown-bar-fill {
  display: block;
  height: 100%;
  background: var(--clay);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.breakdown-pct {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--carbon);
  min-width: 42px;
  text-align: right;
}

/* ═══ TRANSITIONS ═══ */
.ingredient-enter-active {
  transition: all 0.3s ease;
}

.ingredient-leave-active {
  transition: all 0.25s ease;
}

.ingredient-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.ingredient-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.expand-enter-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to {
  opacity: 1;
  max-height: 600px;
}

.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ─── LOADING STATE ─── */
.editor-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream);
  font-family: var(--font-body);
  color: var(--stone);
  font-size: var(--text-lg);
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 960px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-sidebar {
    position: static;
    order: -1;
  }

  .header-title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .recipe-name-input {
    font-size: var(--text-2xl);
  }
}

@media (max-width: 600px) {
  .editor-header {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }

  .editor-body {
    padding: var(--space-4);
  }

  .editor-card {
    padding: var(--space-4);
  }

  .firing-buttons {
    flex-direction: column;
  }

  .slider-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .pct-display {
    text-align: left;
  }

  .ingredient-name-area {
    min-width: 0;
  }

  .material-select {
    max-width: 100%;
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    justify-content: center;
  }
}
</style>
