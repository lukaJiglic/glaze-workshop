<script setup lang="ts">
import { computed } from 'vue'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import { computeUMF } from '@/composables/useGlazeChemistry'
import TagBadge from '@/components/ui/TagBadge.vue'
import type { Recipe, UMFResult } from '@/types'

const glazeStore = useGlazeStore()
const workshopStore = useWorkshopStore()

const compareRecipes = computed<Recipe[]>(() =>
  workshopStore.compareIds
    .map(id => {
      const builtin = glazeStore.recipeById.get(id)
      if (builtin) return builtin
      const custom = workshopStore.customRecipes.find(r => r.id === id)
      if (custom) return workshopStore.customToRecipe(custom)
      return undefined
    })
    .filter(Boolean) as Recipe[]
)

interface CompareColumn {
  recipe: Recipe
  swatchHex: string
  chemistry: UMFResult
  scores: ReturnType<typeof glazeStore.getScores>
}

const columns = computed<CompareColumn[]>(() =>
  compareRecipes.value.map(recipe => {
    const profileId = glazeStore.profileForRecipe.get(recipe.id)
    const profile = profileId ? glazeStore.colorProfileById.get(profileId) : null
    let swatchHex = profile?.swatchHex ?? '#ede6d6'
    if (recipe.id.startsWith('custom-')) {
      const custom = workshopStore.customRecipes.find(r => r.id === recipe.id)
      if (custom?.swatchColor) swatchHex = custom.swatchColor
    }
    const chemistry = computeUMF(recipe.ingredients, recipe.firingRangeId)
    const familyId = profile?.familyId
    const scores = glazeStore.getScores(recipe.id, familyId ?? undefined)
    return { recipe, swatchHex, chemistry, scores }
  })
)

const scoreLabels: { key: string; label: string }[] = [
  { key: 'glossLevel', label: 'Gloss' },
  { key: 'opacityLevel', label: 'Opacity' },
  { key: 'variationLevel', label: 'Variation' },
  { key: 'runRisk', label: 'Run risk' },
  { key: 'textureLevel', label: 'Texture' },
]

// Radar chart geometry
const radarCenter = 50
const radarRadius = 38
const radarAxes = scoreLabels.length

function radarPoint(axisIdx: number, value: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * axisIdx) / radarAxes - Math.PI / 2
  const r = (value / 5) * radarRadius
  return { x: radarCenter + r * Math.cos(angle), y: radarCenter + r * Math.sin(angle) }
}

function radarPolygon(scores: Record<string, number>): string {
  return scoreLabels
    .map((s, i) => {
      const pt = radarPoint(i, (scores as any)[s.key] ?? 0)
      return `${pt.x},${pt.y}`
    })
    .join(' ')
}

function radarAxisEnd(idx: number): { x: number; y: number } {
  return radarPoint(idx, 5)
}

function radarLabelPos(idx: number): { x: number; y: number; anchor: string } {
  const pt = radarPoint(idx, 6.2)
  const anchor = pt.x < 40 ? 'end' : pt.x > 60 ? 'start' : 'middle'
  return { ...pt, anchor }
}

function scoreDots(val: number) {
  return '●'.repeat(val) + '○'.repeat(5 - val)
}

function fmt(n: number | null, decimals = 2) {
  if (n === null) return '—'
  return n.toFixed(decimals)
}

function close() {
  workshopStore.isCompareOpen = false
}

