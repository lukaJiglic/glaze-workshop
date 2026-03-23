<script setup lang="ts">
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import type { Recipe } from '@/types'

defineProps<{
  recipes: Recipe[]
  title: string
  sectionKey: string
  hint?: string
  isSectionOpen: boolean
  coneLabel?: (recipe: Recipe) => string
}>()

const emit = defineEmits<{
  toggle: [key: string]
}>()

const glazeStore = useGlazeStore()
const workshopStore = useWorkshopStore()

function getSwatchHex(recipe: Recipe): string {
  const pid = glazeStore.profileForRecipe.get(recipe.id)
  if (!pid) return '#ede6d6'
  return glazeStore.colorProfileById.get(pid)?.swatchHex ?? '#ede6d6'
}
</script>

<template>
  <section v-if="recipes.length" class="drawer-section collapsible-section">
    <h3 class="section-label section-toggle" @click="emit('toggle', sectionKey)">
      {{ title }}
      <span v-if="hint" class="section-hint">{{ hint }}</span>
      <span class="toggle-arrow">{{ isSectionOpen ? '▾' : '▸' }}</span>
    </h3>
    <div v-if="isSectionOpen" class="similar-list">
      <button
        v-for="r in recipes"
        :key="r.id"
        class="similar-card"
        @click="workshopStore.openRecipe(r)"
      >
        <div class="similar-swatch" :style="{ background: getSwatchHex(r) }" />
        <div class="similar-info">
          <span class="similar-name">{{ r.name }}</span>
          <span class="similar-cone">{{ coneLabel ? coneLabel(r) : `C${r.cone}` }}</span>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.drawer-section {
  padding: var(--space-4) 0;
  border-top: 1px solid var(--ink-10);
}

.collapsible-section .section-toggle {
  cursor: pointer;
  user-select: none;
}

.section-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.section-hint {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  text-transform: none;
  letter-spacing: normal;
  font-style: italic;
  color: var(--stone-light);
}

.toggle-arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--stone);
}

.similar-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.similar-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--ink-10);
  background: var(--chalk);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all var(--transition-fast);
}

.similar-card:hover {
  border-color: var(--clay);
  background: var(--parchment);
  transform: translateX(3px);
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
</style>
