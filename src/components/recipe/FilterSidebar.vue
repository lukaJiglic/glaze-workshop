<script setup lang="ts">
import { computed } from 'vue'
import { useGlazeStore } from '@/stores/glaze'
import type { FilterState, ChemistryRangeFilter } from '@/types'
import type { FilterType } from '@/composables/useGlazeFilter'
import GlossaryTip from '@/components/ui/GlossaryTip.vue'
import InfoPanel from '@/components/ui/InfoPanel.vue'

const props = defineProps<{
  filters: FilterState
  activeCount: number
  facetCounts?: Record<FilterType, Map<string, number>>
}>()

const emit = defineEmits<{
  toggle: [type: FilterType, value: string]
  clearAll: []
  'update:chemistryRanges': [ranges: ChemistryRangeFilter]
}>()

function getCount(type: FilterType, value: string): number | null {
  if (!props.facetCounts) return null
  return props.facetCounts[type]?.get(value) ?? 0
}

function isDisabled(type: FilterType, value: string): boolean {
  if (!props.facetCounts) return false
  return (props.facetCounts[type]?.get(value) ?? 0) === 0
}

const glazeStore = useGlazeStore()

const coneOptions = computed(() => [
  { id: 'low-fire', label: 'Low fire (06–02)' },
  { id: 'mid-fire', label: 'Mid fire (5–7)' },
  { id: 'high-fire', label: 'High fire (8–10)' },
  { id: 'raku', label: 'Raku (010–06)' },
])

const atmosphereOptions = computed(() =>
  glazeStore.taxonomy?.taxonomies.atmospheres.slice(0, 6) ?? []
)

const colorOptions = computed(() => {
  const colors = new Set<string>()
  glazeStore.recipes.forEach(r => r.colourIds.forEach(c => colors.add(c)))
  return Array.from(colors).sort()
})

const surfaceOptions = computed(() => {
  const surfaces = new Set<string>()
  glazeStore.recipes.forEach(r => r.surfaceIds.forEach(s => surfaces.add(s)))
  return Array.from(surfaces).sort()
})

const styleOptions = computed(() =>
  glazeStore.taxonomy?.taxonomies.styles.slice(0, 14) ?? []
)

const familyOptions = computed(() =>
  glazeStore.families.slice(0, 8)
)

const tablewareOptions = [
  { id: 'functional', label: 'Functional', icon: '✓' },
  { id: 'test-only', label: 'Test only', icon: '⚠' },
  { id: 'decorative', label: 'Decorative', icon: '◦' },
]

const kilnOptions = [
  { id: 'electric-kiln', label: 'Electric' },
  { id: 'gas-kiln', label: 'Gas' },
  { id: 'wood-kiln', label: 'Wood' },
  { id: 'raku-kiln', label: 'Raku kiln' },
]

const techniqueOptions = computed(() => {
  const techniques = new Set<string>()
  glazeStore.recipes.forEach(r => r.techniqueIds.forEach(t => techniques.add(t)))
  return Array.from(techniques).sort()
})

const clayOptions = [
  { id: 'stoneware', label: 'Stoneware' },
  { id: 'white-stoneware', label: 'White stoneware' },
  { id: 'porcelain', label: 'Porcelain' },
  { id: 'red-earthenware', label: 'Red earthenware' },
  { id: 'white-earthenware', label: 'White earthenware' },
  { id: 'raku-clay', label: 'Raku body' },
  { id: 'grogged-sculpture', label: 'Grogged / sculpture' },
]