function remove(id: string) {
  workshopStore.toggleCompare(id)
  if (workshopStore.compareIds.length === 0) {
    workshopStore.isCompareOpen = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="compare-overlay">
      <div v-if="workshopStore.isCompareOpen && columns.length >= 2" class="compare-overlay" @click.self="close">
        <div class="compare-panel">
          <!-- Header -->
          <div class="compare-header">
            <h2 class="compare-title">Recipe Comparison</h2>
            <button class="compare-close" @click="close" aria-label="Close">✕</button>
          </div>

          <!-- Grid -->
          <div class="compare-grid" :class="'cols-' + columns.length">

            <!-- Row: Color swatch -->
            <div class="compare-row-label"></div>
            <div v-for="col in columns" :key="'swatch-' + col.recipe.id" class="compare-cell swatch-cell">
              <div class="compare-swatch" :style="{ background: col.swatchHex }">
                <button class="compare-remove" @click="remove(col.recipe.id)" title="Remove">✕</button>
              </div>
            </div>

            <!-- Row: Name -->
            <div class="compare-row-label"></div>
            <div v-for="col in columns" :key="'name-' + col.recipe.id" class="compare-cell name-cell">
              <h3 class="compare-recipe-name">{{ col.recipe.name }}</h3>
              <div class="compare-tags">
                <TagBadge :label="'C' + col.recipe.cone" variant="cone" />
                <TagBadge v-if="col.recipe.atmosphereIds[0]" :label="col.recipe.atmosphereIds[0]" variant="atmosphere" />
              </div>
            </div>

            <!-- Section: Ingredients -->
            <div class="compare-section-label">Ingredients</div>
            <div v-for="col in columns" :key="'ing-' + col.recipe.id" class="compare-cell">
              <div class="compare-ingredients">
                <div v-for="ing in col.recipe.ingredients" :key="ing.materialId" class="compare-ing-row">
                  <span class="compare-ing-name">{{ ing.sourceLabel }}</span>
                  <span class="compare-ing-pct">{{ ing.amount }}%</span>
                </div>
              </div>
            </div>

            <!-- Section: Chemistry -->
            <div class="compare-section-label">Chemistry</div>
            <div v-for="col in columns" :key="'chem-' + col.recipe.id" class="compare-cell">
              <div v-if="col.chemistry.isValid" class="compare-metrics">
                <div class="compare-metric">
                  <span class="cmp-metric-label">Si : Al</span>
                  <span class="cmp-metric-value">{{ fmt(col.chemistry.siToAl, 1) }}</span>
                </div>
                <div class="compare-metric">
                  <span class="cmp-metric-label">KNaO</span>
                  <span class="cmp-metric-value">{{ fmt(col.chemistry.knaO) }}</span>
                </div>
                <div class="compare-metric">
                  <span class="cmp-metric-label">SiO₂</span>
                  <span class="cmp-metric-value">{{ fmt(col.chemistry.totalSi) }}</span>
                </div>
                <div class="compare-metric">
                  <span class="cmp-metric-label">Al₂O₃</span>
                  <span class="cmp-metric-value">{{ fmt(col.chemistry.totalAl) }}</span>
                </div>
                <div class="compare-metric">
                  <span class="cmp-metric-label">LOI</span>
                  <span class="cmp-metric-value">{{ fmt(col.chemistry.totalLOI, 1) }}%</span>
                </div>
                <div class="compare-metric">
                  <span class="cmp-metric-label">Expansion</span>
                  <span class="cmp-metric-value">{{ fmt(col.chemistry.expansionIndex, 1) }}</span>
                </div>
              </div>
              <p v-else class="compare-no-data">No chemistry data</p>
            </div>

            <!-- Section: Scores with radar chart -->
            <template v-if="columns.some(c => c.scores)">
              <div class="compare-section-label">Character</div>
              <div v-for="col in columns" :key="'scores-' + col.recipe.id" class="compare-cell">
                <div v-if="col.scores" class="compare-scores">
                  <!-- Radar chart -->
                  <svg viewBox="0 0 100 100" class="radar-chart">
                    <!-- Grid rings -->
                    <polygon v-for="ring in [1, 2, 3, 4, 5]" :key="ring"
                      :points="scoreLabels.map((_, i) => { const p = radarPoint(i, ring); return `${p.x},${p.y}` }).join(' ')"
                      fill="none" stroke="var(--ink-10)" stroke-width="0.5"
                    />
                    <!-- Axes -->
                    <line v-for="(_, i) in scoreLabels" :key="'ax-'+i"
                      :x1="radarCenter" :y1="radarCenter"
                      :x2="radarAxisEnd(i).x" :y2="radarAxisEnd(i).y"
                      stroke="var(--ink-10)" stroke-width="0.5"
                    />
                    <!-- Data polygon -->
                    <polygon
                      :points="radarPolygon(col.scores)"
                      fill="rgba(196, 83, 42, 0.15)"
                      stroke="var(--clay)"
                      stroke-width="1.5"
                    />
                    <!-- Data dots -->
                    <circle v-for="(s, i) in scoreLabels" :key="'dot-'+i"
                      :cx="radarPoint(i, (col.scores as any)[s.key] ?? 0).x"
                      :cy="radarPoint(i, (col.scores as any)[s.key] ?? 0).y"
                      r="2" fill="var(--clay)"
                    />
                    <!-- Labels -->
                    <text v-for="(s, i) in scoreLabels" :key="'lbl-'+i"
                      :x="radarLabelPos(i).x" :y="radarLabelPos(i).y"
                      :text-anchor="radarLabelPos(i).anchor"
                      class="radar-label"
                    >{{ s.label }}</text>
                  </svg>
                  <!-- Score dots below -->
                  <div v-for="s in scoreLabels" :key="s.key" class="compare-score-row">
                    <span class="score-row-label">{{ s.label }}</span>
                    <span class="score-row-dots">{{ scoreDots((col.scores as any)[s.key] ?? 0) }}</span>
                  </div>
                </div>
                <p v-else class="compare-no-data">No scores</p>
              </div>
            </template>

            <!-- Section: Tableware -->
            <div class="compare-section-label">Status</div>
            <div v-for="col in columns" :key="'tw-' + col.recipe.id" class="compare-cell">
              <span class="compare-tableware" :class="col.recipe.tablewareStatus">
                {{ col.recipe.tablewareStatus === 'functional' ? '✓ Functional' : col.recipe.tablewareStatus === 'test-only' ? '⚠ Test only' : '◦ Decorative' }}
              </span>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.compare-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 900);
  background: rgba(44, 36, 22, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: calc(var(--nav-height) + var(--space-4)) var(--space-4) var(--space-8);
  overflow-y: auto;
  backdrop-filter: blur(2px);
}

.compare-panel {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 48px rgba(196, 83, 42, 0.18);
  width: 100%;
  max-width: 960px;
  overflow: hidden;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--ink-10);
  background: var(--band);
}

