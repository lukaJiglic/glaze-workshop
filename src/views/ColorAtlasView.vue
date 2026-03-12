<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGlazeStore } from '@/stores/glaze'
import ColorAtlasCard from '@/components/color/ColorAtlasCard.vue'

gsap.registerPlugin(ScrollTrigger)

const store = useGlazeStore()

const selectedFamily = ref<string | null>(null)

const families = computed(() => {
  const familyIds = new Set(store.colorProfiles.map(p => p.familyId))
  return Array.from(familyIds).sort()
})

const filteredProfiles = computed(() => {
  if (!selectedFamily.value) return store.colorProfiles
  return store.colorProfiles.filter(p => p.familyId === selectedFamily.value)
})

const gridEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!gridEl.value) return
  const cards = Array.from(gridEl.value.querySelectorAll('.atlas-card-wrap'))
  gsap.fromTo(
    cards,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, stagger: 0.04, duration: 0.5, ease: 'power2.out', scrollTrigger: {
      trigger: gridEl.value,
      start: 'top 85%',
      once: true,
    }}
  )
})
</script>

<template>
  <div class="atlas-view">
    <!-- Header -->
    <div class="atlas-header">
      <div class="atlas-header-inner">
        <h1 class="page-title">Color Atlas</h1>
        <p class="page-sub">{{ store.colorProfiles.length }} color profiles across all firing ranges</p>
      </div>
    </div>

    <div class="atlas-layout">
      <!-- Family filter bar -->
      <div class="family-filter-bar" v-reveal>
        <button
          class="family-btn"
          :class="{ active: selectedFamily === null }"
          @click="selectedFamily = null"
        >
          All
        </button>
        <button
          v-for="fam in families"
          :key="fam"
          class="family-btn"
          :class="{ active: selectedFamily === fam }"
          @click="selectedFamily = fam"
        >
          {{ fam.replace(/-/g, ' ') }}
        </button>
      </div>

      <!-- Result count -->
      <div class="atlas-meta">
        <span class="results-count">
          {{ filteredProfiles.length }} profile{{ filteredProfiles.length !== 1 ? 's' : '' }}
          <template v-if="selectedFamily"> in {{ selectedFamily.replace(/-/g, ' ') }}</template>
        </span>
      </div>

      <!-- Grid -->
      <div ref="gridEl" class="atlas-grid">
        <TransitionGroup name="card" tag="div" class="atlas-grid-inner" appear>
          <div
            v-for="profile in filteredProfiles"
            :key="profile.id"
            class="atlas-card-wrap"
          >
            <ColorAtlasCard :profile="profile" />
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
.atlas-view {
  min-height: 100vh;
  background: var(--cream);
}

.atlas-header {
  background: var(--carbon);
  padding: calc(var(--nav-height) + var(--space-8)) var(--space-8) var(--space-8);
}

.atlas-header-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--cream);
}

.page-sub {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone-light);
  letter-spacing: 0.04em;
}

.atlas-layout {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-8);
}

.family-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
}

.family-btn {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: capitalize;
  border: 1px solid var(--ink-10);
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.family-btn:hover {
  background: var(--parchment);
  color: var(--ink);
}

.family-btn.active {
  background: var(--clay);
  border-color: var(--clay);
  color: white;
}

.atlas-meta {
  margin-bottom: var(--space-5);
}

.results-count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
  text-transform: capitalize;
}

.atlas-grid {
  /* wrapper for TransitionGroup */
}

.atlas-grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
}

/* Card transition */
.card-enter-active, .card-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.card-enter-from, .card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.atlas-card-wrap {
  /* just for GSAP targeting */
}

@media (max-width: 600px) {
  .atlas-layout { padding: var(--space-4); }
  .atlas-grid-inner { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
</style>
