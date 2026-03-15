<script setup lang="ts">
import { computed, ref } from 'vue'
import { substitutions, materialInfo } from '@/data/materials-knowledge'
import type { SubstitutionOption } from '@/data/materials-knowledge'
import { computeUMF } from '@/composables/useGlazeChemistry'

interface Ingredient {
  materialId: string
  sourceLabel: string
  amount: number
}

const props = defineProps<{
  ingredient: Ingredient
  visible: boolean
  allIngredients?: Ingredient[]
  firingRangeId?: string
}>()

const emit = defineEmits<{
  close: []
  swap: [originalId: string, option: SubstitutionOption]
}>()

const pair = computed(() => substitutions.get(props.ingredient.materialId))
const info = computed(() => materialInfo.get(props.ingredient.materialId))

const difficultyColors: Record<string, string> = {
  easy: 'var(--sage)',
  moderate: 'var(--clay)',
  advanced: 'var(--carbon)',
}

function difficultyLabel(d: string) {
  if (d === 'easy') return 'Easy swap'
  if (d === 'moderate') return 'Moderate'
  return 'Recalculate'
}

// Live UMF delta for each substitute option
function getUMFDelta(opt: SubstitutionOption): string | null {
  if (!props.allIngredients || props.allIngredients.length === 0) return null

  const currentUMF = computeUMF(props.allIngredients, props.firingRangeId)
  if (!currentUMF.isValid) return null

  // Create modified ingredient list with the swap applied
  const modified = props.allIngredients.map(ing =>
    ing.materialId === props.ingredient.materialId
      ? { ...ing, materialId: opt.materialId, sourceLabel: opt.label }
      : ing
  )
  const newUMF = computeUMF(modified, props.firingRangeId)
  if (!newUMF.isValid) return null

  const parts: string[] = []
  if (currentUMF.siToAl === null || newUMF.siToAl === null) return null
  const siDelta = newUMF.siToAl - currentUMF.siToAl
  if (Math.abs(siDelta) >= 0.05) {
    parts.push(`Si:Al ${siDelta > 0 ? '+' : ''}${siDelta.toFixed(2)}`)
  }
  const knaDelta = newUMF.knaO - currentUMF.knaO
  if (Math.abs(knaDelta) >= 0.01) {
    parts.push(`KNaO ${knaDelta > 0 ? '+' : ''}${knaDelta.toFixed(2)}`)
  }
  const expDelta = newUMF.expansionIndex - currentUMF.expansionIndex
  if (Math.abs(expDelta) >= 0.5) {
    parts.push(`Exp ${expDelta > 0 ? '+' : ''}${expDelta.toFixed(1)}`)
  }
  return parts.length > 0 ? parts.join(' · ') : 'No significant change'
}

function handleSwap(opt: SubstitutionOption) {
  emit('swap', props.ingredient.materialId, opt)
}
</script>

<template>
  <Transition name="switcher">
    <div v-if="visible && pair?.options?.length" class="switcher-panel">
      <div class="switcher-header">
        <div class="switcher-title-row">
          <span class="switcher-for">Substitutes for</span>
          <strong class="switcher-ing-name">{{ ingredient.sourceLabel }}</strong>
        </div>
        <button class="switcher-close" @click="emit('close')" aria-label="Close">✕</button>
      </div>

      <p v-if="pair.notes[0]" class="switcher-context">{{ pair.notes[0] }}</p>

      <div class="options-list">
        <div
          v-for="opt in pair.options"
          :key="opt.label"
          class="option-card"
        >
          <div class="option-top">
            <div class="option-name-block">
              <span class="option-name">{{ opt.label }}</span>
              <span
                class="option-difficulty"
                :style="{ color: difficultyColors[opt.difficulty] }"
              >{{ difficultyLabel(opt.difficulty) }}</span>
            </div>
            <button class="swap-btn" @click="handleSwap(opt)">
              Use this →
            </button>
          </div>

          <div class="option-details">
            <div v-if="opt.ratio" class="option-row">
              <span class="opt-label">Amount</span>
              <span class="opt-value">{{ opt.ratio }}</span>
            </div>
            <div v-if="opt.difficultyNote" class="option-row">
              <span class="opt-label">What to know</span>
              <span class="opt-value">{{ opt.difficultyNote }}</span>
            </div>
            <div v-if="opt.chemicalShift" class="option-row">
              <span class="opt-label">Chemistry</span>
              <span class="opt-value opt-chemistry">{{ opt.chemicalShift }}</span>
            </div>
            <div v-if="opt.visualEffect" class="option-row">
              <span class="opt-label">Visual result</span>
              <span class="opt-value opt-visual">{{ opt.visualEffect }}</span>
            </div>
            <div v-if="allIngredients && getUMFDelta(opt)" class="option-row">
              <span class="opt-label">UMF delta</span>
              <span class="opt-value opt-delta">{{ getUMFDelta(opt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="pair.specifics?.length" class="switcher-advanced">
        <span class="advanced-label">Advanced note</span>
        <p v-for="s in pair.specifics" :key="s">{{ s }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.switcher-panel {
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-top: var(--space-2);
}

.switcher-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.switcher-title-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switcher-for {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
}

.switcher-ing-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
}

.switcher-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--stone);
  font-size: 14px;
  padding: 4px;
  line-height: 1;
  transition: color var(--transition-fast);
  flex-shrink: 0;
}
.switcher-close:hover { color: var(--ink); }

.switcher-context {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  line-height: 1.5;
  margin-bottom: var(--space-3);
  font-style: italic;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.option-card {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-base);
  padding: var(--space-3);
}

.option-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.option-name-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--carbon);
}

.option-difficulty {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

.swap-btn {
  background: var(--clay);
  color: var(--cream);
  border: none;
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.swap-btn:hover {
  background: var(--clay-dark);
  transform: translateX(2px);
}

.option-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.option-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: var(--space-2);
  align-items: baseline;
}

.opt-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--stone);
  flex-shrink: 0;
}

.opt-value {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--carbon);
  line-height: 1.4;
}

.opt-chemistry {
  color: var(--stone);
  font-style: italic;
}

.opt-visual {
  color: var(--ink);
}

.opt-delta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--clay);
  font-weight: 600;
  font-style: normal;
}

.switcher-advanced {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--ink-10);
}

.advanced-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--stone);
  display: block;
  margin-bottom: var(--space-1);
}

.switcher-advanced p {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  line-height: 1.5;
  font-style: italic;
}

/* Transition */
.switcher-enter-active,
.switcher-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}
.switcher-enter-from,
.switcher-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
