<script setup lang="ts">
import type { ColourDevelopmentGuide } from '@/types'

defineProps<{
  guides: ColourDevelopmentGuide[]
}>()
</script>

<template>
  <div class="colour-guide-panel">
    <div v-for="guide in guides" :key="guide.id" class="guide-block">
      <h4 class="guide-name">{{ guide.name }}</h4>
      <p class="guide-goal">{{ guide.goal }}</p>

      <div class="guide-section">
        <span class="guide-label">Best hosts</span>
        <ul class="guide-list">
          <li v-for="(host, i) in guide.bestHosts" :key="i">{{ host }}</li>
        </ul>
      </div>

      <div v-if="guide.colourants.length" class="guide-section">
        <span class="guide-label">Colourant behaviour</span>
        <ul class="guide-list">
          <li v-for="(c, i) in guide.colourants" :key="i">{{ c }}</li>
        </ul>
      </div>

      <div v-if="guide.bodyEffects.length" class="guide-section">
        <span class="guide-label">Body effects</span>
        <ul class="guide-list muted">
          <li v-for="(e, i) in guide.bodyEffects" :key="i">{{ e }}</li>
        </ul>
      </div>

      <div v-if="guide.thicknessEffects.length" class="guide-section">
        <span class="guide-label">Thickness effects</span>
        <ul class="guide-list muted">
          <li v-for="(e, i) in guide.thicknessEffects" :key="i">{{ e }}</li>
        </ul>
      </div>

      <div v-if="guide.coolingEffects.length" class="guide-section">
        <span class="guide-label">Cooling effects</span>
        <ul class="guide-list muted">
          <li v-for="(e, i) in guide.coolingEffects" :key="i">{{ e }}</li>
        </ul>
      </div>

      <div v-if="guide.atmosphereEffects?.length" class="guide-section">
        <span class="guide-label">Atmosphere effects</span>
        <ul class="guide-list muted">
          <li v-for="(e, i) in guide.atmosphereEffects" :key="i">{{ e }}</li>
        </ul>
      </div>

      <div v-if="guide.commonMistakes.length" class="guide-section">
        <span class="guide-label">Common mistakes</span>
        <div class="mistake-list">
          <div v-for="(m, i) in guide.commonMistakes" :key="i" class="mistake-item">
            <span class="mistake-icon">!</span>
            <span>{{ m }}</span>
          </div>
        </div>
      </div>

      <div v-if="guide.stepSequence.length" class="guide-section">
        <span class="guide-label">Testing sequence</span>
        <ol class="step-list">
          <li v-for="(s, i) in guide.stepSequence" :key="i">
            <span class="step-num">{{ i + 1 }}</span>
            <span>{{ s }}</span>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped>
.colour-guide-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.guide-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.guide-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
}

.guide-goal {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--stone);
  line-height: 1.5;
}

.guide-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.guide-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  font-weight: 700;
}

.guide-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guide-list li {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
  padding-left: var(--space-3);
  position: relative;
}

.guide-list li::before {
  content: '·';
  position: absolute;
  left: var(--space-1);
  color: var(--stone);
  font-weight: 700;
}

.guide-list.muted li {
  color: var(--stone-dark);
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
  padding: var(--space-1) var(--space-2);
  background: var(--clay-06);
  border-left: 2px solid var(--clay-30);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.mistake-icon {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--clay);
  flex-shrink: 0;
  margin-top: 1px;
}

.mistake-item span:last-child {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark);
  line-height: 1.5;
}

.step-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

.step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--ink-05);
  color: var(--stone);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}
</style>
