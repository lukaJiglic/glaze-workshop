<script setup lang="ts">
import type { BodyResponse, BodyDefinition } from '@/types'

const props = defineProps<{
  responses: BodyResponse[]
  bodies: BodyDefinition[]
}>()

function bodyLabel(bodyId: string): string {
  return props.bodies.find(b => b.id === bodyId)?.label ?? bodyId.replace(/-/g, ' ')
}

function riskClass(risk: string): string {
  if (risk.includes('low')) return 'risk-low'
  if (risk.includes('very') || risk.includes('high')) return risk.includes('very') ? 'risk-very-high' : 'risk-high'
  return 'risk-medium'
}
</script>

<template>
  <div class="body-response-panel">
    <div v-for="resp in responses" :key="resp.bodyId" class="body-card">
      <div class="body-header">
        <span class="body-name">{{ bodyLabel(resp.bodyId) }}</span>
        <span class="fit-badge" :class="riskClass(resp.fitRisk)">{{ resp.fitRisk }}</span>
      </div>

      <div class="body-details">
        <div class="body-detail">
          <span class="detail-label">Colour shift</span>
          <span class="detail-value">{{ resp.colorShift }}</span>
        </div>
        <div class="body-detail">
          <span class="detail-label">Surface shift</span>
          <span class="detail-value">{{ resp.surfaceShift }}</span>
        </div>
        <div class="body-detail">
          <span class="detail-label">Application tolerance</span>
          <span class="detail-value">{{ resp.applicationTolerance }}</span>
        </div>
      </div>

      <div v-if="resp.watchFor.length" class="body-watch">
        <div v-for="(w, i) in resp.watchFor" :key="i" class="watch-item">
          <span class="watch-dot">!</span>
          <span>{{ w }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.body-response-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.body-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
}

.body-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.body-name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--carbon);
}

.fit-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid;
  white-space: nowrap;
}

.risk-low {
  color: var(--sage);
  border-color: var(--sage-40);
  background: var(--sage-08);
}

.risk-medium {
  color: var(--stone-dark);
  border-color: var(--ink-20);
  background: var(--ink-05);
}

.risk-high {
  color: var(--clay);
  border-color: var(--clay-30);
  background: var(--clay-06);
}

.risk-very-high {
  color: var(--danger-dark);
  border-color: var(--danger);
  background: var(--danger-10);
}

.body-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.body-detail {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.detail-label {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--stone);
}

.detail-value {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark);
  line-height: 1.45;
}

.body-watch {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: var(--space-1);
  border-top: 1px solid var(--ink-05);
}

.watch-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
}

.watch-dot {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  color: var(--clay);
  flex-shrink: 0;
  margin-top: 2px;
}

.watch-item span:last-child {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--stone);
  line-height: 1.45;
}
</style>
