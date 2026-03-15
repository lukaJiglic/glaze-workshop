<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useGlazeStore } from '@/stores/glaze'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const store = useGlazeStore()
const gridEl = ref<HTMLElement | null>(null)

const families = computed(() => store.families.slice(0, 9))

// Map families to their representative color
const familyColor = (familyId: string): string => {
  const colorMap: Record<string, string> = {
    'clear-liner': '#e7efef',
    'majolica-family': '#f1ede4',
    'celadon-family': '#a5b8a0',
    'shino-family': '#cf7a37',
    'temmoku-family': '#2b211b',
    'ash-family': '#cdb99e',
    'chun-family': '#89a8ba',
    'copper-red-family': '#8d3026',
    'crystalline-family': '#ddd9d1',
    'raku-metallic-family': '#7a5a43',
    'oatmeal-rutile-family': '#d6c1a1',
    'slip-trailing-family': '#d9cfbc',
  }
  return colorMap[familyId] ?? '#ede6d6'
}

onMounted(() => {
  if (!gridEl.value) return
  const cards = Array.from(gridEl.value.querySelectorAll('.family-card'))
  gsap.set(cards, { opacity: 0, y: 32 })
  ScrollTrigger.create({
    trigger: gridEl.value,
    start: 'top 80%',
    onEnter: () => {
      gsap.to(cards, { opacity: 1, y: 0, stagger: 0.07, duration: 0.55, ease: 'power2.out' })
    },
    once: true,
  })
})
</script>

<template>
  <section class="family-preview">
    <div class="section-head">
      <h2 class="section-title" v-reveal>Glaze Families</h2>
      <p class="section-sub" v-reveal.fade>From celadon to temmoku — the major traditions of high-fire craft.</p>
    </div>

    <div ref="gridEl" class="family-grid">
      <RouterLink
        v-for="family in families"
        :key="family.id"
        to="/workshop"
        class="family-card"
      >
        <div class="family-swatch" :style="{ background: familyColor(family.id) }">
          <div class="swatch-sheen" />
        </div>
        <div class="family-info">
          <h3 class="family-name">{{ family.name }}</h3>
          <p class="family-summary">{{ family.summary }}</p>
          <div class="family-signals">
            <span v-for="sig in family.commonSignals.slice(0,2)" :key="sig" class="signal-tag">
              {{ sig }}
            </span>
          </div>
          <span class="browse-hint">Browse recipes →</span>
        </div>
      </RouterLink>
    </div>

    <div class="section-cta" v-reveal.scale>
      <RouterLink to="/workshop" class="btn btn-secondary">Browse all recipes →</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.family-preview {
  padding: var(--space-20) var(--space-8);
  max-width: var(--content-max);
  margin: 0 auto;
}

.section-head {
  margin-bottom: var(--space-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--carbon);
}

.section-sub {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  color: var(--stone);
  max-width: 500px;
}

.family-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-10);
}

.family-card {
  display: flex;
  flex-direction: column;
  background: var(--chalk);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--ink-10);
  text-decoration: none;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.family-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.family-swatch {
  height: 72px;
  position: relative;
}

.swatch-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
}

.family-info {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.family-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
}

.family-summary {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.5;
  font-style: italic;
  flex: 1;
}

.family-signals {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-05);
}

.signal-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  letter-spacing: 0.02em;
}

.signal-tag::before {
  content: '— ';
  color: var(--clay);
}

.browse-hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  letter-spacing: 0.05em;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.family-card:hover .browse-hint {
  opacity: 1;
  transform: translateX(0);
  color: var(--clay);
}

.section-cta {
  display: flex;
  justify-content: center;
}
</style>