// Ingredient options — all unique materialIds across all recipes
const ingredientOptions = computed(() => {
  const matCounts = new Map<string, { id: string; label: string; count: number }>()
  glazeStore.recipes.forEach(r => {
    r.ingredients.forEach(ing => {
      const existing = matCounts.get(ing.materialId)
      if (existing) {
        existing.count++
      } else {
        matCounts.set(ing.materialId, {
          id: ing.materialId,
          label: ing.sourceLabel,
          count: 1,
        })
      }
    })
  })
  return Array.from(matCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
})

function emitChemRange(key: keyof ChemistryRangeFilter, rawValue: string) {
  const val = rawValue === '' ? null : parseFloat(rawValue)
  if (val !== null && isNaN(val)) return
  const updated = { ...props.filters.chemistryRanges, [key]: val }
  emit('update:chemistryRanges', updated)
}

function isActive(type: FilterType, value: string) {
  const map: Record<FilterType, string[]> = {
    cones: props.filters.selectedCones,
    atmospheres: props.filters.selectedAtmospheres,
    colors: props.filters.selectedColors,
    surfaces: props.filters.selectedSurfaces,
    families: props.filters.selectedFamilies,
    styles: props.filters.selectedStyles,
    tableware: props.filters.selectedTablewareStatuses,
    kilns: props.filters.selectedKilns,
    techniques: props.filters.selectedTechniques,
    clays: props.filters.selectedClays,
    ingredients: props.filters.selectedIngredients,
  }
  return map[type].includes(value)
}
</script>

<template>
  <aside class="filter-sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Filter</h2>
      <button v-if="activeCount > 0" class="clear-btn" @click="emit('clearAll')">
        Clear all ({{ activeCount }})
      </button>
    </div>

    <!-- Firing range -->
    <div class="filter-group">
      <h3 class="group-label">Firing Range</h3>
      <InfoPanel title="What are firing ranges?">
        <GlossaryTip term="firing range">Firing range</GlossaryTip> refers to the
        <GlossaryTip term="cone">cone</GlossaryTip> temperatures a glaze is designed for.
        <GlossaryTip term="low-fire">Low fire</GlossaryTip> gives bright colors,
        <GlossaryTip term="mid-fire">mid fire</GlossaryTip> balances strength and variety, and
        <GlossaryTip term="high-fire">high fire</GlossaryTip> produces the most durable ware.
      </InfoPanel>
      <div class="filter-options">
        <button
          v-for="opt in coneOptions"
          :key="opt.id"
          class="filter-option"
          :class="{ active: isActive('cones', opt.id), disabled: isDisabled('cones', opt.id) }"
          :disabled="isDisabled('cones', opt.id)"
          @click="emit('toggle', 'cones', opt.id)"
        >
          {{ opt.label }}
          <span v-if="getCount('cones', opt.id) !== null" class="facet-count">{{ getCount('cones', opt.id) }}</span>
        </button>
      </div>
    </div>

    <!-- Atmosphere -->
    <div class="filter-group">
      <h3 class="group-label">Atmosphere</h3>
      <InfoPanel title="What is atmosphere?">
        <GlossaryTip term="atmosphere">Atmosphere</GlossaryTip> is the air environment inside the
        <GlossaryTip term="kiln">kiln</GlossaryTip>.
        <GlossaryTip term="oxidation">Oxidation</GlossaryTip> (electric kilns) gives clean, predictable colors.
        <GlossaryTip term="reduction">Reduction</GlossaryTip> (gas kilns) starves oxygen for dramatic effects.
      </InfoPanel>
      <div class="filter-options">
        <button
          v-for="opt in atmosphereOptions"
          :key="opt.id"
          class="filter-option"
          :class="{ active: isActive('atmospheres', opt.id), disabled: isDisabled('atmospheres', opt.id) }"
          :disabled="isDisabled('atmospheres', opt.id)"
          @click="emit('toggle', 'atmospheres', opt.id)"
        >
          {{ opt.name }}
          <span v-if="getCount('atmospheres', opt.id) !== null" class="facet-count">{{ getCount('atmospheres', opt.id) }}</span>
        </button>
      </div>
    </div>

    <!-- Kiln type -->
    <div class="filter-group">
      <h3 class="group-label">Kiln</h3>
      <InfoPanel title="What kiln types are there?">
        The <GlossaryTip term="kiln">kiln</GlossaryTip> type determines what temperatures and
        <GlossaryTip term="atmosphere">atmospheres</GlossaryTip> you can achieve.
        Electric kilns fire in <GlossaryTip term="oxidation">oxidation</GlossaryTip>,
        gas kilns can do <GlossaryTip term="reduction">reduction</GlossaryTip>,
        and wood kilns add natural ash effects.
      </InfoPanel>
      <div class="filter-options">
        <button
          v-for="opt in kilnOptions"
          :key="opt.id"
          class="filter-option"
          :class="{ active: isActive('kilns', opt.id), disabled: isDisabled('kilns', opt.id) }"
          :disabled="isDisabled('kilns', opt.id)"
          @click="emit('toggle', 'kilns', opt.id)"
        >
          {{ opt.label }}
          <span v-if="getCount('kilns', opt.id) !== null" class="facet-count">{{ getCount('kilns', opt.id) }}</span>
        </button>
      </div>
    </div>

    <!-- Clay body -->
    <div class="filter-group">
      <h3 class="group-label">Clay Body</h3>
      <InfoPanel title="Why does clay body matter?">
        The clay body affects glaze fit, color response, and durability.
        <GlossaryTip term="stoneware">Stoneware</GlossaryTip> and
        <GlossaryTip term="porcelain">porcelain</GlossaryTip> are mid-to-high-fire bodies.
        <GlossaryTip term="earthenware">Earthenware</GlossaryTip> is low-fire and stays porous unless glazed.
      </InfoPanel>
      <div class="filter-options">
        <button
          v-for="opt in clayOptions"
          :key="opt.id"
          class="filter-option"
          :class="{ active: isActive('clays', opt.id), disabled: isDisabled('clays', opt.id) }"
          :disabled="isDisabled('clays', opt.id)"
          @click="emit('toggle', 'clays', opt.id)"
        >
          {{ opt.label }}
          <span v-if="getCount('clays', opt.id) !== null" class="facet-count">{{ getCount('clays', opt.id) }}</span>
        </button>
      </div>
    </div>

    <!-- Technique -->
    <div class="filter-group" v-if="techniqueOptions.length">
      <h3 class="group-label">Technique</h3>
      <InfoPanel title="About techniques">
        Technique describes the glazing method or tradition a recipe belongs to —
        <GlossaryTip term="ash">ash glazing</GlossaryTip>,
        <GlossaryTip term="raku">raku</GlossaryTip> reduction,
        <GlossaryTip term="crystalline">crystalline</GlossaryTip> growth, and others.
      </InfoPanel>
      <div class="filter-options color-grid">
        <button
          v-for="tech in techniqueOptions"
          :key="tech"
          class="filter-option"
          :class="{ active: isActive('techniques', tech), disabled: isDisabled('techniques', tech) }"
          :disabled="isDisabled('techniques', tech)"
          @click="emit('toggle', 'techniques', tech)"
        >
          {{ tech.replace(/-/g, ' ') }}
          <span v-if="getCount('techniques', tech) !== null" class="facet-count">{{ getCount('techniques', tech) }}</span>
        </button>
      </div>
    </div>

    <!-- Ingredients -->
    <div class="filter-group" v-if="ingredientOptions.length">
      <h3 class="group-label">Ingredients</h3>
      <InfoPanel title="Filter by ingredient">
        Select materials to find all recipes that contain them. When multiple are selected,
        only recipes with <em>all</em> selected ingredients are shown.
      </InfoPanel>
      <div class="filter-options color-grid">
        <button
          v-for="opt in ingredientOptions"
          :key="opt.id"
          class="filter-option ingredient-option"
          :class="{ active: isActive('ingredients', opt.id), disabled: isDisabled('ingredients', opt.id) }"
          :disabled="isDisabled('ingredients', opt.id)"
          @click="emit('toggle', 'ingredients', opt.id)"
        >
          {{ opt.label }}
          <span v-if="getCount('ingredients', opt.id) !== null" class="facet-count">{{ getCount('ingredients', opt.id) }}</span>
        </button>
      </div>
    </div>

    <!-- Color -->
    <div class="filter-group">
      <h3 class="group-label">Color</h3>
      <InfoPanel title="About colors">
        Glaze color depends on metal oxides and the
        <GlossaryTip term="firing range">firing range</GlossaryTip>. The same
        <GlossaryTip term="recipe">recipe</GlossaryTip> can look different in
        <GlossaryTip term="oxidation">oxidation</GlossaryTip> vs.
        <GlossaryTip term="reduction">reduction</GlossaryTip>.
        Colors marked here reflect the typical result.
      </InfoPanel>
      <div class="filter-options color-grid">
        <button
          v-for="color in colorOptions.slice(0, 16)"
          :key="color"
          class="filter-option"
          :class="{ active: isActive('colors', color), disabled: isDisabled('colors', color) }"
          :disabled="isDisabled('colors', color)"
          @click="emit('toggle', 'colors', color)"
        >
          {{ color }}
          <span v-if="getCount('colors', color) !== null" class="facet-count">{{ getCount('colors', color) }}</span>
        </button>
      </div>
    </div>

    <!-- Surface -->
    <div class="filter-group">
      <h3 class="group-label">Surface</h3>
      <InfoPanel title="About surface types">
        Surface describes the fired texture:
        <GlossaryTip term="glossy">glossy</GlossaryTip> is shiny and smooth,
        <GlossaryTip term="satin">satin</GlossaryTip> has a soft sheen, and
        <GlossaryTip term="matte">matte</GlossaryTip> is velvety with no reflection.
      </InfoPanel>
      <div class="filter-options">
        <button
          v-for="surface in surfaceOptions.slice(0, 12)"
          :key="surface"
          class="filter-option"
          :class="{ active: isActive('surfaces', surface), disabled: isDisabled('surfaces', surface) }"
          :disabled="isDisabled('surfaces', surface)"
          @click="emit('toggle', 'surfaces', surface)"
        >
          {{ surface }}
          <span v-if="getCount('surfaces', surface) !== null" class="facet-count">{{ getCount('surfaces', surface) }}</span>
        </button>
      </div>
    </div>

    <!-- Style -->
    <div class="filter-group" v-if="styleOptions.length">
      <h3 class="group-label">Style</h3>
      <InfoPanel title="About glaze styles">
        Style describes the glaze's visual character — whether it's a classic
        <GlossaryTip term="celadon">celadon</GlossaryTip>, a dramatic
        <GlossaryTip term="tenmoku">tenmoku</GlossaryTip>, a crystalline,
        or a simple clear. Often overlaps with color and surface.
      </InfoPanel>
      <div class="filter-options color-grid">
        <button
          v-for="style in styleOptions"
          :key="style.id"
          class="filter-option"
          :class="{ active: isActive('styles', style.id), disabled: isDisabled('styles', style.id) }"
          :disabled="isDisabled('styles', style.id)"
          @click="emit('toggle', 'styles', style.id)"
        >
          {{ style.name }}
          <span v-if="getCount('styles', style.id) !== null" class="facet-count">{{ getCount('styles', style.id) }}</span>
        </button>
      </div>
    </div>

    <!-- Glaze family -->
    <div class="filter-group" v-if="familyOptions.length">
      <h3 class="group-label">Glaze Family</h3>
      <InfoPanel title="What are glaze families?">
        Glaze families group recipes by shared character — shinos, celadons, tenmokus, ash glazes.
        Each family has typical firing conditions, clay bodies, and surface qualities.
      </InfoPanel>
      <div class="filter-options">
        <button
          v-for="family in familyOptions"
          :key="family.id"
          class="filter-option"
          :class="{ active: isActive('families', family.id), disabled: isDisabled('families', family.id) }"
          :disabled="isDisabled('families', family.id)"
          @click="emit('toggle', 'families', family.id)"
        >
          {{ family.name }}
          <span v-if="getCount('families', family.id) !== null" class="facet-count">{{ getCount('families', family.id) }}</span>
        </button>
      </div>
    </div>

    <!-- Chemistry ranges -->
    <div class="filter-group" v-if="props.filters.chemistryRanges">
      <h3 class="group-label">Chemistry Range</h3>
      <InfoPanel title="Filter by chemistry">
        Filter recipes by their UMF chemistry values. Set min/max bounds on key metrics
        to narrow down to recipes with specific chemical profiles.
      </InfoPanel>
      <div class="chem-range-fields">
        <div class="chem-range-row">
          <span class="chem-range-label">Si:Al</span>
          <input
            type="number"
            class="chem-range-input"
            placeholder="min"
            step="0.5"
            :value="props.filters.chemistryRanges.siAlMin"
            @input="emitChemRange('siAlMin', ($event.target as HTMLInputElement).value)"
          />
          <span class="chem-range-sep">–</span>
          <input
            type="number"
            class="chem-range-input"
            placeholder="max"
            step="0.5"
            :value="props.filters.chemistryRanges.siAlMax"
            @input="emitChemRange('siAlMax', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="chem-range-row">
          <span class="chem-range-label">Expansion</span>
          <input
            type="number"
            class="chem-range-input"
            placeholder="min"
            step="1"
            :value="props.filters.chemistryRanges.expansionMin"
            @input="emitChemRange('expansionMin', ($event.target as HTMLInputElement).value)"
          />
          <span class="chem-range-sep">–</span>
          <input
            type="number"
            class="chem-range-input"
            placeholder="max"
            step="1"
            :value="props.filters.chemistryRanges.expansionMax"
            @input="emitChemRange('expansionMax', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="chem-range-row">
          <span class="chem-range-label">KNaO</span>
          <input
            type="number"
            class="chem-range-input"
            placeholder="min"
            step="0.05"
            :value="props.filters.chemistryRanges.knaOMin"
            @input="emitChemRange('knaOMin', ($event.target as HTMLInputElement).value)"
          />
          <span class="chem-range-sep">–</span>
          <input
            type="number"
            class="chem-range-input"
            placeholder="max"
            step="0.05"
            :value="props.filters.chemistryRanges.knaOMax"
            @input="emitChemRange('knaOMax', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <!-- Tableware status -->
    <div class="filter-group">
      <h3 class="group-label">Tableware Use</h3>
      <InfoPanel title="What does tableware status mean?">
        Functional glazes have been tested for food safety. Test-only glazes need leach testing before use on food surfaces.
        Decorative glazes are for non-functional work only.
      </InfoPanel>
      <div class="filter-options tableware-grid">
        <button
          v-for="opt in tablewareOptions"
          :key="opt.id"
          class="filter-option tableware-option"
          :class="{ active: isActive('tableware', opt.id), [opt.id]: true, disabled: isDisabled('tableware', opt.id) }"
          :disabled="isDisabled('tableware', opt.id)"
          @click="emit('toggle', 'tableware', opt.id)"
        >
          <span class="tableware-icon">{{ opt.icon }}</span>
          {{ opt.label }}
          <span v-if="getCount('tableware', opt.id) !== null" class="facet-count">{{ getCount('tableware', opt.id) }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.filter-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-6) var(--space-4);
  border-right: 1px solid var(--ink-10);
  background: var(--chalk);
  min-height: 100%;
  position: sticky;
  top: var(--nav-height);
  max-height: calc(100vh - var(--nav-height));
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--carbon);
}

