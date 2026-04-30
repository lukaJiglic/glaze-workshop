<script setup lang="ts">
import { computed } from 'vue'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import TagBadge from '@/components/ui/TagBadge.vue'
import type { Recipe } from '@/types'

const props = defineProps<{ recipe: Recipe }>()

const glazeStore = useGlazeStore()
const workshopStore = useWorkshopStore()

const profileId = computed(() => glazeStore.profileForRecipe.get(props.recipe.id))
const profile = computed(() => profileId.value ? glazeStore.colorProfileById.get(profileId.value) : null)
const customSwatch = computed(() => {
  if (!props.recipe.id.startsWith('custom-')) return null
  const custom = workshopStore.customRecipes.find(r => r.id === props.recipe.id)
  return custom?.swatchColor ?? null
})
const swatchHex = computed(() => customSwatch.value ?? profile.value?.swatchHex ?? '#ede6d6')

const isFav = computed(() => workshopStore.isFavorite(props.recipe.id))
const isInCompare = computed(() => workshopStore.compareIds.includes(props.recipe.id))
const canCompare = computed(() => workshopStore.compareIds.length < 3 || isInCompare.value)

const primaryAtmosphere = computed(() => props.recipe.atmosphereIds[0] ?? '')
const primarySurface = computed(() => props.recipe.surfaceIds[0] ?? '')

// Visual scores for surface simulation
const scores = computed(() => {
  const familyId = profile.value?.familyId
  return glazeStore.getScores(props.recipe.id, familyId ?? undefined)
})

// Generate CSS surface simulation based on scores
const surfaceStyle = computed(() => {
  if (!scores.value) return {}
  const s = scores.value
  const hex = swatchHex.value
  const gloss = s.glossLevel / 5

  // Build gradient layers
  const layers: string[] = []

  // Gloss highlight
  if (gloss > 0.5) {
    const intensity = Math.round((gloss - 0.5) * 0.3 * 100)
    layers.push(`linear-gradient(135deg, rgba(255,255,255,${intensity / 100}) 0%, transparent 60%)`)
  }

  // Pooling: darker edges
  if (s.poolingLevel >= 3) {
    const poolIntensity = (s.poolingLevel / 5) * 0.25
    layers.push(`radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${poolIntensity}) 100%)`)
  }

  // Variation: subtle noise-like pattern
  if (s.variationLevel >= 3) {
    const varIntensity = (s.variationLevel / 5) * 0.08
    layers.push(`repeating-conic-gradient(rgba(0,0,0,${varIntensity}) 0% 25%, transparent 0% 50%)`)
  }

  if (layers.length === 0) return {}
  return { backgroundImage: layers.join(', ') }
})

function open() {
  workshopStore.openRecipe(props.recipe)
}
</script>

<template>
  <article class="recipe-card" @click="open" role="button" tabindex="0" @keydown.enter="open">
    <!-- Color swatch strip -->
    <div class="card-swatch" :style="{ background: swatchHex }">
      <div class="swatch-surface" :style="surfaceStyle" />
      <div class="swatch-sheen" />
      <span
        v-if="workshopStore.hasUserNotes(recipe.id)"
        class="note-indicator"
        title="Has personal notes"
      >✎</span>
      <button
        v-if="canCompare || isInCompare"
        class="compare-btn"
        :class="{ active: isInCompare }"
        @click.stop="workshopStore.toggleCompare(recipe.id)"
        :aria-label="isInCompare ? 'Remove from comparison' : 'Add to comparison'"
        :title="isInCompare ? 'Remove from comparison' : 'Compare'"
      >⇔</button>
      <button
        class="fav-btn"
        :class="{ active: isFav }"
        @click.stop="workshopStore.toggleFavorite(recipe.id)"
        :aria-label="isFav ? 'Remove from favorites' : 'Add to favorites'"
      >
        {{ isFav ? '♥' : '♡' }}
      </button>
    </div>

    <!-- Card body -->
    <div class="card-body">
      <div class="card-tags">
        <TagBadge :label="'C' + recipe.cone" variant="cone" />
        <TagBadge v-if="primaryAtmosphere" :label="primaryAtmosphere" variant="atmosphere" />
      </div>

      <h3 class="card-name">{{ recipe.name }}</h3>

      <p v-if="profile?.appearance" class="card-appearance">{{ profile.appearance }}</p>

      <div class="card-footer">
        <div class="card-footer-left">
          <TagBadge v-if="primarySurface" :label="primarySurface" variant="surface" />
          <span
            v-if="recipe.tablewareStatus"
            class="tableware-icon"
            :class="recipe.tablewareStatus"
            :title="recipe.tablewareStatus.replace(/-/g, ' ')"
          >{{ recipe.tablewareStatus === 'functional' ? '✓' : recipe.tablewareStatus === 'test-only' ? '⚠' : '◦' }}</span>
        </div>
        <span class="card-ingredient-count">{{ recipe.ingredients.length }} materials</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.recipe-card {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--ink-10);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  display: flex;
  flex-direction: column;
}

.recipe-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-swatch {
  height: 80px;
  position: relative;
  flex-shrink: 0;
}

.swatch-surface {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
}

.swatch-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%);
}

.note-indicator {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--cream-85);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--clay);
  backdrop-filter: blur(4px);
}

.compare-btn {
  position: absolute;
  top: var(--space-2);
  right: 38px;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--cream-85);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--stone);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(4px);
  opacity: 0;
  visibility: hidden;
}

.recipe-card:hover .compare-btn,
.compare-btn.active {
  opacity: 1;
  visibility: visible;
}

.compare-btn:hover,
.compare-btn.active {
  background: rgba(255,255,255,0.95);
  color: var(--clay);
  transform: scale(1.1);
}

.fav-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--cream-85);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--stone);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(4px);
}

.fav-btn:hover,
.fav-btn.active {
  background: rgba(255,255,255,0.95);
  color: var(--clay);
  transform: scale(1.1);
}

.card-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.card-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.card-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
  line-height: 1.3;
}

.card-appearance {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.5;
  font-style: italic;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-05);
}

.card-footer-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tableware-icon {
  font-family: var(--font-mono);
  font-size: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
}

.tableware-icon.functional {
  color: var(--sage);
}

.tableware-icon.test-only {
  color: var(--clay);
}

.tableware-icon.decorative {
  color: var(--stone);
}

.card-ingredient-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
}
</style>
