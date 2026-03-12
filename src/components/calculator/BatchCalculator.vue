<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkshopStore } from '@/stores/workshop'
import { storeToRefs } from 'pinia'
import IngredientRow from './IngredientRow.vue'
import AnimatedNumber from '@/components/ui/AnimatedNumber.vue'
import type { SubstitutionOption } from '@/data/materials-knowledge'

const store = useWorkshopStore()
const router = useRouter()
const { batchWeight, scaledIngredients, totalWeight, calculatorRecipe } = storeToRefs(store)

const presets = [250, 500, 1000, 2000, 5000]

function setPreset(w: number) {
  batchWeight.value = w
}

const recipe = computed(() => calculatorRecipe.value)

// Swap confirmation state
const swapConfirm = ref<{ fromLabel: string; toLabel: string } | null>(null)

function handleSwap(originalId: string, opt: SubstitutionOption) {
  if (!recipe.value) return

  // Duplicate into custom recipe
  const custom = store.duplicateRecipeAsCustom(recipe.value)
  const idx = custom.ingredients.findIndex(i => i.materialId === originalId)
  if (idx !== -1) {
    const fromLabel = custom.ingredients[idx].sourceLabel
    custom.ingredients[idx] = {
      materialId: opt.materialId,
      sourceLabel: opt.label,
      amount: custom.ingredients[idx].amount,
    }
    custom.notes.push(`Substituted: replaced ${fromLabel} with ${opt.label}. ${opt.difficultyNote}`)
    store.saveCustomRecipe(custom)

    swapConfirm.value = { fromLabel, toLabel: opt.label }
    setTimeout(() => {
      swapConfirm.value = null
      router.push(`/my-recipes/${custom.id}`)
    }, 1800)
  }
}
</script>

<template>
  <div class="batch-calculator">
    <div v-if="!recipe" class="empty-state">
      <div class="empty-icon">⚗</div>
      <h3>No recipe loaded</h3>
      <p>Open a recipe from the Workshop and tap <em>Open in Calculator</em>.</p>
    </div>

    <template v-else>
      <!-- Recipe header -->
      <div class="calc-recipe-header">
        <h2 class="calc-recipe-name">{{ recipe.name }}</h2>
        <button class="clear-btn" @click="store.clearCalculator()">Clear ×</button>
      </div>

      <!-- Batch weight input -->
      <div class="batch-input-section">
        <label class="batch-label" for="batch-weight">Batch weight</label>
        <div class="batch-input-wrap">
          <input
            id="batch-weight"
            v-model.number="batchWeight"
            type="number"
            class="batch-input"
            min="1"
            max="99999"
            step="50"
          />
          <span class="batch-unit">g</span>
        </div>
        <div class="presets">
          <button
            v-for="p in presets"
            :key="p"
            class="preset-btn"
            :class="{ active: batchWeight === p }"
            @click="setPreset(p)"
          >
            {{ p }}g
          </button>
        </div>
      </div>

      <!-- Ingredients table -->
      <div class="ingredients-table">
        <div class="table-header">
          <span>Ingredient</span>
          <span>%</span>
          <span>—</span>
          <span>Grams</span>
          <span></span>
        </div>
        <IngredientRow
          v-for="(ing, i) in scaledIngredients"
          :key="ing.materialId + i"
          :ingredient="ing"
          :rank="i"
          @swap="handleSwap"
        />
        <div class="table-footer">
          <span>Total</span>
          <span></span>
          <span></span>
          <span class="total-grams">
            <AnimatedNumber :value="totalWeight" :decimals="1" suffix="g" />
          </span>
          <span></span>
        </div>
      </div>

      <!-- Swap confirmation -->
      <Transition name="toast">
        <div v-if="swapConfirm" class="swap-toast">
          <span class="toast-icon">✓</span>
          <div class="toast-text">
            <strong>Swap saved as new recipe</strong>
            <span>{{ swapConfirm.fromLabel }} → {{ swapConfirm.toLabel }}</span>
            <span class="toast-sub">Opening editor…</span>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.batch-calculator {
  background: var(--chalk);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  border: 1px solid var(--ink-10);
}

.empty-state {
  text-align: center;
  padding: var(--space-16) var(--space-8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.3;
}

.empty-state h3 {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--stone);
}

.empty-state p {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  max-width: 280px;
}

.calc-recipe-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.calc-recipe-name {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--carbon);
}

.clear-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.clear-btn:hover { color: var(--clay); border-color: var(--clay); }

.batch-input-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: var(--space-5);
  background: var(--parchment);
  border-radius: var(--radius-lg);
}

.batch-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone);
}

.batch-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.batch-input {
  font-family: var(--font-mono);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--carbon);
  background: transparent;
  border: none;
  width: 180px;
  outline: none;
  -moz-appearance: textfield;
}

.batch-input::-webkit-outer-spin-button,
.batch-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

.batch-unit {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  color: var(--stone);
}

.presets {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.preset-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--stone);
  transition: all var(--transition-fast);
}

.preset-btn:hover, .preset-btn.active {
  background: var(--clay);
  border-color: var(--clay);
  color: white;
}

.ingredients-table { display: flex; flex-direction: column; }

.table-header {
  display: grid;
  grid-template-columns: 1fr 56px 100px 72px 28px;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--ink-20);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}

.table-footer {
  display: grid;
  grid-template-columns: 1fr 56px 100px 72px 28px;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 2px solid var(--ink-20);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--stone);
}

.total-grams {
  text-align: right;
  color: var(--carbon);
  font-size: var(--text-base);
}

/* Swap toast */
.swap-toast {
  margin-top: var(--space-4);
  background: var(--carbon);
  color: var(--cream);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.toast-icon {
  font-size: var(--text-lg);
  color: var(--sage);
  flex-shrink: 0;
}

.toast-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toast-text strong {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
}

.toast-text span {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  opacity: 0.8;
}

.toast-sub {
  font-family: var(--font-mono) !important;
  font-size: 10px !important;
  opacity: 0.6 !important;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
