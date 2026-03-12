<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import type { ColorProfile } from '@/types'

const props = defineProps<{ profile: ColorProfile }>()

const glazeStore = useGlazeStore()
const workshopStore = useWorkshopStore()

const expanded = ref(false)

const scores = computed(() => {
  const fd = glazeStore.visualMetadata?.familyDefaults.find(f => f.familyId === props.profile.familyId)
  return fd?.scores ?? null
})

const linkedRecipes = computed(() =>
  glazeStore.recipeMappings
    .filter(m => m.defaultProfileId === props.profile.id)
    .map(m => glazeStore.recipeById.get(m.recipeId))
    .filter(Boolean)
)

const isGlossy = computed(() => (scores.value?.glossLevel ?? 0) >= 3)

function scoreBar(val: number) {
  return `${(val / 5) * 100}%`
}

function openRecipe(recipe: NonNullable<typeof linkedRecipes.value[number]>) {
  workshopStore.openRecipe(recipe)
}
</script>

<template>
  <article
    class="atlas-card"
    :class="{ expanded }"
    @click="expanded = !expanded"
    role="button"
    :aria-expanded="expanded"
  >
    <!-- Full background swatch -->
    <div class="card-bg" :style="{ background: profile.swatchHex }">
      <div class="bg-sheen" :class="{ glossy: isGlossy }" />

      <div class="expand-indicator">{{ expanded ? '−' : '+' }}</div>

      <!-- Name overlay -->
      <div class="card-name-overlay">
        <span class="profile-name">{{ profile.name }}</span>
        <span class="profile-family label-upper">{{ profile.familyId.replace(/-/g, ' ') }}</span>
      </div>
    </div>

    <!-- Always visible detail -->
    <div class="card-detail">
      <p class="profile-appearance">{{ profile.appearance }}</p>

      <div v-if="scores" class="score-bars">
        <div class="score-item">
          <span class="score-name">Gloss</span>
          <div class="score-track">
            <div class="score-fill" :style="{ width: scoreBar(scores.glossLevel) }" />
          </div>
        </div>
        <div class="score-item">
          <span class="score-name">Opacity</span>
          <div class="score-track">
            <div class="score-fill" :style="{ width: scoreBar(scores.opacityLevel) }" />
          </div>
        </div>
        <div class="score-item">
          <span class="score-name">Variation</span>
          <div class="score-track">
            <div class="score-fill" :style="{ width: scoreBar(scores.variationLevel) }" />
          </div>
        </div>
        <div class="score-item">
          <span class="score-name">Run risk</span>
          <div class="score-track">
            <div class="score-fill run-risk" :style="{ width: scoreBar(scores.runRisk) }" />
          </div>
        </div>
      </div>

      <!-- Linked recipes — shown when expanded -->
      <Transition name="expand">
        <div v-if="expanded && linkedRecipes.length" class="linked-recipes-panel">
          <span class="label-upper">Linked recipes</span>
          <ul class="recipe-links">
            <li v-for="recipe in linkedRecipes" :key="recipe!.id">
              <button
                class="recipe-link-btn"
                @click.stop="openRecipe(recipe!)"
              >
                <span class="recipe-link-name">{{ recipe!.name }}</span>
                <span class="recipe-link-meta">C{{ recipe!.cone }}</span>
              </button>
            </li>
          </ul>
        </div>
        <div v-else-if="expanded" class="no-linked">
          <span class="label-upper">No direct recipe links</span>
        </div>
      </Transition>

      <div v-if="!expanded && linkedRecipes.length" class="linked-count">
        <span class="label-upper">{{ linkedRecipes.length }} recipe{{ linkedRecipes.length > 1 ? 's' : '' }} — tap to expand</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.atlas-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--ink-10);
  cursor: pointer;
  background: var(--chalk);
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.atlas-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.atlas-card.expanded {
  border-color: var(--clay);
  box-shadow: var(--shadow-clay);
  transform: none;
}

.card-bg {
  height: 120px;
  position: relative;
}

.bg-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.08) 100%);
}

.bg-sheen.glossy {
  background:
    linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%),
    linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.12) 100%);
}

.expand-indicator {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: rgba(0,0,0,0.35);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  backdrop-filter: blur(4px);
  transition: background var(--transition-fast);
}

.atlas-card.expanded .expand-indicator {
  background: rgba(196, 83, 42, 0.85);
}

.card-name-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-3) var(--space-3) var(--space-2);
  background: linear-gradient(0deg, rgba(0,0,0,0.45) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  color: white;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

.profile-family {
  color: rgba(255,255,255,0.75);
  font-size: 10px;
}

.card-detail {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.profile-appearance {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  line-height: 1.5;
  font-style: italic;
}

.score-bars { display: flex; flex-direction: column; gap: var(--space-2); }

.score-item {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: var(--space-2);
  align-items: center;
}

.score-name {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.score-track {
  height: 5px;
  background: var(--parchment);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: var(--clay);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.score-fill.run-risk { background: #c0392b; }

.linked-count {
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-05);
}

.linked-recipes-panel {
  padding-top: var(--space-2);
  border-top: 1px solid var(--clay-20);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.no-linked {
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-05);
}

.recipe-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recipe-link-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--parchment);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: var(--space-2);
}

.recipe-link-btn:hover {
  background: var(--clay-10);
  border-color: rgba(196, 83, 42, 0.2);
}

.recipe-link-name {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.3;
  flex: 1;
}

.recipe-link-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  white-space: nowrap;
}

.label-upper {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}

/* Expand transition */
.expand-enter-active, .expand-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