.compare-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--on-band);
}

.compare-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--stone-light);
  font-size: 16px;
  padding: var(--space-1);
  transition: color var(--transition-fast);
}
.compare-close:hover { color: var(--on-band); }

/* Grid layout */
.compare-grid {
  display: grid;
  padding: var(--space-4) var(--space-6) var(--space-6);
  gap: 0;
}

.compare-grid.cols-2 {
  grid-template-columns: 90px 1fr 1fr;
}

.compare-grid.cols-3 {
  grid-template-columns: 90px 1fr 1fr 1fr;
}

/* Row label (left column) */
.compare-row-label,
.compare-section-label {
  display: flex;
  align-items: flex-start;
  padding: var(--space-3) var(--space-2) var(--space-3) 0;
}

.compare-section-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  border-top: 1px solid var(--ink-10);
  padding-top: var(--space-4);
  margin-top: var(--space-2);
  grid-column: 1 / -1;
}

/* Cells */
.compare-cell {
  padding: var(--space-3) var(--space-3);
  border-left: 1px solid var(--ink-05);
}

.compare-cell:first-of-type {
  border-left: none;
}

/* Swatch */
.compare-swatch {
  height: 60px;
  border-radius: var(--radius-base);
  position: relative;
  overflow: hidden;
}

.compare-remove {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--cream-85);
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--stone);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all var(--transition-fast);
}

.compare-swatch:hover .compare-remove { opacity: 1; }
.compare-remove:hover { color: var(--clay); }

/* Name */
.name-cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.compare-recipe-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
  line-height: 1.3;
}

.compare-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

/* Ingredients */
.compare-ingredients {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.compare-ing-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.compare-ing-name {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.4;
}

.compare-ing-pct {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
  flex-shrink: 0;
}

/* Chemistry metrics */
.compare-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
}

.compare-metric {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: var(--space-1) 0;
}

.cmp-metric-label {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--stone);
}

.cmp-metric-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--carbon);
}

.compare-no-data {
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-xs);
  color: var(--stone);
}

/* Scores */
.compare-scores {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.compare-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.score-row-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.score-row-dots {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--clay);
}

/* Tableware status */
.compare-tableware {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

/* Radar chart */
.radar-chart {
  width: 100%;
  max-width: 140px;
  margin: 0 auto var(--space-2);
  display: block;
}

.radar-label {
  font-family: var(--font-mono);
  font-size: 4.5px;
  fill: var(--stone);
  font-weight: 600;
}

.compare-tableware.functional { color: var(--sage); }
.compare-tableware.test-only { color: var(--clay); }
.compare-tableware.decorative { color: var(--stone); }

/* Transition */
.compare-overlay-enter-active,
.compare-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.compare-overlay-enter-from,
.compare-overlay-leave-to {
  opacity: 0;
}

.compare-overlay-enter-active .compare-panel {
  animation: panel-in 0.3s ease forwards;
}

@keyframes panel-in {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Mobile */
@media (max-width: 768px) {
  .compare-overlay {
    padding: var(--space-2);
    align-items: flex-start;
  }

  .compare-panel {
    max-width: 100%;
  }

  .compare-grid.cols-2,
  .compare-grid.cols-3 {
    grid-template-columns: 1fr;
  }

  .compare-section-label {
    grid-column: 1;
  }

  .compare-cell {
    border-left: none;
    border-bottom: 1px solid var(--ink-05);
  }

  .compare-row-label {
    display: none;
  }
}
</style>
