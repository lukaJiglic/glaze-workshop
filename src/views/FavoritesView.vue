<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import RecipeCard from '@/components/recipe/RecipeCard.vue'
import type { Recipe } from '@/types'

const glazeStore = useGlazeStore()
const workshopStore = useWorkshopStore()

type SortMode = 'saved' | 'name' | 'cone' | 'family'

const sortBy = ref<SortMode>('saved')

const firingOrder: Record<string, number> = { 'raku': 0, 'low-fire': 1, 'mid-fire': 2, 'high-fire': 3 }

function coneNum(r: Recipe): number {
  const m = String(r.cone).match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

function recipeFamily(r: Recipe): string {
  const profileId = glazeStore.profileForRecipe.get(r.id)
  const profile = profileId ? glazeStore.colorProfileById.get(profileId) : null
  return profile?.familyId ?? 'ungrouped'
}

const savedRecipes = computed(() =>
  workshopStore.favoriteIds
    .map(id => {
      const builtin = glazeStore.recipeById.get(id)
      if (builtin) return builtin
      const custom = workshopStore.customRecipes.find(r => r.id === id)
      if (custom) return workshopStore.customToRecipe(custom)
      return undefined
    })
    .filter(Boolean) as Recipe[]
)

const sortedRecipes = computed(() => {
  const list = [...savedRecipes.value]
  switch (sortBy.value) {
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name))
    case 'cone':
      return list.sort((a, b) => (firingOrder[a.firingRangeId] ?? 99) - (firingOrder[b.firingRangeId] ?? 99) || coneNum(a) - coneNum(b))
    case 'family':
      return list.sort((a, b) => recipeFamily(a).localeCompare(recipeFamily(b)))
    default:
      return list // saved order
  }
})

const groupedRecipes = computed(() => {
  if (sortBy.value !== 'family' && sortBy.value !== 'cone') return null
  const groups = new Map<string, Recipe[]>()
  for (const r of sortedRecipes.value) {
    const key = sortBy.value === 'family'
      ? recipeFamily(r)
      : (r.firingRangeId ?? 'unknown')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  return groups
})

const gridEl = ref<HTMLElement | null>(null)

watch(sortedRecipes, async () => {
  await nextTick()
  if (!gridEl.value) return
  const cards = Array.from(gridEl.value.children) as HTMLElement[]
  gsap.fromTo(cards,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: 'power2.out' }
  )
}, { immediate: true })
</script>

<template>
  <div class="favorites-view">
    <div class="favorites-header">
      <div class="header-inner">
        <h1 class="page-title">Saved Recipes</h1>
        <p class="page-sub">{{ savedRecipes.length }} recipe{{ savedRecipes.length !== 1 ? 's' : '' }} saved</p>
      </div>
    </div>

    <div class="favorites-content">
      <!-- Sort bar -->
      <div v-if="savedRecipes.length" class="sort-bar">
        <button
          v-for="opt in (['saved', 'name', 'cone', 'family'] as SortMode[])"
          :key="opt"
          class="sort-btn"
          :class="{ active: sortBy === opt }"
          @click="sortBy = opt"
        >{{ opt === 'saved' ? 'Date saved' : opt === 'cone' ? 'Cone' : opt === 'family' ? 'Family' : 'A–Z' }}</button>
      </div>

      <!-- Grouped layout -->
      <template v-if="groupedRecipes && savedRecipes.length">
        <div v-for="[groupKey, groupRecipes] in groupedRecipes" :key="groupKey" class="recipe-group">
          <h3 class="group-label">{{ groupKey.replace(/-/g, ' ') }}</h3>
          <div class="recipe-grid">
            <RecipeCard
              v-for="recipe in groupRecipes"
              :key="recipe.id"
              :recipe="recipe"
            />
          </div>
        </div>
      </template>

      <!-- Flat layout -->
      <TransitionGroup
        v-else-if="savedRecipes.length"
        ref="gridEl"
        tag="div"
        class="recipe-grid"
        name="card"
        appear
      >
        <RecipeCard
          v-for="recipe in sortedRecipes"
          :key="recipe.id"
          :recipe="recipe"
        />
      </TransitionGroup>

      <!-- Empty state -->
      <div v-else class="empty-state" v-reveal.fade>
        <div class="empty-icon">♡</div>
        <h3>No saved recipes yet</h3>
        <p>Open any recipe in the Workshop and tap the heart to save it here.</p>
        <RouterLink to="/workshop" class="btn btn-primary">Go to Workshop</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-view {
  min-height: 100vh;
  background: var(--cream);
}

.favorites-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-8)) var(--space-8) var(--space-8);
}

.header-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--on-band);
}

.page-sub {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone-light);
  letter-spacing: 0.04em;
}

.favorites-content {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-8);
}

.sort-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.sort-btn {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  background: var(--chalk);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sort-btn:hover { border-color: var(--ink-20); color: var(--ink); }

.sort-btn.active {
  background: var(--band);
  color: var(--on-band);
  border-color: var(--carbon);
}

.recipe-group {
  margin-bottom: var(--space-6);
}

.group-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--clay);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--ink-10);
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}

/* Card transition */
.card-enter-active, .card-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.card-enter-from, .card-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
.card-leave-active { position: absolute; }

.empty-state {
  padding: var(--space-20) var(--space-8);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.empty-icon {
  font-size: 4rem;
  color: var(--clay);
  opacity: 0.4;
  line-height: 1;
}

.empty-state h3 {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--carbon);
}

.empty-state p {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  max-width: 360px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .favorites-content { padding: var(--space-4); }
}
</style>