.clear-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--clay);
  cursor: pointer;
  background: none;
  border: none;
  letter-spacing: 0.04em;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.clear-btn:hover {
  background: var(--clay-10);
}

.filter-group { display: flex; flex-direction: column; gap: var(--space-2); }

.group-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone);
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  gap: var(--space-1);
}

.tableware-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.filter-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone-dark);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-transform: capitalize;
}

.color-grid .filter-option,
.tableware-grid .filter-option {
  width: auto;
  flex: none;
}

.tableware-option {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.tableware-icon {
  font-size: 12px;
  line-height: 1;
}

.filter-option:hover:not(:disabled) {
  background: var(--parchment);
  color: var(--ink);
}

.filter-option.disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

.facet-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  margin-left: auto;
  padding-left: var(--space-2);
  opacity: 0.7;
}

.filter-option.active .facet-count {
  color: var(--clay-dark);
  opacity: 0.8;
}

.ingredient-option {
  font-size: var(--text-xs);
}

.color-grid .facet-count,
.tableware-grid .facet-count {
  margin-left: var(--space-1);
  padding-left: 0;
}

.filter-option.active {
  background: var(--clay-10);
  border-color: var(--clay-30);
  color: var(--clay-dark);
  font-weight: 500;
}

/* Tableware status-specific active colors */
.tableware-option.functional.active {
  background: var(--sage-15);
  border-color: var(--sage-40);
  color: var(--sage-dark);
}

.tableware-option.test-only.active {
  background: var(--clay-10);
  border-color: var(--clay-30);
  color: var(--clay-dark);
}

.tableware-option.decorative.active {
  background: var(--stone-12);
  border-color: var(--stone-30);
  color: var(--stone-dark);
}

/* Chemistry range filter */
.chem-range-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chem-range-row {
  display: grid;
  grid-template-columns: 72px 1fr 12px 1fr;
  gap: var(--space-1);
  align-items: center;
}

.chem-range-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  font-weight: 600;
}

.chem-range-input {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  background: var(--chalk);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink);
  outline: none;
  transition: border-color var(--transition-fast);
  -moz-appearance: textfield;
}

.chem-range-input::-webkit-inner-spin-button,
.chem-range-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.chem-range-input:focus {
  border-color: var(--clay);
}

.chem-range-input::placeholder {
  color: var(--stone);
  opacity: 0.5;
}

.chem-range-sep {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  text-align: center;
}
</style>
