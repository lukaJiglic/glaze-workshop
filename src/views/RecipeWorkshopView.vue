<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import { useGlazeSearch } from '@/composables/useGlazeSearch'
import { useGlazeFilter } from '@/composables/useGlazeFilter'
import FilterSidebar from '@/components/recipe/FilterSidebar.vue'
import FilterChip from '@/components/recipe/FilterChip.vue'
import RecipeCard from '@/components/recipe/RecipeCard.vue'
import type { FilterState } from '@/types'

const store = useGlazeStore()
const workshopStore = useWorkshopStore()
const route = useRoute()

const { query, results: searchResults, isSearching, clearSearch } = useGlazeSearch(() => store.recipes)

const {
  selectedCones,
  selectedAtmospheres,
  selectedColors,
  selectedSurfaces,
  selectedFamilies,
  selectedStyles,
  selectedTablewareStatuses,
  filteredRecipes,
  activeFilterCount,
  toggleFilter,
  clearAll,
  removeFilter,
} = useGlazeFilter(() => searchResults.value)

// Read URL query param to pre-fill search (e.g. from ingredient filter link)
onMounted(() => {
  if (route.query.q && typeof route.query.q === 'string') {
    query.value = route.query.q
  }
})

const filters = computed<FilterState>(() => ({
  selectedCones: selectedCones.value,
  selectedAtmospheres: selectedAtmospheres.value,
  selectedColors: selectedColors.value,
  selectedSurfaces: selectedSurfaces.value,
  selectedFamilies: selectedFamilies.value,
  selectedStyles: selectedStyles.value,
  selectedTablewareStatuses: selectedTablewareStatuses.value,
}))

// Active chips for display
const activeChips = computed(() => [
  ...selectedCones.value.map(v => ({ type: 'cones' as const, value: v, label: v })),
  ...selectedAtmospheres.value.map(v => ({ type: 'atmospheres' as const, value: v, label: v })),
  ...selectedColors.value.map(v => ({ type: 'colors' as const, value: v, label: v })),
  ...selectedSurfaces.value.map(v => ({ type: 'surfaces' as const, value: v, label: v })),
  ...selectedFamilies.value.map(v => ({ type: 'families' as const, value: v, label: v })),
  ...selectedStyles.value.map(v => ({ type: 'styles' as const, value: v, label: v })),
  ...selectedTablewareStatuses.value.map(v => ({ type: 'tableware' as const, value: v, label: v })),
])

// ─── Sort ────────────────────────────────────────────────────────────────────
type SortKey = 'default' | 'name-asc' | 'name-desc' | 'cone-asc' | 'favorites'

const sortBy = ref<SortKey>('default')

const firingRangeOrder: Record<string, number> = {
  'low-fire': 1,
  'mid-fire': 2,
  'high-fire': 3,
  'raku': 0,
}

function firstConeNum(cone: string): number {
  const m = cone.match(/(\d+)/)
  return m ? parseInt(m[1]) : 99
}

const sortedRecipes = computed(() => {
  const base = filteredRecipes.value.slice()
  if (sortBy.value === 'name-asc') return base.sort((a, b) => a.name.localeCompare(b.name))
  if (sortBy.value === 'name-desc') return base.sort((a, b) => b.name.localeCompare(a.name))
  if (sortBy.value === 'cone-asc') {
    return base.sort((a, b) => {
      const rangeA = firingRangeOrder[a.firingRangeId] ?? 5
      const rangeB = firingRangeOrder[b.firingRangeId] ?? 5
      if (rangeA !== rangeB) return rangeA - rangeB
      return firstConeNum(a.cone) - firstConeNum(b.cone)
    })
  }
  if (sortBy.value === 'favorites') {
    const favSet = new Set(workshopStore.favoriteIds)
    return base.sort((a, b) => {
      const aFav = favSet.has(a.id) ? 0 : 1
      const bFav = favSet.has(b.id) ? 0 : 1
      return aFav - bFav
    })
  }
  return base
})

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Relevance' },
  { key: 'name-asc', label: 'A → Z' },
  { key: 'name-desc', label: 'Z → A' },
  { key: 'cone-asc', label: 'Cone ↑' },
  { key: 'favorites', label: '♥ First' },
]

// ─── Sidebar & grid ──────────────────────────────────────────────────────────
const sidebarOpen = ref(false)
const gridEl = ref<HTMLElement | null>(null)

watch(sortedRecipes, async () => {
  await nextTick()
  if (!gridEl.value) return
  const cards = Array.from(gridEl.value.children) as HTMLElement[]
  gsap.fromTo(
    cards,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, stagger: 0.04, duration: 0.4, ease: 'power2.out' }
  )
}, { immediate: false })

const displayedRecipes = computed(() => sortedRecipes.value.slice(0, 120))
</script>

