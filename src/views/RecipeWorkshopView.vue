<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import { useGlazeSearch } from '@/composables/useGlazeSearch'
import { useGlazeFilter } from '@/composables/useGlazeFilter'
import FilterSidebar from '@/components/recipe/FilterSidebar.vue'
import FilterChip from '@/components/recipe/FilterChip.vue'
import RecipeCard from '@/components/recipe/RecipeCard.vue'
import ComparePanel from '@/components/recipe/ComparePanel.vue'
import { computeUMF } from '@/composables/useGlazeChemistry'
import type { FilterState, UMFResult } from '@/types'

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
  selectedKilns,
  selectedTechniques,
  selectedClays,
  selectedIngredients,
  filteredRecipes,
  activeFilterCount,
  toggleFilter,
  clearAll,
  removeFilter,
  savedFilterSets,
  saveCurrentFilters,
  loadFilterSet,
  deleteFilterSet,
  facetCounts,
  chemistryRanges,
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
  selectedKilns: selectedKilns.value,
  selectedTechniques: selectedTechniques.value,
  selectedClays: selectedClays.value,
  selectedIngredients: selectedIngredients.value,
  chemistryRanges: chemistryRanges.value,
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
  ...selectedKilns.value.map(v => ({ type: 'kilns' as const, value: v, label: v.replace(/-/g, ' ') })),
  ...selectedTechniques.value.map(v => ({ type: 'techniques' as const, value: v, label: v.replace(/-/g, ' ') })),
  ...selectedClays.value.map(v => ({ type: 'clays' as const, value: v, label: v.replace(/-/g, ' ') })),
  ...selectedIngredients.value.map(v => ({ type: 'ingredients' as const, value: v, label: v.replace(/-/g, ' ') })),
])

// ─── Save filter set ─────────────────────────────────────────────────────────
const showSaveFilter = ref(false)
const saveFilterName = ref('')

function handleSaveFilter() {
  if (!saveFilterName.value.trim()) return
  saveCurrentFilters(saveFilterName.value.trim())
  saveFilterName.value = ''
  showSaveFilter.value = false
}

// ─── Sort ────────────────────────────────────────────────────────────────────
// ─── Grouping ───────────────────────────────────────────────────────────────
type GroupBy = 'none' | 'firing-range' | 'surface' | 'color'
const groupBy = ref<GroupBy>('none')

const groupOptions: { key: GroupBy; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'firing-range', label: 'Firing Range' },
  { key: 'surface', label: 'Surface' },
  { key: 'color', label: 'Color' },
]

type SortKey = 'default' | 'name-asc' | 'name-desc' | 'cone-asc' | 'favorites' | 'ingredients-asc' | 'ingredients-desc' | 'si-al-asc' | 'si-al-desc' | 'expansion-asc' | 'expansion-desc' | 'flux-asc' | 'flux-desc' | 'colorant-desc'

const sortBy = ref<SortKey>('default')

// Cache chemistry computations for sort
const chemistryCache = computed(() => {
  const map = new Map<string, UMFResult>()
  for (const r of store.recipes) {
    map.set(r.id, computeUMF(r.ingredients, r.firingRangeId))
  }
  return map
})

function getChemVal(id: string, key: 'siToAl' | 'expansionIndex' | 'fluxSum' | 'colorantPct'): number {
  const umf = chemistryCache.value.get(id)
  if (!umf || !umf.isValid) return -Infinity
  if (key === 'siToAl') return umf.siToAl ?? -Infinity
  if (key === 'expansionIndex') return umf.expansionIndex
  if (key === 'fluxSum') return umf.fluxSum
  // Total colorant % from raw ingredients
  return umf.colorants.reduce((s, e) => s + e.moles, 0)
}

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
  if (sortBy.value === 'ingredients-asc') return base.sort((a, b) => a.ingredients.length - b.ingredients.length)
  if (sortBy.value === 'ingredients-desc') return base.sort((a, b) => b.ingredients.length - a.ingredients.length)
  if (sortBy.value === 'si-al-asc') return base.sort((a, b) => getChemVal(a.id, 'siToAl') - getChemVal(b.id, 'siToAl'))
  if (sortBy.value === 'si-al-desc') return base.sort((a, b) => getChemVal(b.id, 'siToAl') - getChemVal(a.id, 'siToAl'))
  if (sortBy.value === 'expansion-asc') return base.sort((a, b) => getChemVal(a.id, 'expansionIndex') - getChemVal(b.id, 'expansionIndex'))
  if (sortBy.value === 'expansion-desc') return base.sort((a, b) => getChemVal(b.id, 'expansionIndex') - getChemVal(a.id, 'expansionIndex'))
  if (sortBy.value === 'flux-asc') return base.sort((a, b) => getChemVal(a.id, 'fluxSum') - getChemVal(b.id, 'fluxSum'))
  if (sortBy.value === 'flux-desc') return base.sort((a, b) => getChemVal(b.id, 'fluxSum') - getChemVal(a.id, 'fluxSum'))
  if (sortBy.value === 'colorant-desc') return base.sort((a, b) => getChemVal(b.id, 'colorantPct') - getChemVal(a.id, 'colorantPct'))
  return base
})

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Relevance' },
  { key: 'name-asc', label: 'A → Z' },
  { key: 'name-desc', label: 'Z → A' },
  { key: 'cone-asc', label: 'Cone ↑' },
  { key: 'ingredients-asc', label: 'Fewest Ingredients' },
  { key: 'ingredients-desc', label: 'Most Ingredients' },
  { key: 'favorites', label: '♥ First' },
  { key: 'si-al-desc', label: 'Si:Al ↓' },
  { key: 'si-al-asc', label: 'Si:Al ↑' },
  { key: 'expansion-desc', label: 'Expansion ↓' },
  { key: 'flux-desc', label: 'Flux ↓' },
  { key: 'colorant-desc', label: 'Colorant ↓' },
]

