<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkshopStore } from '@/stores/workshop'
import { useGlazeStore } from '@/stores/glaze'
import TagBadge from '@/components/ui/TagBadge.vue'
import type { CustomRecipe } from '@/types'

const router = useRouter()
const store = useWorkshopStore()
const glazeStore = useGlazeStore()

const hasRecipes = computed(() => store.customRecipes.length > 0)
const recipeCount = computed(() => store.customRecipes.length)

// Tag filter
const selectedTag = ref<string | null>(null)

const allTags = computed(() => {
  const tags = new Set<string>()
  for (const r of store.customRecipes) {
    for (const t of (r.tags ?? [])) tags.add(t)
  }
  return Array.from(tags).sort()
})

function toggleTagFilter(tag: string) {
  selectedTag.value = selectedTag.value === tag ? null : tag
}

// Sort by most recently updated, then filter by selected tag
const sortedRecipes = computed(() => {
  const sorted = [...store.customRecipes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  if (!selectedTag.value) return sorted
  return sorted.filter(r => r.tags?.includes(selectedTag.value!))
})

// Delete confirmation
const pendingDeleteId = ref<string | null>(null)

function confirmDelete(id: string) {
  pendingDeleteId.value = id
}

function cancelDelete() {
  pendingDeleteId.value = null
}

function executeDelete() {
  if (pendingDeleteId.value) {
    store.deleteCustomRecipe(pendingDeleteId.value)
    pendingDeleteId.value = null
  }
}

// Duplication modal
const pendingDupRecipe = ref<CustomRecipe | null>(null)
const dupName = ref('')
const dupCone = ref('')

function openDuplicateModal(recipe: CustomRecipe) {
  pendingDupRecipe.value = recipe
  dupName.value = `${recipe.name} — Copy`
  dupCone.value = recipe.cone
}

function cancelDuplicate() {
  pendingDupRecipe.value = null
}

function executeDuplicate() {
  if (!pendingDupRecipe.value) return
  const copy = store.duplicateCustomRecipe(pendingDupRecipe.value, dupName.value.trim() || undefined, dupCone.value.trim() || undefined)
  pendingDupRecipe.value = null
  router.push(`/my-recipes/${copy.id}`)
}

function openInCalculator(custom: CustomRecipe) {
  const recipe = store.customToRecipe(custom)
  store.loadRecipeIntoCalculator(recipe)
  router.push('/calculator')
}

function createFromScratch() {
  const now = new Date().toISOString()
  const newRecipe: CustomRecipe = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Untitled Recipe',
    firingRangeId: '',
    cone: '6',
    atmosphereIds: [],
    surfaceIds: [],
    colourIds: [],
    ingredients: [],
    notes: [],
    createdAt: now,
    updatedAt: now,
  }
  store.saveCustomRecipe(newRecipe)
  router.push(`/my-recipes/${newRecipe.id}`)
}