<template>
  <div class="workshop-view">
    <!-- Page header -->
    <div class="workshop-header">
      <div class="workshop-header-inner">
        <h1 class="page-title">Recipe Workshop</h1>
        <p class="page-sub">{{ store.recipes.length }} recipes loaded</p>
      </div>
    </div>

    <div class="workshop-layout">
      <!-- Mobile sidebar toggle -->
      <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
        <span>Filter</span>
        <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
      </button>

      <!-- Sidebar -->
      <Transition name="slide-sidebar">
        <FilterSidebar
          v-show="sidebarOpen || true"
          :filters="filters"
          :active-count="activeFilterCount"
          @toggle="toggleFilter"
          @clear-all="clearAll"
          class="desktop-sidebar"
        />
      </Transition>

      <!-- Main content -->
      <div class="workshop-main">
        <!-- Search bar -->
        <div class="search-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input
              v-model="query"
              type="search"
              class="search-input"
              placeholder="Search recipes, ingredients, surfaces…"
              autocomplete="off"
            />
            <button v-if="query" class="search-clear" @click="clearSearch">×</button>
          </div>
        </div>

        <!-- Active filter chips -->
        <div v-if="activeChips.length" class="active-chips">
          <FilterChip
            v-for="chip in activeChips"
            :key="chip.type + chip.value"
            :label="chip.label"
            @remove="removeFilter(chip.type, chip.value)"
          />
          <button class="clear-all-chips" @click="clearAll">Clear all</button>
        </div>

        <!-- Results meta + sort -->
        <div class="results-row">
          <span class="results-count">
            {{ filteredRecipes.length }} recipe{{ filteredRecipes.length !== 1 ? 's' : '' }}
            <template v-if="isSearching">matching "{{ query }}"</template>
          </span>
          <div class="sort-controls">
            <span class="sort-label">Sort:</span>
            <button
              v-for="opt in sortOptions"
              :key="opt.key"
              class="sort-btn"
              :class="{ active: sortBy === opt.key }"
              @click="sortBy = opt.key"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- Recipe grid -->
        <TransitionGroup
          ref="gridEl"
          tag="div"
          class="recipe-grid"
          name="card"
          appear
        >
          <RecipeCard
            v-for="recipe in displayedRecipes"
            :key="recipe.id"
            :recipe="recipe"
          />
        </TransitionGroup>

        <!-- Empty state -->
        <div v-if="filteredRecipes.length === 0" class="empty-state">
          <div class="empty-icon">◎</div>
          <h3>No recipes found</h3>
          <p>Try different filters or clear your search.</p>
          <button class="btn btn-secondary" @click="clearAll(); clearSearch()">Reset all</button>
        </div>

        <!-- Load more hint -->
        <div v-if="filteredRecipes.length > 120" class="load-more-hint">
          <p>Showing first 120 of {{ filteredRecipes.length }}. Refine your filters to see more.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workshop-view {
  min-height: 100vh;
  background: var(--cream);
}

.workshop-header {
  background: var(--carbon);
  padding: calc(var(--nav-height) + var(--space-8)) var(--space-8) var(--space-8);
}

.workshop-header-inner {
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

.workshop-layout {
  display: flex;
  max-width: var(--content-max);
  margin: 0 auto;
  min-height: calc(100vh - 200px);
}

.sidebar-toggle {
  display: none;
  align-items: center;
  gap: var(--space-2);
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-above);
  background: var(--carbon);
  color: var(--cream);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  box-shadow: var(--shadow-lg);
}

.filter-badge {
  width: 20px;
  height: 20px;
  background: var(--clay);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.desktop-sidebar {
  display: flex;
}

.workshop-main {
  flex: 1;
  padding: var(--space-6) var(--space-8);
  min-width: 0;
}

.search-bar {
  margin-bottom: var(--space-4);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  padding: 0 var(--space-4);
  gap: var(--space-2);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.search-input-wrap:focus-within {
  border-color: var(--clay);
  box-shadow: 0 0 0 3px var(--clay-10);
}

.search-icon { font-size: var(--text-base); opacity: 0.5; }

.search-input {
  flex: 1;
  padding: var(--space-3) 0;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--ink);
  outline: none;
}

.search-input::placeholder { color: var(--stone); }

.search-clear {
  font-size: 1.2rem;
  color: var(--stone);
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-fast);
}

.search-clear:hover { color: var(--clay); }

.active-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-4);
}

.clear-all-chips {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.clear-all-chips:hover { color: var(--clay); border-color: var(--clay); }

.results-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.results-count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.sort-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-right: var(--space-1);
}

.sort-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: transparent;
  letter-spacing: 0.03em;
}

.sort-btn:hover { color: var(--ink); border-color: var(--ink-20); }

.sort-btn.active {
  background: var(--carbon);
  color: var(--cream);
  border-color: var(--carbon);
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}

/* Card transition */
.card-enter-active, .card-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.card-enter-from, .card-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
.card-leave-active { position: absolute; }

.empty-state {
  padding: var(--space-16) var(--space-8);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.empty-icon { font-size: 3rem; opacity: 0.3; }

.empty-state h3 {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--stone);
}

.empty-state p {
  font-family: var(--font-body);
  color: var(--stone);
}

.load-more-hint {
  margin-top: var(--space-8);
  text-align: center;
  padding: var(--space-4);
  background: var(--parchment);
  border-radius: var(--radius-md);
}

.load-more-hint p {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
}

@media (max-width: 768px) {
  .desktop-sidebar { display: none; }
  .sidebar-toggle { display: flex; }
  .workshop-main { padding: var(--space-4); }
  .results-row { flex-direction: column; align-items: flex-start; }
}
</style>
