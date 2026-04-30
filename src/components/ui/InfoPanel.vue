<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
}>()

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="info-panel" :class="{ 'info-panel--open': isOpen }">
    <button class="info-panel__toggle" @click="toggle" :aria-expanded="isOpen">
      <span class="info-panel__icon" aria-hidden="true">?</span>
      <span class="info-panel__title">{{ title }}</span>
      <span class="info-panel__chevron" aria-hidden="true">{{ isOpen ? '−' : '+' }}</span>
    </button>
    <Transition name="info-slide">
      <div v-if="isOpen" class="info-panel__body">
        <div class="info-panel__content">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.info-panel {
  background: var(--parchment);
  border: 1px solid var(--ink-05);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: var(--space-2);
}

.info-panel__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  letter-spacing: 0.02em;
  transition: color var(--transition-fast);
}

.info-panel__toggle:hover {
  color: var(--clay);
}

.info-panel__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 10px;
  font-weight: 700;
  color: var(--stone);
  background: var(--ink-05);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  line-height: 1;
  transition: all var(--transition-fast);
}

.info-panel__toggle:hover .info-panel__icon {
  color: var(--chalk);
  background: var(--clay);
}

.info-panel__title {
  flex: 1;
}

.info-panel__chevron {
  font-size: var(--text-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.info-panel__body {
  overflow: hidden;
}

.info-panel__content {
  padding: 0 var(--space-3) var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark);
  line-height: 1.6;
}

/* Slide transition */
.info-slide-enter-active {
  transition: all var(--transition-base);
}

.info-slide-leave-active {
  transition: all 200ms ease;
}

.info-slide-enter-from,
.info-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.info-slide-enter-to,
.info-slide-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
