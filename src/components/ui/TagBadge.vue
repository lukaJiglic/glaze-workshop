<script setup lang="ts">
defineProps<{
  label: string
  variant?: 'cone' | 'atmosphere' | 'surface' | 'color' | 'default'
}>()
</script>

<template>
  <span class="tag-badge" :class="variant ?? 'default'">{{ label }}</span>
</template>

<style scoped>
.tag-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.default {
  background: var(--ink-10);
  color: var(--stone-dark);
}

.cone {
  background: rgba(196, 83, 42, 0.12);
  color: var(--clay-dark);
}

.atmosphere {
  background: rgba(122, 143, 110, 0.15);
  color: var(--sage-dark);
}

.surface {
  background: rgba(139, 115, 85, 0.12);
  color: var(--stone-dark);
}

.color {
  background: var(--parchment);
  color: var(--ink);
}
</style>
