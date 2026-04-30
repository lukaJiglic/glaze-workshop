<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import AppNav from '@/components/layout/AppNav.vue'
import PageTransition from '@/components/layout/PageTransition.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import RecipeDetail from '@/components/recipe/RecipeDetail.vue'

const store = useGlazeStore()
const workshopStore = useWorkshopStore()

onMounted(() => {
  store.loadAll()
})

// Restore calculator recipe from localStorage once data loads
watch(() => store.isLoaded, (loaded) => {
  if (loaded) workshopStore.restoreCalculatorRecipe(store.recipeById)
}, { immediate: true })
</script>

<template>
  <div class="app texture-overlay">
    <AppNav />

    <main class="app-main">
      <!-- Loading overlay -->
      <Transition name="fade">
        <div v-if="store.isLoading" class="loading-overlay">
          <LoadingSpinner size="lg" />
        </div>
      </Transition>

      <!-- Error state -->
      <div v-if="store.error" class="error-state">
        <p>Failed to load workshop data: {{ store.error }}</p>
        <button class="btn btn-primary" @click="store.loadAll()">Retry</button>
      </div>

      <!-- Router views -->
      <RouterView v-slot="{ Component }">
        <PageTransition>
          <ErrorBoundary>
            <component :is="Component" :key="$route.path" />
          </ErrorBoundary>
        </PageTransition>
      </RouterView>
    </main>

    <!-- Global recipe detail drawer -->
    <RecipeDetail />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.app-main {
  position: relative;
  min-height: 100vh;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--cream);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-20);
  text-align: center;
  color: var(--stone);
  font-family: var(--font-body);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