// ─── Keyboard navigation ─────────────────────────────────────────────────────
const searchEl = ref<HTMLInputElement | null>(null)

function handleGlobalKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

  if (e.key === '/' && !inInput) {
    e.preventDefault()
    searchEl.value?.focus()
    return
  }

  if (!workshopStore.activeRecipe) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    const idx = sortedRecipes.value.findIndex(r => r.id === workshopStore.activeRecipe!.id)
    if (idx === -1) return
    const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1
    const target = sortedRecipes.value[next]
    if (target) workshopStore.openRecipe(target)
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKey))

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

const PAGE_SIZE = 40
const displayLimit = ref(PAGE_SIZE)
const sentinelEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Reset display limit when filters/sort change
watch(sortedRecipes, () => { displayLimit.value = PAGE_SIZE })

const displayedRecipes = computed(() => sortedRecipes.value.slice(0, displayLimit.value))
const hasMore = computed(() => displayLimit.value < sortedRecipes.value.length)

function loadMore() {
  if (hasMore.value) {
    displayLimit.value = Math.min(displayLimit.value + PAGE_SIZE, sortedRecipes.value.length)
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) loadMore()
  }, { rootMargin: '200px' })
})

watch(sentinelEl, (el, oldEl) => {
  if (oldEl) observer?.unobserve(oldEl)
  if (el) observer?.observe(el)
}, { immediate: true })

onUnmounted(() => observer?.disconnect())

interface RecipeGroup {
  key: string
  label: string
  recipes: typeof displayedRecipes.value
}

const collapsedGroups = ref(new Set<string>())

function toggleGroupCollapse(key: string) {
  const s = new Set(collapsedGroups.value)
  if (s.has(key)) s.delete(key); else s.add(key)
  collapsedGroups.value = s
}

const groupedRecipes = computed<RecipeGroup[]>(() => {
  if (groupBy.value === 'none') return [{ key: '__all', label: '', recipes: displayedRecipes.value }]

  const groups = new Map<string, typeof displayedRecipes.value>()

  for (const r of displayedRecipes.value) {
    let keys: string[] = []
    if (groupBy.value === 'firing-range') {
      keys = [r.firingRangeId]
    } else if (groupBy.value === 'surface') {
      keys = r.surfaceIds.length ? r.surfaceIds : ['other']
    } else if (groupBy.value === 'color') {
      keys = r.colourIds.length ? r.colourIds : ['other']
    }
    for (const k of keys) {
      const arr = groups.get(k) ?? []
      arr.push(r)
      groups.set(k, arr)
    }
  }

  const sorted = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, recipes]) => ({
      key,
      label: key.replace(/-/g, ' '),
      recipes,
    }))

  return sorted
})

// ─── Compare bar ──────────────────────────────────────────────────────────────
const compareCount = computed(() => workshopStore.compareIds.length)

const compareRecipeNames = computed(() =>
  workshopStore.compareIds.map(id => {
    const recipe = store.recipeById.get(id)
    return recipe?.name ?? id
  })
)

