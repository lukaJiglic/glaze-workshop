<script setup lang="ts">
defineProps<{ label: string }>()
const emit = defineEmits<{ remove: [] }>()
</script>

<template>
  <button class="filter-chip" @click="emit('remove')" :aria-label="`Remove ${label} filter`">
    {{ label }}
    <span class="chip-remove">×</span>
  </button>
</template>

<style scoped>
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--clay-10);
  border: 1px solid var(--clay-25);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--clay-dark);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.filter-chip:hover {
  background: var(--clay-25);
  transform: scale(0.97);
}

.chip-remove {
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;
}
</style>
