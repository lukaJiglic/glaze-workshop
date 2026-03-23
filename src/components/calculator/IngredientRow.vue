<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { gsap } from 'gsap'
import type { ScaledIngredient } from '@/types'
import IngredientSwitcher from '@/components/recipe/IngredientSwitcher.vue'
import { materialInfo, changeImpacts, colorantHeuristics, substitutions } from '@/data/materials-knowledge'
import type { SubstitutionOption } from '@/data/materials-knowledge'

const props = defineProps<{ ingredient: ScaledIngredient; rank: number }>()
const emit = defineEmits<{
  swap: [originalId: string, option: SubstitutionOption]
}>()

const displayGrams = ref(props.ingredient.scaledGrams)
const rowEl = ref<HTMLElement | null>(null)
const infoOpen = ref(false)
const switcherOpen = ref(false)

let gramsTween: gsap.core.Tween | null = null

watch(() => props.ingredient.scaledGrams, (newVal) => {
  gramsTween?.kill()
  gramsTween = gsap.to(displayGrams, {
    value: newVal,
    duration: 0.5,
    ease: 'power2.out',
    onUpdate: () => {
      displayGrams.value = Number(displayGrams.value.toFixed(1))
    },
  })
})

const info = computed(() => materialInfo.get(props.ingredient.materialId))
const impact = computed(() => changeImpacts.get(props.ingredient.materialId))
const colorant = computed(() => colorantHeuristics.get(props.ingredient.materialId))
const hasSubs = computed(() => {
  const pair = substitutions.get(props.ingredient.materialId)
  return !!(pair?.options?.length)
})

function toggleInfo() {
  infoOpen.value = !infoOpen.value
  if (infoOpen.value) switcherOpen.value = false
}

function toggleSwitcher() {
  switcherOpen.value = !switcherOpen.value
  if (switcherOpen.value) infoOpen.value = false
}
</script>

<template>
  <div ref="rowEl" class="ingredient-row-wrap" :style="{ '--rank': rank }">
    <!-- Main row -->
    <div class="ingredient-row">
      <span class="ing-name">
        {{ ingredient.sourceLabel }}
        <button
          v-if="info"
          class="ing-info-dot"
          :class="{ active: infoOpen }"
          @click="toggleInfo"
          title="Material info"
        >i</button>
      </span>
      <span class="ing-pct">{{ ingredient.amount.toFixed(1) }}%</span>
      <div class="ing-bar-wrap">
        <div class="ing-bar" :style="{ width: ingredient.amount + '%' }" />
      </div>
      <span class="ing-grams">{{ displayGrams.toFixed(1) }}g</span>
      <button
        v-if="hasSubs"
        class="sub-trigger"
        :class="{ active: switcherOpen }"
        @click="toggleSwitcher"
        title="Show substitutes"
        aria-label="Show substitutes"
      >⇄</button>
    </div>

    <!-- Click-expanded info panel -->
    <Transition name="expand-info">
      <div v-if="infoOpen && !switcherOpen && (info || impact || colorant)" class="ing-info-panel">
        <div v-if="info" class="tip-section">
          <p class="tip-beginner">{{ info.beginner }}</p>
          <div class="tip-role">
            <span class="tip-label">Role</span>
            <span>{{ info.group.replace(/-/g, ' ') }}</span>
          </div>
        </div>
        <div v-if="impact" class="tip-section">
          <span class="tip-label">If you adjust this</span>
          <p class="tip-visual-hint">{{ impact.visualHint }}</p>
          <div v-if="impact.watchFor.length" class="tip-watch">
            <span class="tip-watch-label">Watch for:</span>
            <span v-for="w in impact.watchFor" :key="w" class="tip-watch-item">{{ w }}</span>
          </div>
        </div>
        <div v-if="colorant" class="tip-section">
          <span class="tip-label">Typical range</span>
          <p class="tip-range">{{ colorant.range }}</p>
        </div>
        <div v-if="hasSubs" class="tip-sub-hint">
          Click ⇄ to see substitutes
        </div>
      </div>
    </Transition>

    <!-- Ingredient Switcher -->
    <IngredientSwitcher
      :ingredient="ingredient"
      :visible="switcherOpen"
      @close="switcherOpen = false"
      @swap="(id, opt) => emit('swap', id, opt)"
    />
  </div>
</template>

<style scoped>
.ingredient-row-wrap {
  position: relative;
  border-bottom: 1px solid var(--ink-05);
  animation: row-enter 0.3s ease calc(var(--rank, 0) * 40ms) both;
}

@keyframes row-enter {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.ingredient-row {
  display: grid;
  grid-template-columns: 1fr 56px 100px 72px 28px;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) 0;
}

.ing-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.ing-info-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--ink-10);
  color: var(--stone);
  font-family: var(--font-mono);
  font-size: 9px;
  font-style: italic;
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.ing-info-dot:hover,
.ing-info-dot.active {
  background: var(--clay);
  color: white;
}

.ing-pct {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  text-align: right;
}

.ing-bar-wrap {
  height: 8px;
  background: var(--parchment);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.ing-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--clay), var(--clay-light));
  border-radius: var(--radius-full);
  max-width: 100%;
  transition: width 0.5s ease;
}

.ing-grams {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--carbon);
  text-align: right;
}

.sub-trigger {
  background: none;
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  color: var(--stone);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.sub-trigger:hover,
.sub-trigger.active {
  background: var(--clay);
  border-color: var(--clay);
  color: white;
}

/* Info panel — in flow, no glitch */
.ing-info-panel {
  padding: var(--space-3);
  margin: var(--space-1) 0 var(--space-2);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border: 1px solid var(--ink-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.tip-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.tip-section + .tip-section {
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-05);
}

.tip-beginner {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

.tip-role {
  display: flex;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  text-transform: capitalize;
}

.tip-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--clay);
}

.tip-visual-hint {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.45;
  font-style: italic;
}

.tip-range {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone-dark);
}

.tip-watch {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.tip-watch-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.tip-watch-item {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--danger);
  padding: 1px var(--space-1);
  background: var(--danger-10);
  border-radius: 2px;
}

.tip-sub-hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--clay);
  font-style: italic;
  padding-top: var(--space-1);
  border-top: 1px solid var(--ink-05);
}

.expand-info-enter-active,
.expand-info-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.expand-info-enter-from,
.expand-info-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