function openCompare() {
  if (compareCount.value >= 2) {
    workshopStore.isCompareOpen = true
  }
}
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

    <!-- Error state -->
    <div v-if="store.error" class="workshop-error">
      <p class="error-message">{{ store.error }}</p>
      <button class="btn btn-primary" @click="store.loadAll()">Retry</button>
    </div>

    <!-- Loading state -->
    <div v-else-if="store.isLoading" class="workshop-loading">
      <p class="loading-text">Loading recipes...</p>
    </div>

    <div v-else class="workshop-layout">
      <!-- Mobile sidebar toggle -->
      <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
        <span>Filter</span>
        <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
      </button>

      <!-- Sidebar -->
      <FilterSidebar
        :filters="filters"
        :active-count="activeFilterCount"
        :facet-counts="facetCounts"
        @toggle="toggleFilter"
        @clear-all="clearAll"
        @update:chemistry-ranges="chemistryRanges = $event"
        class="desktop-sidebar"
        :data-open="sidebarOpen"
      />

      <!-- Main content -->
      <div class="workshop-main">
        <!-- Search bar -->
        <div class="search-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input
              ref="searchEl"
              v-model="query"
              type="search"
              class="search-input"
              placeholder="Search recipes, ingredients, surfaces…"
              autocomplete="off"
            />
            <button v-if="query" class="search-clear" @click="clearSearch">×</button>
            <span v-else class="search-shortcut">/</span>
          </div>
        </div>

        <!-- Saved filter sets -->
        <div v-if="savedFilterSets.length || activeChips.length" class="saved-filters-bar">
          <button
            v-for="set in savedFilterSets"
            :key="set.name"
            class="saved-filter-chip"
            @click="loadFilterSet(set)"
          >
            {{ set.name }}
            <span class="saved-filter-remove" @click.stop="deleteFilterSet(set.name)">×</span>
          </button>
          <button
            v-if="activeFilterCount > 0 && !showSaveFilter"
            class="save-filter-btn"
            @click="showSaveFilter = true"
          >+ Save filter</button>
          <div v-if="showSaveFilter" class="save-filter-input-row">
            <input
              v-model="saveFilterName"
              class="save-filter-input"
              placeholder="Filter name..."
              @keydown.enter="handleSaveFilter"
              @keydown.escape="showSaveFilter = false"
            />
            <button class="save-filter-confirm" :disabled="!saveFilterName.trim()" @click="handleSaveFilter">Save</button>
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

        <!-- Results meta + sort + group -->
        <div class="results-row">
          <div class="results-count-row">
            <span class="results-count">
              {{ filteredRecipes.length }} recipe{{ filteredRecipes.length !== 1 ? 's' : '' }}
              <template v-if="isSearching">matching "{{ query }}"</template>
            </span>
            <button
              class="export-csv-btn"
              @click="workshopStore.exportRecipesAsCSV(filteredRecipes)"
              title="Export filtered recipes as CSV"
            >Export CSV</button>
          </div>
          <div class="sort-controls">
            <span class="sort-label">Group:</span>
            <button
              v-for="opt in groupOptions"
              :key="opt.key"
              class="sort-btn"
              :class="{ active: groupBy === opt.key }"
              @click="groupBy = opt.key"
            >{{ opt.label }}</button>
            <span class="sort-sep"></span>
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

        <!-- Recipe grid (grouped or flat) -->
        <div v-for="group in groupedRecipes" :key="group.key">
          <button
            v-if="group.label"
            class="group-header"
            @click="toggleGroupCollapse(group.key)"
          >
            <span class="group-toggle">{{ collapsedGroups.has(group.key) ? '+' : '−' }}</span>
            <span class="group-label">{{ group.label }}</span>
            <span class="group-count">{{ group.recipes.length }}</span>
          </button>
          <TransitionGroup
            v-if="!collapsedGroups.has(group.key)"
            ref="gridEl"
            tag="div"
            class="recipe-grid"
            name="card"
            appear
          >
            <RecipeCard
              v-for="recipe in group.recipes"
              :key="recipe.id"
              :recipe="recipe"
            />
          </TransitionGroup>
        </div>

        <!-- Empty state -->
        <div v-if="filteredRecipes.length === 0" class="empty-state">
          <div class="empty-icon">◎</div>
          <h3>No recipes found</h3>
          <p>Try different filters or clear your search.</p>
          <button class="btn btn-secondary" @click="clearAll(); clearSearch()">Reset all</button>
        </div>

        <!-- Load more sentinel -->
        <div v-if="hasMore" ref="sentinelEl" class="load-more-hint">
          <p>Showing {{ displayedRecipes.length }} of {{ sortedRecipes.length }} recipes — scroll for more</p>
        </div>
      </div>
    </div>

    <!-- Compare bar (floating) -->
    <Transition name="compare-bar">
      <div v-if="compareCount > 0" class="compare-bar">
        <div class="compare-bar-inner">
          <div class="compare-bar-info">
            <span class="compare-bar-count">{{ compareCount }} / 3 selected</span>
            <span class="compare-bar-names">{{ compareRecipeNames.join(' · ') }}</span>
          </div>
          <div class="compare-bar-actions">
            <button
              class="compare-bar-go"
              :disabled="compareCount < 2"
              @click="openCompare"
            >Compare →</button>
            <button class="compare-bar-clear" @click="workshopStore.clearCompare()">Clear</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Compare panel overlay -->
    <ComparePanel />
  </div>
