<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import RecipeCard from '@/components/recipe/RecipeCard.vue'

const glazeStore = useGlazeStore()
const workshopStore = useWorkshopStore()

const savedRecipes = computed(() =>
  workshopStore.favoriteIds
    .map(id => glazeStore.recipeById.get(id))
    .filter(Boolean) as ReturnType<typeof glazeStore.recipeById.get>[]
)

const gridEl = ref<HTMLElement | null>(null)

watch(savedRecipes, async () => {
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
      <!-- Recipe grid -->
      <TransitionGroup
        v-if="savedRecipes.length"
        ref="gridEl"
        tag="div"
        class="recipe-grid"
        name="card"
        appear
      >
        <RecipeCard
          v-for="recipe in savedRecipes"
          :key="recipe!.id"
          :recipe="recipe!"
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
  background: var(--carbon);
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
  color: var(--cream);
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
