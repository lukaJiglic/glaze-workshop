<script setup lang="ts">
import { ref, onErrorCaptured, watch } from 'vue'
import { useRoute } from 'vue-router'

const error = ref<Error | null>(null)
const route = useRoute()

onErrorCaptured((err: Error) => {
  error.value = err
  console.error('[ErrorBoundary]', err)
  return false // prevent propagation
})

// Clear error on route change so navigation away from a broken page works
watch(() => route.fullPath, () => {
  error.value = null
})

function retry() {
  error.value = null
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <div class="error-boundary-inner">
      <span class="error-icon" aria-hidden="true">!</span>
      <h2 class="error-heading">Something went wrong</h2>
      <p class="error-message">{{ error.message }}</p>
      <div class="error-actions">
        <button class="btn btn-primary" @click="retry">Try Again</button>
        <RouterLink to="/" class="btn btn-ghost" @click="error = null">Back to Studio</RouterLink>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-8);
}

.error-boundary-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-width: 420px;
  text-align: center;
}

.error-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--clay-10);
  color: var(--clay);
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.error-heading {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--carbon);
}

.error-message {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.6;
  font-style: italic;
}

.error-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-2);
}
</style>