function exportRecipe(id: string) {
  const json = store.exportRecipeJSON(id)
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const recipe = store.customRecipes.find(r => r.id === id)
  a.href = url
  a.download = `${(recipe?.name ?? 'recipe').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importFileRef = ref<HTMLInputElement | null>(null)

function triggerImport() {
  importFileRef.value?.click()
}

const importError = ref<string | null>(null)

function handleImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importError.value = null
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const result = store.importRecipeJSON(reader.result as string)
      if (result) {
        router.push(`/my-recipes/${result.id}`)
      } else {
        importError.value = 'Invalid recipe file — missing name or ingredients.'
      }
    } catch {
      importError.value = 'Could not parse file — expected valid JSON.'
    }
  }
  reader.onerror = () => {
    importError.value = 'Failed to read file.'
  }
  reader.readAsText(file)
  // Reset input so same file can be imported again
  if (importFileRef.value) importFileRef.value.value = ''
}

function getSwatchColor(recipe: CustomRecipe): string {
  if (recipe.swatchColor) return recipe.swatchColor
  // Try to derive from colour profile
  const profileId = glazeStore.profileForRecipe.get(recipe.id)
  if (profileId) {
    const profile = glazeStore.colorProfileById.get(profileId)
    if (profile?.swatchHex) return profile.swatchHex
  }
  return '#ede6d6'
}

function firingLabel(id: string): string {
  if (!id) return ''
  return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="my-recipes-view">
    <!-- Header -->
    <div class="my-recipes-header">
      <div class="my-recipes-header-inner">
        <h1 class="page-title">My Recipes</h1>
        <p class="page-sub">
          {{ recipeCount }} custom recipe{{ recipeCount !== 1 ? 's' : '' }}
        </p>
        <button class="import-btn" @click="triggerImport">Import Recipe JSON</button>
        <input
          ref="importFileRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImportFile"
        />
        <p v-if="importError" class="import-error">{{ importError }}</p>
      </div>
    </div>

    <!-- Content -->
    <div class="my-recipes-content">
      <!-- Empty state -->
      <div v-if="!hasRecipes" class="empty-state">
        <div class="empty-illustration">
          <svg class="empty-icon-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="56" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.3" />
            <path d="M40 75 Q60 45 80 75" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5" />
            <circle cx="60" cy="52" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.4" />
            <line x1="60" y1="44" x2="60" y2="36" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
          </svg>
        </div>

        <h2 class="empty-title">Your recipe book is empty</h2>
        <p class="empty-description">
          Start building your personal collection of glaze recipes.
          There are two ways to get started:
        </p>

        <div class="empty-steps">
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-text">
              <strong>Adapt an existing recipe</strong>
              <p>
                Go to the <RouterLink to="/workshop" class="inline-link">Workshop</RouterLink>,
                open any recipe, and click
                <span class="code-tag">Make My Version</span>
                to create an editable copy.
              </p>
            </div>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <div class="step-text">
              <strong>Start from a blank slate</strong>
              <p>Create a brand-new recipe with your own ingredients and notes.</p>
            </div>
          </div>
        </div>

        <button class="btn-create" @click="createFromScratch">
          Create from Scratch
        </button>
      </div>

      <!-- Tag filter + Recipe grid -->
      <template v-else>
        <div v-if="allTags.length > 0" class="tag-filter-bar">
          <span class="tag-filter-label">Filter by tag:</span>
          <button
            v-for="tag in allTags"
            :key="tag"
            class="tag-filter-chip"
            :class="{ active: selectedTag === tag }"
            @click="toggleTagFilter(tag)"
          >{{ tag }}</button>
          <button
            v-if="selectedTag"
            class="tag-filter-clear"
            @click="selectedTag = null"
          >Clear ×</button>
        </div>

        <!-- Recipe grid -->
        <div class="recipe-grid">
        <div
          v-for="recipe in sortedRecipes"
          :key="recipe.id"
          v-reveal
          class="recipe-card"
        >
          <!-- Swatch strip -->
          <div class="card-swatch" :style="{ background: getSwatchColor(recipe) }">
            <div class="card-swatch-sheen" />
          </div>

          <div class="card-body">
            <div class="card-header">
              <h3 class="card-name">{{ recipe.name }}</h3>
              <button
                class="card-fav-btn"
                :class="{ active: store.isFavorite(recipe.id) }"
                @click.stop="store.toggleFavorite(recipe.id)"
                :aria-label="store.isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'"
              >{{ store.isFavorite(recipe.id) ? '♥' : '♡' }}</button>
            </div>

            <!-- Tags row -->
            <div class="card-tags">
              <TagBadge :label="'Cone ' + (recipe.cone || '?')" variant="cone" />
              <TagBadge
                v-for="atm in recipe.atmosphereIds"
                :key="atm"
                :label="atm"
                variant="atmosphere"
              />
              <TagBadge
                v-for="s in recipe.surfaceIds.slice(0, 2)"
                :key="s"
                :label="s.replace(/-/g, ' ')"
                variant="default"
              />
              <span
                v-if="recipe.tablewareStatus"
                class="tw-badge"
                :class="recipe.tablewareStatus"
              >{{ recipe.tablewareStatus.replace(/-/g, ' ') }}</span>
            </div>

            <div class="card-meta">
              <span class="meta-item">
                <span class="meta-label">Ingredients</span>
                <span class="meta-value">{{ recipe.ingredients.length }}</span>
              </span>
              <span class="meta-divider"></span>
              <span class="meta-item" v-if="recipe.firingRangeId">
                <span class="meta-label">Firing</span>
                <span class="meta-value">{{ firingLabel(recipe.firingRangeId) }}</span>
              </span>
              <span class="meta-divider" v-if="recipe.firingRangeId"></span>
              <span class="meta-item">
                <span class="meta-label">Updated</span>
                <span class="meta-value">{{ formatDate(recipe.updatedAt) }}</span>
              </span>
            </div>

            <!-- Colour pills -->
            <div v-if="recipe.colourIds.length" class="card-colours">
              <span
                v-for="c in recipe.colourIds.slice(0, 3)"
                :key="c"
                class="colour-pill"
              >{{ c.replace(/-/g, ' ') }}</span>
              <span v-if="recipe.colourIds.length > 3" class="colour-pill colour-more">+{{ recipe.colourIds.length - 3 }}</span>
            </div>

            <!-- User tags -->
            <div v-if="recipe.tags?.length" class="card-user-tags">
              <span
                v-for="tag in recipe.tags"
                :key="tag"
                class="card-user-tag"
                :class="{ 'tag-active-filter': selectedTag === tag }"
                @click="toggleTagFilter(tag)"
              >{{ tag }}</span>
            </div>

            <div class="card-actions">
              <RouterLink
                :to="`/my-recipes/${recipe.id}`"
                class="card-btn card-btn-edit"
              >
                Edit
              </RouterLink>
              <button
                class="card-btn card-btn-calc"
                @click="openInCalculator(recipe)"
              >
                Calculator
              </button>
              <button
                class="card-btn card-btn-dup"
                @click="openDuplicateModal(recipe)"
                title="Duplicate recipe"
              >
                Duplicate
              </button>
              <button
                class="card-btn card-btn-export"
                @click="exportRecipe(recipe.id)"
              >
                Export
              </button>
              <button
                class="card-btn card-btn-delete"
                @click="confirmDelete(recipe.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        </div>
      </template>
    </div>

    <!-- Floating add button -->
    <button
      v-if="hasRecipes"
      class="fab"
      title="Create new recipe"
      @click="createFromScratch"
    >
      <span class="fab-icon">+</span>
    </button>

    <!-- Delete confirmation overlay -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="pendingDeleteId" class="confirm-overlay" @click.self="cancelDelete">
          <div class="confirm-dialog">
            <h3 class="confirm-title">Delete this recipe?</h3>
            <p class="confirm-text">
              This action cannot be undone. The recipe will be permanently removed
              from your collection.
            </p>
            <div class="confirm-actions">
              <button class="confirm-btn confirm-cancel" @click="cancelDelete">
                Cancel
              </button>
              <button class="confirm-btn confirm-delete" @click="executeDelete">
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Duplicate modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="pendingDupRecipe" class="confirm-overlay" @click.self="cancelDuplicate">
          <div class="confirm-dialog dup-dialog">
            <h3 class="confirm-title">Duplicate Recipe</h3>
            <p class="confirm-text">Customise the copy before creating it.</p>
            <div class="dup-fields">
              <label class="dup-label">Recipe Name</label>
              <input
                v-model="dupName"
                class="dup-input"
                type="text"
                placeholder="New recipe name…"
                @keydown.enter="executeDuplicate"
              />
              <label class="dup-label">Cone</label>
              <input
                v-model="dupCone"
                class="dup-input dup-input-sm"
                type="text"
                placeholder='e.g. "6" or "9-10"'
                @keydown.enter="executeDuplicate"
              />
            </div>
            <div class="confirm-actions">
              <button class="confirm-btn confirm-cancel" @click="cancelDuplicate">Cancel</button>
              <button class="confirm-btn confirm-create" @click="executeDuplicate">Create Copy</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.my-recipes-view {
  min-height: 100vh;
  background: var(--cream);
}

/* ---- Header ---- */
.my-recipes-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-8)) var(--space-8) var(--space-8);
}

.my-recipes-header-inner {
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
  color: var(--on-band);
}

.page-sub {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone-light);
  letter-spacing: 0.04em;
}

.import-btn {
  align-self: flex-start;
  margin-top: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--ink-20);
  border-radius: var(--radius-md);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.import-btn:hover {
  border-color: var(--on-band);
  color: var(--on-band);
}

.import-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--danger);
  margin-top: var(--space-2);
}

/* ---- Content area ---- */
.my-recipes-content {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-8);
}

/* ---- Empty state ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-16) var(--space-4);
  max-width: 560px;
  margin: 0 auto;
}

.empty-illustration {
  margin-bottom: var(--space-6);
  color: var(--stone);
}

.empty-icon-svg {
  width: 120px;
  height: 120px;
}

.empty-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--ink);
  margin-bottom: var(--space-3);
}

.empty-description {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  line-height: 1.7;
  margin-bottom: var(--space-8);
}

.empty-steps {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin-bottom: var(--space-8);
  text-align: left;
}

.step {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  background: var(--parchment);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ink-10);
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--band);
  color: var(--on-band);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  border-radius: var(--radius-full);
}

.step-text strong {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--ink);
  display: block;
  margin-bottom: var(--space-1);
}

.step-text p {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.6;
  margin: 0;
}

.inline-link {
  color: var(--clay);
  text-decoration: underline;
  text-underline-offset: 2px;
  font-weight: 600;
  transition: color var(--transition-fast);
}

.inline-link:hover {
  color: var(--carbon);
}

.code-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--chalk);
  color: var(--clay);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--ink-10);
  white-space: nowrap;
}

.btn-create {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.04em;
  background: var(--band);
  color: var(--on-band);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.btn-create:hover {
  background: var(--clay);
  transform: translateY(-1px);
}

/* ---- Tag filter bar ---- */
.tag-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  padding: var(--space-3) var(--space-4);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
}

.tag-filter-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
  margin-right: var(--space-1);
}

.tag-filter-chip {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--ink-10);
  background: transparent;
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-filter-chip:hover {
  border-color: var(--clay);
  color: var(--clay);
}

.tag-filter-chip.active {
  background: var(--band);
  border-color: var(--carbon);
  color: var(--on-band);
}

.tag-filter-clear {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--ink-10);
  background: transparent;
  color: var(--stone);
  cursor: pointer;
  margin-left: var(--space-1);
  transition: all var(--transition-fast);
}

.tag-filter-clear:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* ---- Recipe grid ---- */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}

/* ---- Card ---- */
.recipe-card {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition:
    box-shadow var(--transition-fast),
    transform var(--transition-fast),
    border-color var(--transition-fast);
}

.recipe-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--clay-10);
}

.card-swatch {
  height: 48px;
  position: relative;
}

.card-swatch-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
}

.card-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.card-name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--ink);
  line-height: 1.3;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-fav-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--stone);
  transition: color var(--transition-fast), transform var(--transition-fast);
  flex-shrink: 0;
}

.card-fav-btn:hover,
.card-fav-btn.active {
  color: var(--clay);
  transform: scale(1.15);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.tw-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--ink-05);
  color: var(--stone);
}

.tw-badge.functional {
  background: var(--sage-15);
  color: var(--sage-dark);
}

.tw-badge.test-only {
  background: var(--clay-10);
  color: var(--clay);
}

.card-colours {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.colour-pill {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: capitalize;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--parchment);
  color: var(--stone);
  border: 1px solid var(--ink-05);
}

.colour-more {
  color: var(--clay);
  border-color: var(--clay-10);
}

/* ---- User tags on cards ---- */
.card-user-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.card-user-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--band);
  color: var(--on-band);
  cursor: pointer;
  transition: opacity var(--transition-fast), background var(--transition-fast);
  letter-spacing: 0.02em;
}

.card-user-tag:hover {
  opacity: 0.8;
}

.card-user-tag.tag-active-filter {
  background: var(--clay);
  color: white;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone);
}

.meta-value {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  font-weight: 600;
}

.meta-divider {
  width: 1px;
  height: 28px;
  background: var(--ink-10);
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--ink-10);
}

.card-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  border: 1px solid transparent;
}

.card-btn-edit {
  background: var(--band);
  color: var(--on-band);
}

.card-btn-edit:hover {
  background: var(--clay);
}

.card-btn-calc {
  background: transparent;
  color: var(--ink);
  border-color: var(--ink-10);
}

.card-btn-calc:hover {
  border-color: var(--clay);
  color: var(--clay);
}

.card-btn-export {
  background: transparent;
  color: var(--stone);
  border-color: var(--ink-10);
}

.card-btn-export:hover {
  border-color: var(--sage);
  color: var(--sage-dark);
}

.card-btn-dup {
  background: transparent;
  color: var(--stone);
}

.card-btn-dup:hover {
  color: var(--ink);
  background: var(--ink-05);
}

.card-btn-delete {
  background: transparent;
  color: var(--stone);
  margin-left: auto;
}

.card-btn-delete:hover {
  color: var(--danger);
  background: var(--danger-light);
}

/* ---- Floating action button ---- */
.fab {
  position: fixed;
  bottom: var(--space-8);
  right: var(--space-8);
  z-index: var(--z-above);
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--band);
  color: var(--on-band);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.fab:hover {
  background: var(--clay);
  transform: translateY(-2px) scale(1.05);
  box-shadow: var(--shadow-xl, var(--shadow-lg));
}

.fab-icon {
  font-size: 1.75rem;
  font-weight: 300;
  line-height: 1;
}

/* ---- Delete confirmation modal ---- */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--ink-40, rgba(44, 36, 32, 0.45));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.confirm-dialog {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  max-width: 400px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.confirm-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--ink);
  margin-bottom: var(--space-3);
}

.confirm-text {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.6;
  margin-bottom: var(--space-6);
}

.confirm-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.confirm-btn {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.confirm-cancel {
  background: transparent;
  color: var(--stone);
  border: 1px solid var(--ink-10);
}

.confirm-cancel:hover {
  color: var(--ink);
  border-color: var(--ink);
}

.confirm-delete {
  background: var(--danger);
  color: #fff;
  border: none;
}

.confirm-delete:hover {
  background: var(--danger-dark);
}

.confirm-create {
  background: var(--clay);
  color: #fff;
  border: none;
}

.confirm-create:hover {
  background: var(--clay-dark);
}

/* Duplicate modal extras */
.dup-dialog {
  max-width: 440px;
}

.dup-fields {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  margin-bottom: var(--space-6);
}

.dup-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
  white-space: nowrap;
}

.dup-input {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--parchment);
  border: 1px solid var(--ink-20);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  outline: none;
  width: 100%;
}

.dup-input:focus {
  border-color: var(--clay);
}

.dup-input-sm {
  max-width: 120px;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .confirm-dialog,
.modal-leave-active .confirm-dialog {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .confirm-dialog {
  transform: translateY(12px) scale(0.96);
  opacity: 0;
}

.modal-leave-to .confirm-dialog {
  transform: translateY(8px) scale(0.97);
  opacity: 0;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .my-recipes-content {
    padding: var(--space-5) var(--space-4);
  }

  .recipe-grid {
    grid-template-columns: 1fr;
  }

  .fab {
    bottom: var(--space-6);
    right: var(--space-6);
  }

  .empty-state {
    padding: var(--space-8) var(--space-2);
  }
}
</style>
