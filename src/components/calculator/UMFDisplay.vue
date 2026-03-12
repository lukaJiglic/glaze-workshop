<script setup lang="ts">
import { computed } from 'vue'
import type { ScaledIngredient } from '@/types'
import { useGlazeChemistry } from '@/composables/useGlazeChemistry'
import ChemistryPanel from '@/components/recipe/ChemistryPanel.vue'

const props = defineProps<{
  ingredients: ScaledIngredient[]
  totalWeight: number
  firingRangeId?: string
}>()

// Show ingredient weights as a visual bar chart
const bars = computed(() => {
  if (!props.ingredients.length) return []
  const max = Math.max(...props.ingredients.map(i => i.scaledGrams))
  return props.ingredients
    .slice()
    .sort((a, b) => b.scaledGrams - a.scaledGrams)
    .map((ing, idx) => ({
      label: ing.sourceLabel,
      grams: ing.scaledGrams,
      pct: ing.amount,
      barWidth: max > 0 ? (ing.scaledGrams / max) * 100 : 0,
      color: `hsl(${20 + idx * 25}, 55%, ${50 + idx * 3}%)`,
    }))
})

// UMF chemistry — ScaledIngredient extends Ingredient, so types are compatible
const ingredientRef = computed(() => props.ingredients)
const firingRangeRef = computed(() => props.firingRangeId)
const { chemistry } = useGlazeChemistry(ingredientRef, firingRangeRef)
</script>

<template>
  <div class="umf-display">
    <div class="umf-header">
      <h3 class="umf-title">Batch Profile</h3>
      <span class="umf-subtitle">by weight</span>
    </div>

    <div v-if="!bars.length" class="umf-empty">Load a recipe to see its profile</div>

    <template v-else>
      <div class="umf-bars">
        <div v-for="bar in bars" :key="bar.label" class="umf-bar-row">
          <span class="bar-label">{{ bar.label }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: bar.barWidth + '%', background: bar.color }" />
          </div>
          <span class="bar-value">{{ bar.grams.toFixed(1) }}g</span>
        </div>
      </div>

      <div class="chemistry-divider">
        <span class="divider-label">Unity Molecular Formula</span>
      </div>

      <ChemistryPanel :chemistry="chemistry" :compact="true" />
    </template>
  </div>
</template>

<style scoped>
.umf-display {
  background: var(--parchment);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  border: 1px solid var(--ink-10);
}

.umf-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.umf-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--carbon);
}

.umf-subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  letter-spacing: 0.06em;
}

.umf-empty {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--stone);
  text-align: center;
  padding: var(--space-8) 0;
}

.umf-bars { display: flex; flex-direction: column; gap: var(--space-3); }

.umf-bar-row {
  display: grid;
  grid-template-columns: 140px 1fr 64px;
  gap: var(--space-3);
  align-items: center;
}

.bar-label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-track {
  height: 12px;
  background: var(--ink-05);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
}

.bar-value {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  text-align: right;
}

.chemistry-divider {
  margin: var(--space-6) 0 var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.chemistry-divider::before,
.chemistry-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ink-10);
}

.divider-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone);
  white-space: nowrap;
}
</style>
