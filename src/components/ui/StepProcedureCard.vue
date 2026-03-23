<script setup lang="ts">
import { ref } from 'vue'
import type { StepProcedure } from '@/types'

defineProps<{
  procedure: StepProcedure
}>()

const expanded = ref(false)
</script>

<template>
  <div class="procedure-card" :class="{ expanded }">
    <button class="procedure-header" @click="expanded = !expanded">
      <div class="procedure-title-area">
        <h3 class="procedure-name">{{ procedure.name }}</h3>
        <p class="procedure-goal">{{ procedure.goal }}</p>
      </div>
      <span class="procedure-toggle">{{ expanded ? '▾' : '▸' }}</span>
    </button>

    <Transition name="expand-proc">
      <div v-if="expanded" class="procedure-body">
        <!-- Steps -->
        <div class="proc-section">
          <span class="proc-label">Steps</span>
          <ol class="proc-steps">
            <li v-for="(step, i) in procedure.steps" :key="i">
              <span class="proc-step-num">{{ i + 1 }}</span>
              <span>{{ step }}</span>
            </li>
          </ol>
        </div>

        <!-- Checkpoints -->
        <div v-if="procedure.checkpoints.length" class="proc-section">
          <span class="proc-label">Checkpoints</span>
          <div class="checkpoint-list">
            <div v-for="(cp, i) in procedure.checkpoints" :key="i" class="checkpoint-item">
              <span class="checkpoint-mark">✓</span>
              <span>{{ cp }}</span>
            </div>
          </div>
        </div>

        <!-- Common mistakes -->
        <div v-if="procedure.commonMistakes.length" class="proc-section">
          <span class="proc-label">Common mistakes</span>
          <div class="mistake-list">
            <div v-for="(m, i) in procedure.commonMistakes" :key="i" class="mistake-item">
              <span class="mistake-icon">!</span>
              <span>{{ m }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.procedure-card {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.procedure-card.expanded {
  border-color: var(--ink-20);
}

.procedure-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-5);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

.procedure-header:hover {
  background: var(--ink-05);
}

.procedure-title-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.procedure-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
  line-height: 1.3;
}

.procedure-goal {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  font-style: italic;
  line-height: 1.5;
}

.procedure-toggle {
  font-size: var(--text-sm);
  color: var(--stone);
  flex-shrink: 0;
  margin-top: 4px;
}

.procedure-body {
  padding: 0 var(--space-5) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  border-top: 1px solid var(--ink-10);
  padding-top: var(--space-4);
}

.proc-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.proc-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--clay);
}

.proc-steps {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.proc-steps li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.55;
}

.proc-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--clay-10);
  color: var(--clay);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.checkpoint-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.checkpoint-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.55;
}

.checkpoint-mark {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--sage);
  flex-shrink: 0;
  margin-top: 2px;
}

.mistake-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mistake-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: rgba(196, 83, 42, 0.06);
  border-left: 2px solid rgba(196, 83, 42, 0.3);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.mistake-icon {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--clay);
  flex-shrink: 0;
  margin-top: 2px;
}

.mistake-item span:last-child {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone-dark);
  line-height: 1.5;
}

/* Transition */
.expand-proc-enter-active,
.expand-proc-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  overflow: hidden;
}

.expand-proc-enter-from,
.expand-proc-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
