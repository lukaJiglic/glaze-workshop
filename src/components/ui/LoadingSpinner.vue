<script setup lang="ts">
defineProps<{ size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <div class="spinner-wrap" :class="size ?? 'md'">
    <div class="spinner-orb" />
    <p class="spinner-text">Loading workshop…</p>
  </div>
</template>

<style scoped>
.spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-12);
}

.spinner-orb {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: conic-gradient(var(--clay), var(--sage), var(--clay));
  animation: spin 1.2s linear infinite;
  position: relative;
}

.spinner-orb::after {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: var(--cream);
}

.spinner-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}

.sm .spinner-orb { width: 32px; height: 32px; }
.sm .spinner-orb::after { inset: 4px; }
.lg .spinner-orb { width: 64px; height: 64px; }
.lg .spinner-orb::after { inset: 8px; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
