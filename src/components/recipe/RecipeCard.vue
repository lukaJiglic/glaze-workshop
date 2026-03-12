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
const swatchHex = computed(() => profile.value?.swatchHex ?? '#ede6d6')

const isFav = computed(() => workshopStore.isFavorite(props.recipe.id))

const primaryAtmosphere = computed(() => props.recipe.atmosphereIds[0] ?? '')
const primarySurface = computed(() => props.recipe.surfaceIds[0] ?? '')

function open() {
  workshopStore.openRecipe(props.recipe)
}
</script>

<template>
  <article class="recipe-card" @click="open" role="button" tabindex="0" @keydown.enter="open">
    <!-- Color swatch strip -->
    <div class="card-swatch" :style="{ background: swatchHex }">
      <div class="swatch-sheen" />
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
        <TagBadge v-if="primarySurface" :label="primarySurface" variant="surface" />
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

.swatch-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%);
}

.fav-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: rgba(245, 240, 232, 0.85);
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

.card-ingredient-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
}
</style>