</template>

<style scoped>
.workshop-view {
  min-height: 100vh;
  background: var(--cream);
}

.workshop-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-8)) var(--space-8) var(--space-8);
}

.workshop-header-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.workshop-error,
.workshop-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) var(--space-8);
  text-align: center;
}

.error-message {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--danger);
}

.loading-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
}

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--on-band);
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
  background: var(--band);
  color: var(--on-band);
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

.search-shortcut {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  pointer-events: none;
  opacity: 0.7;
}

/* Saved filter sets */
.saved-filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.saved-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.saved-filter-chip:hover {
  border-color: var(--clay);
  background: var(--clay-10);
}

.saved-filter-remove {
  font-size: 13px;
  color: var(--stone);
  margin-left: 2px;
}

.saved-filter-remove:hover {
  color: var(--clay);
}

.save-filter-btn {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: 1px dashed var(--ink-10);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.save-filter-btn:hover {
  border-color: var(--clay);
  color: var(--clay);
}

.save-filter-input-row {
  display: flex;
  gap: var(--space-1);
}

.save-filter-input {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink);
  background: var(--chalk);
  width: 120px;
}

.save-filter-input:focus {
  outline: none;
  border-color: var(--clay);
}

.save-filter-confirm {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: none;
  background: var(--band);
  color: var(--on-band);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.save-filter-confirm:hover:not(:disabled) {
  background: var(--clay);
}

.save-filter-confirm:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

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

.results-count-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.results-count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
}

.export-csv-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: 0.03em;
}

.export-csv-btn:hover {
  color: var(--clay);
  border-color: var(--clay);
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
  background: var(--band);
  color: var(--on-band);
  border-color: var(--carbon);
}

.sort-sep {
  width: 1px;
  height: 16px;
  background: var(--ink-10);
  margin: 0 var(--space-1);
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  text-align: left;
  padding: var(--space-3) var(--space-2);
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
  border-bottom: 2px solid var(--ink-10);
  background: transparent;
  border-top: none;
  border-left: none;
  border-right: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.group-header:first-child {
  margin-top: 0;
}

.group-header:hover {
  border-bottom-color: var(--clay);
}

.group-toggle {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: var(--stone);
  width: 20px;
  text-align: center;
}

.group-label {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--carbon);
  text-transform: capitalize;
}

.group-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  margin-left: auto;
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

/* Compare bar */
.compare-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-above, 100);
  background: var(--band);
  border-top: 2px solid var(--clay);
  padding: var(--space-3) var(--space-6);
}

.compare-bar-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.compare-bar-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.compare-bar-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--on-band);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.compare-bar-names {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
}

.compare-bar-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.compare-bar-go {
  background: var(--clay);
  color: var(--on-band);
  border: none;
  border-radius: var(--radius-full);
  padding: var(--space-2) var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.compare-bar-go:hover:not(:disabled) {
  background: var(--clay-dark);
  transform: translateX(2px);
}

.compare-bar-go:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.compare-bar-clear {
  background: none;
  border: 1px solid var(--stone);
  border-radius: var(--radius-full);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.compare-bar-clear:hover {
  border-color: var(--on-band);
  color: var(--on-band);
}

/* Compare bar transition */
.compare-bar-enter-active,
.compare-bar-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.compare-bar-enter-from,
.compare-bar-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .desktop-sidebar {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: var(--z-drawer, 500);
    width: 280px;
    max-height: 100vh;
    box-shadow: 4px 0 20px rgba(196, 83, 42, 0.15);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    padding-top: calc(var(--nav-height) + var(--space-4));
  }
  .desktop-sidebar[data-open="true"] {
    transform: translateX(0);
  }
  .sidebar-toggle { display: flex; }
  .workshop-main { padding: var(--space-4); }
  .results-row { flex-direction: column; align-items: flex-start; }
  .sort-controls { flex-wrap: wrap; }
  .compare-bar { padding: var(--space-3); }
  .compare-bar-names { max-width: 200px; }
  .recipe-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3); }
}
</style>
