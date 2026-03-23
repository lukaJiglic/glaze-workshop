<script setup lang="ts">
import type { FiringProgram } from '@/types'

defineProps<{
  programs: FiringProgram[]
}>()

function fToC(f: number): number {
  return Math.round((f - 32) * 5 / 9)
}

function rateToC(fPerHour: number): number {
  return Math.round(fPerHour * 5 / 9)
}
</script>

<template>
  <div class="firing-program-panel">
    <div v-for="prog in programs" :key="prog.id" class="program-block">
      <div class="program-header">
        <h4 class="program-name">{{ prog.name }}</h4>
        <span class="program-kind">{{ prog.kind }}</span>
      </div>
      <p class="program-cone">{{ prog.targetConeOrRange }}</p>

      <!-- Firing steps table -->
      <div class="steps-table">
        <div class="steps-header-row">
          <span>Ramp</span>
          <span>Target</span>
          <span>Hold</span>
        </div>
        <div v-for="(step, i) in prog.steps" :key="i" class="step-row">
          <span class="step-val">{{ step.rateFPerHour === 999 ? 'FULL' : rateToC(step.rateFPerHour) + '°C/hr' }}</span>
          <span class="step-val">{{ fToC(step.targetF) }}°C</span>
          <span class="step-val">{{ step.holdMinutes > 0 ? step.holdMinutes + ' min' : '—' }}</span>
        </div>
      </div>

      <!-- Outcome goals -->
      <div v-if="prog.outcomeGoals.length" class="program-section">
        <span class="prog-label">Goals</span>
        <ul class="prog-list">
          <li v-for="(g, i) in prog.outcomeGoals" :key="i">{{ g }}</li>
        </ul>
      </div>

      <!-- Risk signals -->
      <div v-if="prog.riskSignals.length" class="program-section">
        <span class="prog-label">Watch for</span>
        <div class="risk-list">
          <div v-for="(r, i) in prog.riskSignals" :key="i" class="risk-item">
            <span class="risk-icon">!</span>
            <span>{{ r }}</span>
          </div>
        </div>
      </div>

      <!-- Adjustments -->
      <div v-if="prog.adjustments.length" class="program-section">
        <span class="prog-label">Adjustments</span>
        <ul class="prog-list muted">
          <li v-for="(a, i) in prog.adjustments" :key="i">{{ a }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.firing-program-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.program-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.program-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.program-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
}

.program-kind {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--stone);
  background: var(--ink-05);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  padding: 2px 8px;
}

.program-cone {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  letter-spacing: 0.04em;
}

/* Steps table */
.steps-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.steps-header-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--ink-05);
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  font-weight: 700;
}

.step-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--ink-05);
}

.step-val {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--carbon);
}

.program-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.prog-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  font-weight: 700;
}

.prog-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.prog-list li {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
  padding-left: var(--space-3);
  position: relative;
}

.prog-list li::before {
  content: '·';
  position: absolute;
  left: var(--space-1);
  color: var(--stone);
  font-weight: 700;
}

.prog-list.muted li {
  color: var(--stone-dark);
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: rgba(196, 83, 42, 0.06);
  border-left: 2px solid rgba(196, 83, 42, 0.3);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.risk-icon {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--clay);
  flex-shrink: 0;
  margin-top: 1px;
}

.risk-item span:last-child {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark);
  line-height: 1.5;
}
</style>
