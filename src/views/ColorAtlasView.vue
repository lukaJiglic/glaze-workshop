<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGlazeStore } from '@/stores/glaze'
import ColorAtlasCard from '@/components/color/ColorAtlasCard.vue'
import { colorantHeuristics } from '@/data/materials-knowledge'

gsap.registerPlugin(ScrollTrigger)

const store = useGlazeStore()

const selectedFamily = ref<string | null>(null)
const selectedFiringRange = ref<string | null>(null)

const families = computed(() => {
  const familyIds = new Set(store.colorProfiles.map(p => p.familyId))
  return Array.from(familyIds).sort()
})

// Build a map: profileId → Set<firingRangeId> (which firing ranges have recipes using this profile)
const profileFiringRanges = computed(() => {
  const map = new Map<string, Set<string>>()
  for (const mapping of store.recipeMappings) {
    const recipe = store.recipeById.get(mapping.recipeId)
    if (!recipe) continue
    const profileIds = [mapping.defaultProfileId, ...(mapping.secondaryProfileIds ?? [])]
    for (const pid of profileIds) {
      if (!map.has(pid)) map.set(pid, new Set())
      map.get(pid)!.add(recipe.firingRangeId)
    }
  }
  return map
})

const firingRanges = ['low-fire', 'mid-fire', 'high-fire', 'raku'] as const

const filteredProfiles = computed(() => {
  let list = store.colorProfiles
  if (selectedFamily.value) {
    list = list.filter(p => p.familyId === selectedFamily.value)
  }
  if (selectedFiringRange.value) {
    list = list.filter(p => {
      const ranges = profileFiringRanges.value.get(p.id)
      return ranges?.has(selectedFiringRange.value!) ?? false
    })
  }
  return list
})

// Chemistry summary for selected color family
const familyChemistrySummary = computed(() => {
  if (!selectedFamily.value) return null

  // Get all profiles in this family
  const familyProfileIds = new Set(
    store.colorProfiles
      .filter(p => p.familyId === selectedFamily.value)
      .map(p => p.id)
  )

  // Get all recipes that map to these profiles
  const familyRecipes = store.recipes.filter(r => {
    const pid = store.profileForRecipe.get(r.id)
    return pid && familyProfileIds.has(pid)
  })

  if (familyRecipes.length === 0) return null

  // Collect colorant usage across these recipes
  const colorantStats = new Map<string, { count: number; minPct: number; maxPct: number; label: string }>()

  for (const recipe of familyRecipes) {
    for (const ing of recipe.ingredients) {
      if (colorantHeuristics.has(ing.materialId)) {
        const existing = colorantStats.get(ing.materialId)
        if (existing) {
          existing.count++
          existing.minPct = Math.min(existing.minPct, ing.amount)
          existing.maxPct = Math.max(existing.maxPct, ing.amount)
        } else {
          colorantStats.set(ing.materialId, {
            count: 1,
            minPct: ing.amount,
            maxPct: ing.amount,
            label: ing.sourceLabel,
          })
        }
      }
    }
  }

  // Only include colorants used in at least 2 recipes or >25% of family recipes
  const threshold = Math.max(2, familyRecipes.length * 0.25)
  const summary = Array.from(colorantStats.entries())
    .filter(([, s]) => s.count >= threshold)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, s]) => ({
      materialId: id,
      label: s.label,
      count: s.count,
      total: familyRecipes.length,
      range: s.minPct === s.maxPct
        ? `${s.minPct}%`
        : `${s.minPct}–${s.maxPct}%`,
    }))

  return summary.length > 0 ? summary : null
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

      <!-- Firing range filter -->
      <div class="firing-filter-bar" v-reveal>
        <span class="filter-bar-label">Firing range</span>
        <button
          class="firing-btn"
          :class="{ active: selectedFiringRange === null }"
          @click="selectedFiringRange = null"
        >All</button>
        <button
          v-for="fr in firingRanges"
          :key="fr"
          class="firing-btn"
          :class="{ active: selectedFiringRange === fr }"
          @click="selectedFiringRange = fr"
        >{{ fr.replace(/-/g, ' ') }}</button>
      </div>

      <!-- Result count -->
      <div class="atlas-meta">
        <span class="results-count">
          {{ filteredProfiles.length }} profile{{ filteredProfiles.length !== 1 ? 's' : '' }}
          <template v-if="selectedFamily"> in {{ selectedFamily.replace(/-/g, ' ') }}</template>
        </span>
      </div>

      <!-- Chemistry summary for selected family -->
      <div v-if="familyChemistrySummary" class="family-chemistry">
        <h3 class="chemistry-label">Common colorants in {{ selectedFamily?.replace(/-/g, ' ') }}</h3>
        <div class="chemistry-chips">
          <div v-for="item in familyChemistrySummary" :key="item.materialId" class="chem-chip">
            <span class="chem-chip-name">{{ item.label }}</span>
            <span class="chem-chip-range">{{ item.range }}</span>
            <span class="chem-chip-usage">{{ item.count }}/{{ item.total }} recipes</span>
          </div>
        </div>
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

.firing-filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.filter-bar-label {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--stone);
  margin-right: var(--space-1);
}

.firing-btn {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: capitalize;
  border: 1px solid var(--ink-10);
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: transparent;
}

.firing-btn:hover {
  background: var(--parchment);
  color: var(--ink);
}

.firing-btn.active {
  background: var(--carbon);
  border-color: var(--carbon);
  color: var(--cream);
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

/* Chemistry summary */
.family-chemistry {
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  background: var(--chalk);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
}

.chemistry-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  margin-bottom: var(--space-3);
}

.chemistry-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chem-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--clay);
}

.chem-chip-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--carbon);
}

.chem-chip-range {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--clay);
  font-weight: 700;
}

.chem-chip-usage {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
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
