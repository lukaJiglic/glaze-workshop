<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'
import { useGlazeStore } from '@/stores/glaze'
import { useRouter } from 'vue-router'
import TagBadge from '@/components/ui/TagBadge.vue'
import IngredientSwitcher from '@/components/recipe/IngredientSwitcher.vue'
import { substitutions, changeImpacts, materialInfo, colorantHeuristics } from '@/data/materials-knowledge'
import { cautions } from '@/data/cautions'
import { sources } from '@/data/sources'
import { findCombinationHints } from '@/data/colorant-combinations'
import type { SubstitutionOption } from '@/data/materials-knowledge'
import type { Recipe } from '@/types'
import { useGlazeChemistry } from '@/composables/useGlazeChemistry'
import ChemistryPanel from '@/components/recipe/ChemistryPanel.vue'
import { explainRecipe } from '@/composables/useRecipeExplainer'
import RecipeSimilarList from '@/components/recipe/RecipeSimilarList.vue'
import ColourGuidePanel from '@/components/recipe/ColourGuidePanel.vue'
import FiringProgramPanel from '@/components/recipe/FiringProgramPanel.vue'
import BodyResponsePanel from '@/components/recipe/BodyResponsePanel.vue'
import { findApplicationNote } from '@/data/application-notes'

const workshopStore = useWorkshopStore()
const glazeStore = useGlazeStore()
const router = useRouter()

const recipe = computed(() => workshopStore.activeRecipe)

// Lazy-load expansion data when a recipe is opened
watch(recipe, (r) => {
  if (r) glazeStore.loadExpansionPanelData()
}, { immediate: true })

const profileId = computed(() => recipe.value ? glazeStore.profileForRecipe.get(recipe.value.id) : null)
const profile = computed(() => profileId.value ? glazeStore.colorProfileById.get(profileId.value) : null)
const swatchHex = computed(() => profile.value?.swatchHex ?? '#ede6d6')

const scores = computed(() => {
  if (!recipe.value) return null
  return glazeStore.getScores(recipe.value.id, recipe.value.firingRangeId)
})

const recipeOverride = computed(() => {
  if (!recipe.value || !glazeStore.visualMetadata) return null
  return glazeStore.visualMetadata.recipeOverrides.find(r => r.recipeId === recipe.value!.id) ?? null
})

const percentageSum = computed(() => {
  return recipe.value?.ingredients.reduce((s, i) => s + i.amount, 0) ?? 0
})

// Ingredient expand state
const expandedInfo = ref<Set<string>>(new Set())
const switcherOpen = ref<string | null>(null)
const swapConfirm = ref<{ fromLabel: string; toLabel: string; note: string } | null>(null)
const newNote = ref('')

// ─── Collapsible sections (mobile) ─────────────────────────────────────────
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 768)
let resizeHandler: (() => void) | null = null
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && workshopStore.activeRecipe) {
    workshopStore.closeDrawer()
  }
}
onMounted(() => {
  resizeHandler = () => { isMobile.value = window.innerWidth <= 768 }
  window.addEventListener('resize', resizeHandler)
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  window.removeEventListener('keydown', handleKeydown)
})

const collapsedSections = ref<Set<string>>(new Set(['chemistry', 'similar', 'crossRange', 'notes', 'cautions', 'twins', 'colourGuide', 'firing', 'bodyResponse']))
function toggleSection(key: string) {
  if (collapsedSections.value.has(key)) {
    collapsedSections.value.delete(key)
  } else {
    collapsedSections.value.add(key)
  }
  collapsedSections.value = new Set(collapsedSections.value)
}
function isSectionOpen(key: string) {
  if (!isMobile.value) return true
  return !collapsedSections.value.has(key)
}

function submitNote() {
  if (!newNote.value.trim() || !recipe.value) return
  workshopStore.addUserNote(recipe.value.id, newNote.value.trim())
  newNote.value = ''
}

function toggleInfo(materialId: string) {
  if (expandedInfo.value.has(materialId)) {
    expandedInfo.value.delete(materialId)
  } else {
    expandedInfo.value.add(materialId)
    switcherOpen.value = null
  }
  expandedInfo.value = new Set(expandedInfo.value)
}

function toggleSwitcher(materialId: string) {
  switcherOpen.value = switcherOpen.value === materialId ? null : materialId
  if (switcherOpen.value) {
    expandedInfo.value.delete(materialId)
    expandedInfo.value = new Set(expandedInfo.value)
  }
}

function closeSwitcher() {
  switcherOpen.value = null
}

function hasSubstitutes(materialId: string) {
  const pair = substitutions.get(materialId)
  return pair?.options && pair.options.length > 0
}

function getImpact(materialId: string) {
  return changeImpacts.get(materialId)
}

function getMaterialInfo(materialId: string) {
  return materialInfo.get(materialId)
}

function getColorantRange(materialId: string) {
  return colorantHeuristics.get(materialId)
}

// ─── Cautions ────────────────────────────────────────────────────────────────
const recipeCautions = computed(() =>
  (recipe.value?.cautionIds ?? [])
    .map(id => cautions.get(id))
    .filter(Boolean)
)

// ─── Application notes ──────────────────────────────────────────────────────
const applicationNote = computed(() => {
  if (!recipe.value) return null
  return findApplicationNote(recipe.value.firingRangeId, recipe.value.surfaceIds)
})

// ─── Sources ─────────────────────────────────────────────────────────────────
const recipeSources = computed(() =>
  (recipe.value?.sourceIds ?? [])
    .map(id => sources.get(id))
    .filter(Boolean)
)

// ─── UMF Chemistry ────────────────────────────────────────────────────────────
const recipeIngredients = computed(() => recipe.value?.ingredients ?? [])
const recipeFiringRange = computed(() => recipe.value?.firingRangeId)
const { chemistry } = useGlazeChemistry(recipeIngredients, recipeFiringRange)

// ─── Variation Generator ("What If?") ────────────────────────────────────────
const showWhatIf = ref(false)
const whatIfIndex = ref<number>(0)
const whatIfDelta = ref<number>(0)

const whatIfIngredients = computed(() => {
  if (!recipe.value) return []
  return recipe.value.ingredients.map((ing, i) => {
    if (i !== whatIfIndex.value) return ing
    return { ...ing, amount: Math.max(0, ing.amount + whatIfDelta.value) }
  })
})

const whatIfFiringRange = computed(() => recipe.value?.firingRangeId)
const { chemistry: whatIfChemistry } = useGlazeChemistry(whatIfIngredients, whatIfFiringRange)

const whatIfSelectedIngredient = computed(() =>
  recipe.value?.ingredients[whatIfIndex.value] ?? null
)

function formatDelta(base: number, altered: number): string {
  const d = altered - base
  if (Math.abs(d) < 0.005) return '—'
  const sign = d > 0 ? '+' : ''
  return `${sign}${d.toFixed(2)}`
}

function deltaClass(base: number, altered: number): string {
  const d = altered - base
  if (Math.abs(d) < 0.005) return ''
  return d > 0 ? 'delta-pos' : 'delta-neg'
}

// ─── Recipe explanation ───────────────────────────────────────────────────────
const showExplanation = ref(false)
const explanation = computed(() => {
  if (!recipe.value || !chemistry.value.isValid) return null
  return explainRecipe(recipe.value, chemistry.value, scores.value ?? null)
})

// ─── Colorant combination hints ───────────────────────────────────────────────
const colorantIds = computed(() =>
  (recipe.value?.ingredients ?? [])
    .map(i => i.materialId)
    .filter(id => colorantHeuristics.has(id))
)

const combinationHints = computed(() =>
  colorantIds.value.length >= 2 ? findCombinationHints(colorantIds.value) : []
)

// ─── Related recipes — single pass over recipe list ─────────────────────────
const relatedRecipes = computed(() => {
  if (!recipe.value) return { similar: [] as Recipe[], crossRange: [] as Recipe[], twins: [] as Recipe[] }
  const current = recipe.value
  const currentIds = new Set(current.ingredients.map(i => i.materialId))
  const currentProfile = profileId.value
  const currentSurfaces = new Set(current.surfaceIds)
  const currentFamilyId = currentProfile ? glazeStore.colorProfileById.get(currentProfile)?.familyId : null
  const checkTwins = !!(currentProfile || currentSurfaces.size > 0)

  const similarScored: { recipe: Recipe; score: number }[] = []
  const crossScored: { recipe: Recipe; matches: number }[] = []
  const twins: Recipe[] = []

  for (const r of glazeStore.recipes) {
    if (r.id === current.id) continue

    const rIngIds = r.ingredients.map(i => i.materialId)
    const matchCount = rIngIds.filter(id => currentIds.has(id)).length
    const maxLen = Math.max(currentIds.size, rIngIds.length)
    const overlapRatio = maxLen > 0 ? matchCount / maxLen : 0

    // Similar (same firing range, 25%+ overlap)
    if (r.firingRangeId === current.firingRangeId && overlapRatio >= 0.25) {
      similarScored.push({ recipe: r, score: overlapRatio })
    }

    // Cross-range similar (different firing range, 3+ shared ingredients)
    if (r.firingRangeId !== current.firingRangeId && matchCount >= 3) {
      crossScored.push({ recipe: r, matches: matchCount })
    }

    // Visual twins (same color family or surface, <30% material overlap)
    if (checkTwins && twins.length < 3 && overlapRatio < 0.3) {
      const rProfile = glazeStore.profileForRecipe.get(r.id)
      const rFamilyId = rProfile ? glazeStore.colorProfileById.get(rProfile)?.familyId : null
      const colorMatch = !!(currentFamilyId && rFamilyId && currentFamilyId === rFamilyId)
      const surfaceMatch = r.surfaceIds.some(s => currentSurfaces.has(s))
      if (colorMatch || surfaceMatch) {
        twins.push(r)
      }
    }
  }

  similarScored.sort((a, b) => b.score - a.score)
  crossScored.sort((a, b) => b.matches - a.matches)

  return {
    similar: similarScored.slice(0, 4).map(s => s.recipe),
    crossRange: crossScored.slice(0, 3).map(s => s.recipe),
    twins,
  }
})

const similarRecipes = computed(() => relatedRecipes.value.similar)
const crossRangeSimilar = computed(() => relatedRecipes.value.crossRange)
const visualTwins = computed(() => relatedRecipes.value.twins)

// ─── Export as PDF (print) ──────────────────────────────────────────────────
function exportAsPDF() {
  if (!recipe.value) return
  const r = recipe.value
  const chem = chemistry.value
  const cauts = recipeCautions.value
  const srcs = recipeSources.value

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const ingredientRows = r.ingredients
    .map(i => `<tr><td class="ing-name">${i.sourceLabel}</td><td class="ing-pct">${i.amount}%</td></tr>`)
    .join('')

  const chemSection = chem.isValid ? `
    <div class="chem-grid">
      <div class="chem-item"><span class="chem-label">Si : Al</span><span class="chem-val">${chem.siToAl !== null ? chem.siToAl.toFixed(1) : '—'}</span></div>
      <div class="chem-item"><span class="chem-label">KNaO</span><span class="chem-val">${chem.knaO.toFixed(2)}</span></div>
      <div class="chem-item"><span class="chem-label">SiO₂</span><span class="chem-val">${chem.totalSi.toFixed(2)}</span></div>
      <div class="chem-item"><span class="chem-label">Al₂O₃</span><span class="chem-val">${chem.totalAl.toFixed(2)}</span></div>
      <div class="chem-item"><span class="chem-label">LOI</span><span class="chem-val">${chem.totalLOI.toFixed(1)}%</span></div>
      <div class="chem-item"><span class="chem-label">Expansion</span><span class="chem-val">${chem.expansionIndex.toFixed(1)}</span></div>
    </div>` : ''

  const cautionSection = cauts.length ? `
    <div class="cautions">
      <h3>Cautions</h3>
      ${cauts.map(c => `<p class="caution-line caution-${c!.severity}">⚠ <strong>${c!.label}</strong> — ${c!.description}</p>`).join('')}
    </div>` : ''

  const notesSection = r.notes.length ? `
    <div class="notes">
      <h3>Notes</h3>
      ${r.notes.map(n => `<p>${n}</p>`).join('')}
    </div>` : ''

  const sourceSection = srcs.length ? `
    <div class="sources">
      <p class="source-line">Source: ${srcs.map(s => s!.name).join(', ')}</p>
    </div>` : ''

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${r.name} — Glaze Workshop</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Lora', Georgia, serif; color: #2c2416; padding: 24px; max-width: 600px; margin: 0 auto; }
  .card { border: 1px solid #d4cfc7; border-radius: 12px; overflow: hidden; }
  .swatch { height: 60px; background: ${swatchHex.value}; position: relative; }
  .swatch::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%); }
  .card-body { padding: 20px 24px 24px; }
  h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; margin-bottom: 4px; color: #2c2416; }
  .meta { font-family: 'Space Mono', monospace; font-size: 11px; color: #8a7e6e; letter-spacing: 0.04em; margin-bottom: 16px; }
  h3 { font-family: 'Space Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8a7e6e; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px solid #f0ebe3; }
  td { padding: 5px 0; font-size: 13px; }
  .ing-name { font-family: 'Lora', serif; }
  .ing-pct { font-family: 'Space Mono', monospace; text-align: right; font-size: 12px; color: #8a7e6e; }
  .chem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .chem-item { display: flex; flex-direction: column; gap: 2px; }
  .chem-label { font-family: 'Space Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a7e6e; }
  .chem-val { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #2c2416; }
  .notes p { font-size: 13px; line-height: 1.6; color: #5a5245; font-style: italic; margin-bottom: 4px; }
  .caution-line { font-size: 12px; line-height: 1.5; margin-bottom: 4px; }
  .caution-danger { color: #b82020; }
  .caution-warning { color: #c4532a; }
  .caution-info { color: #5a5245; }
  .source-line { font-family: 'Space Mono', monospace; font-size: 10px; color: #8a7e6e; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f0ebe3; }
  .footer { font-family: 'Space Mono', monospace; font-size: 9px; color: #b0a89a; text-align: center; margin-top: 20px; letter-spacing: 0.04em; }
  @media print { body { padding: 0; } .card { border: none; } }
</style>
</head>
<body>
<div class="card">
  <div class="swatch"></div>
  <div class="card-body">
    <h1>${r.name}</h1>
    <div class="meta">Cone ${r.cone} · ${r.atmosphereIds.join(', ')} · ${r.firingRangeId.replace(/-/g, ' ')}</div>
    <h3>Ingredients</h3>
    <table>${ingredientRows}</table>
    ${chemSection ? '<h3>Chemistry (UMF)</h3>' + chemSection : ''}
    ${cautionSection}
    ${notesSection}
    ${sourceSection}
  </div>
</div>
<p class="footer">Glaze Workshop · Printed recipe card</p>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────
const copyLabel = ref('Copy Recipe')

async function copyRecipe() {
  if (!recipe.value) return
  const r = recipe.value
  const lines = [
    r.name,
    `Cone: ${r.cone} | ${r.atmosphereIds.join(', ')}`,
    '',
    'Ingredients:',
    ...r.ingredients.map(i => `  ${i.sourceLabel}: ${i.amount}%`),
    '',
    ...(r.notes.length ? ['Notes:', ...r.notes.map(n => `  ${n}`)] : []),
  ]
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copyLabel.value = 'Copied!'
    setTimeout(() => { copyLabel.value = 'Copy Recipe' }, 2000)
  } catch {
    copyLabel.value = 'Copy failed'
    setTimeout(() => { copyLabel.value = 'Copy Recipe' }, 2000)
  }
}

// ─── Find in workshop ────────────────────────────────────────────────────────
function findRecipesWithIngredient(sourceLabel: string) {
  workshopStore.closeDrawer()
  router.push('/workshop?q=' + encodeURIComponent(sourceLabel))
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function openInCalculator() {
  if (!recipe.value) return
  workshopStore.loadRecipeIntoCalculator(recipe.value)
  workshopStore.closeDrawer()
  router.push('/calculator')
}

function duplicateAsCustom() {
  if (!recipe.value) return
  const custom = workshopStore.duplicateRecipeAsCustom(recipe.value)
  workshopStore.closeDrawer()
  router.push(`/my-recipes/${custom.id}`)
}

function handleSwap(originalId: string, opt: SubstitutionOption) {
  if (!recipe.value) return
  const custom = workshopStore.duplicateRecipeAsCustom(recipe.value)
  const idx = custom.ingredients.findIndex(i => i.materialId === originalId)
  if (idx !== -1) {
    const fromLabel = custom.ingredients[idx].sourceLabel
    custom.ingredients[idx] = {
      materialId: opt.materialId,
      sourceLabel: opt.label,
      amount: custom.ingredients[idx].amount,
    }
    custom.notes.push(`Substituted: replaced ${fromLabel} with ${opt.label}. ${opt.difficultyNote}`)
    workshopStore.saveCustomRecipe(custom)
    swapConfirm.value = { fromLabel, toLabel: opt.label, note: opt.difficultyNote }
    switcherOpen.value = null
    setTimeout(() => {
      workshopStore.closeDrawer()
      router.push(`/my-recipes/${custom.id}`)
    }, 1800)
  }
}

// ─── Expansion: Colour development guides ───────────────────────────────────
const matchingColourGuides = computed(() => {
  if (!recipe.value || !glazeStore.colourGuides.length) return []
  const r = recipe.value
  const rColours = new Set(r.colourIds)
  const rSurfaces = new Set(r.surfaceIds)

  return glazeStore.colourGuides.filter(g => {
    // Match by referenceRecipeIds
    if (g.referenceRecipeIds.includes(r.id)) return true
    // Match by colour id keywords
    const gId = g.id.toLowerCase()
    for (const c of rColours) {
      if (gId.includes(c.toLowerCase())) return true
    }
    // Match reactive surfaces to floating-blue guide
    if (gId.includes('floating') && (rSurfaces.has('variegated') || rSurfaces.has('breaking'))) return true
    return false
  })
})

// ─── Expansion: Firing programs ─────────────────────────────────────────────
const matchingFiringPrograms = computed(() => {
  if (!recipe.value || !glazeStore.firingPrograms.length) return []
  const r = recipe.value
  const cone = r.cone.toLowerCase()
  const firingRange = r.firingRangeId

  return glazeStore.firingPrograms.filter(p => {
    if (p.kind === 'bisque') return false // only show glaze programs
    const target = p.targetConeOrRange.toLowerCase()
    // Match by cone overlap or firing range keywords
    if (target.includes(cone)) return true
    if (firingRange === 'low-fire' && (target.includes('04') || target.includes('06') || target.includes('02'))) return true
    if (firingRange === 'mid-fire' && (target.includes('5') || target.includes('6'))) return true
    if (firingRange === 'high-fire' && (target.includes('9') || target.includes('10') || target.includes('11'))) return true
    return false
  })
})

// ─── Expansion: Body response ───────────────────────────────────────────────
const matchingBodyResponse = computed(() => {
  if (!recipe.value || !glazeStore.familyResponses.length) return null
  const r = recipe.value

  // Match by referenceRecipeIds first
  let match = glazeStore.familyResponses.find(fr =>
    fr.referenceRecipeIds.includes(r.id)
  )
  if (match) return match

  // Fallback: match by family ID keywords against firingRange + surface
  const rSurfaces = new Set(r.surfaceIds)
  match = glazeStore.familyResponses.find(fr => {
    const fId = fr.id.toLowerCase()
    if (r.firingRangeId === 'low-fire' && fId.includes('lowfire')) {
      if (rSurfaces.has('glossy') && fId.includes('clear')) return true
    }
    if (r.firingRangeId === 'mid-fire' && fId.includes('cone6')) {
      if (rSurfaces.has('glossy') && fId.includes('clear')) return true
      if (rSurfaces.has('matte') && fId.includes('matte')) return true
    }
    if (r.firingRangeId === 'high-fire' && fId.includes('highfire')) return true
    return false
  })
  return match ?? null
})

// ─── Expansion: Material switching playbooks ────────────────────────────────
function getPlaybooks(materialId: string) {
  return glazeStore.playbooksByMaterialId.get(materialId) ?? []
}

// ─── Expansion: Expanded material info ──────────────────────────────────────
function getExpandedMaterial(materialId: string) {
  return glazeStore.expandedMaterialById.get(materialId)
}

function formatScore(val: number): string {
  return '●'.repeat(val) + '○'.repeat(5 - val)
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="workshopStore.isDrawerOpen" class="drawer-backdrop" @click="workshopStore.closeDrawer()" />
    </Transition>

    <!-- Drawer -->
    <Transition name="slide-right">
      <aside v-if="workshopStore.isDrawerOpen && recipe" class="recipe-drawer">
        <!-- Header swatch -->
        <div class="drawer-swatch" :style="{ background: swatchHex }">
          <div class="swatch-sheen" />
          <button class="close-btn" @click="workshopStore.closeDrawer()" aria-label="Close" title="Close (Esc)">✕</button>
        </div>

        <div class="drawer-content">
          <!-- Name & tags -->
          <div class="drawer-header">
            <div class="drawer-tags">
              <TagBadge :label="'Cone ' + recipe.cone" variant="cone" />
              <TagBadge v-for="atm in recipe.atmosphereIds" :key="atm" :label="atm" variant="atmosphere" />
            </div>
            <h2 class="drawer-title">{{ recipe.name }}</h2>
            <p v-if="profile?.appearance" class="drawer-appearance">{{ profile.appearance }}</p>
            <button
              v-if="recipeCautions.length"
              class="caution-badge"
              :class="{ expanded: isSectionOpen('cautions') }"
              @click="toggleSection('cautions')"
            >
              <span class="caution-badge-icon">{{ recipeCautions.some(c => c!.severity === 'danger') ? '⚠' : '!' }}</span>
              {{ recipeCautions.length }} caution{{ recipeCautions.length > 1 ? 's' : '' }}
              <span class="caution-badge-arrow">{{ isSectionOpen('cautions') ? '▾' : '▸' }}</span>
            </button>
          </div>

          <!-- Cautions (collapsible) -->
          <Transition name="expand-info">
            <div v-if="recipeCautions.length && isSectionOpen('cautions')" class="cautions-block">
              <div
                v-for="caution in recipeCautions"
                :key="caution!.id"
                class="caution-item"
                :class="caution!.severity"
              >
                <span class="caution-icon">
                  {{ caution!.severity === 'danger' ? '⚠' : caution!.severity === 'warning' ? '!' : 'ℹ' }}
                </span>
                <div class="caution-text">
                  <strong>{{ caution!.label }}</strong>
                  <span>{{ caution!.description }}</span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Ingredients -->
          <section class="drawer-section">
            <h3 class="section-label">
              Ingredients
              <span class="section-hint">tap i for info · ⇄ to swap · → to find</span>
            </h3>
            <div class="ingredients-list">
              <div
                v-for="ing in recipe.ingredients"
                :key="ing.materialId"
                class="ingredient-row-wrap"
              >
                <div class="ingredient-row">
                  <span class="ing-name">
                    {{ ing.sourceLabel }}
                    <button
                      v-if="getMaterialInfo(ing.materialId)"
                      class="ing-action-dot"
                      :class="{ active: expandedInfo.has(ing.materialId) }"
                      @click="toggleInfo(ing.materialId)"
                      title="Material info"
                    >i</button>
                    <button
                      class="ing-find-btn"
                      @click="findRecipesWithIngredient(ing.sourceLabel)"
                      title="Find recipes with this ingredient"
                    >→</button>
                  </span>
                  <div class="ing-bar-wrap">
                    <div class="ing-bar" :style="{ width: ing.amount + '%' }" />
                  </div>
                  <span class="ing-amount">{{ ing.amount }}%</span>
                  <button
                    v-if="hasSubstitutes(ing.materialId)"
                    class="sub-trigger"
                    :class="{ active: switcherOpen === ing.materialId }"
                    @click="toggleSwitcher(ing.materialId)"
                    title="Show substitutes"
                  >⇄</button>
                </div>

                <!-- Click-expanded info panel -->
                <Transition name="expand-info">
                  <div
                    v-if="expandedInfo.has(ing.materialId) && switcherOpen !== ing.materialId"
                    class="ingredient-info-panel"
                  >
                    <div v-if="getMaterialInfo(ing.materialId)" class="tip-section">
                      <p class="tip-beginner">{{ getMaterialInfo(ing.materialId)!.beginner }}</p>
                      <div class="tip-role">
                        <span class="tip-label">Role</span>
                        <span>{{ getMaterialInfo(ing.materialId)!.group.replace(/-/g, ' ') }}</span>
                      </div>
                    </div>
                    <div v-if="getImpact(ing.materialId)" class="tip-section">
                      <span class="tip-label">If you adjust this</span>
                      <p class="tip-visual-hint">{{ getImpact(ing.materialId)!.visualHint }}</p>
                      <div v-if="getImpact(ing.materialId)!.watchFor.length" class="tip-watch">
                        <span class="tip-watch-label">Watch for:</span>
                        <span v-for="w in getImpact(ing.materialId)!.watchFor" :key="w" class="tip-watch-item">{{ w }}</span>
                      </div>
                    </div>
                    <div v-if="getColorantRange(ing.materialId)" class="tip-section">
                      <span class="tip-label">Typical range</span>
                      <p class="tip-range">{{ getColorantRange(ing.materialId)!.range }}</p>
                    </div>
                    <!-- Expanded material info -->
                    <div v-if="getExpandedMaterial(ing.materialId)" class="tip-section">
                      <span class="tip-label">Adds</span>
                      <ul class="tip-expanded-list">
                        <li v-for="(w, wi) in getExpandedMaterial(ing.materialId)!.whatItAdds" :key="wi">{{ w }}</li>
                      </ul>
                      <div v-if="getExpandedMaterial(ing.materialId)!.watchFor.length" class="tip-watch">
                        <span class="tip-watch-label">Watch for:</span>
                        <span v-for="w in getExpandedMaterial(ing.materialId)!.watchFor" :key="w" class="tip-watch-item">{{ w }}</span>
                      </div>
                      <div v-if="getExpandedMaterial(ing.materialId)!.typicalUsePercent" class="tip-use-pct">
                        {{ getExpandedMaterial(ing.materialId)!.typicalUsePercent }}
                      </div>
                    </div>
                    <!-- Switching playbooks -->
                    <div v-if="getPlaybooks(ing.materialId).length" class="tip-section">
                      <span class="tip-label">Switching guide</span>
                      <div v-for="pb in getPlaybooks(ing.materialId)" :key="pb.id" class="playbook-block">
                        <p class="playbook-why">{{ pb.whyThisIsHard }}</p>
                        <p class="playbook-first"><strong>First move:</strong> {{ pb.firstMove }}</p>
                        <div class="playbook-test">
                          <span class="playbook-test-label">Test sequence</span>
                          <ol class="playbook-test-list">
                            <li v-for="(s, si) in pb.testSequence" :key="si">{{ s }}</li>
                          </ol>
                        </div>
                        <div v-if="pb.stopIf.length" class="playbook-stop">
                          <div v-for="(s, si) in pb.stopIf" :key="si" class="playbook-stop-item">
                            <span class="playbook-stop-icon">!</span> {{ s }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-if="hasSubstitutes(ing.materialId)" class="tip-sub-hint">
                      Click ⇄ to see substitutes for this ingredient
                    </div>
                  </div>
                </Transition>

                <!-- Ingredient Switcher panel -->
                <IngredientSwitcher
                  :ingredient="ing"
                  :visible="switcherOpen === ing.materialId"
                  :all-ingredients="recipe.ingredients"
                  :firing-range-id="recipe.firingRangeId"
                  @close="closeSwitcher"
                  @swap="handleSwap"
                />
              </div>
            </div>
            <div class="ingredients-total">
              <span>Total</span>
              <span :class="{ balanced: percentageSum >= 99 && percentageSum <= 101 }">
                {{ percentageSum.toFixed(1) }}%
              </span>
            </div>
          </section>

          <!-- UMF Chemistry (collapsible on mobile) -->
          <section v-if="chemistry.isValid" class="drawer-section collapsible-section">
            <h3 class="section-label section-toggle" @click="toggleSection('chemistry')">
              Chemistry
              <span class="toggle-arrow">{{ isSectionOpen('chemistry') ? '▾' : '▸' }}</span>
            </h3>
            <div v-if="isSectionOpen('chemistry')" class="collapsible-body">
              <ChemistryPanel :chemistry="chemistry" :compact="true" />
            </div>
          </section>

          <!-- ─── What If? Variation Generator ─── -->
          <section v-if="chemistry.isValid && recipe.ingredients.length > 0" class="drawer-section">
            <div class="whatif-header">
              <h3 class="section-label">What If?</h3>
              <button
                class="whatif-toggle-btn"
                :class="{ active: showWhatIf }"
                @click="showWhatIf = !showWhatIf; whatIfDelta = 0"
              >{{ showWhatIf ? 'Close' : 'Adjust an ingredient' }}</button>
            </div>

            <Transition name="expand">
              <div v-if="showWhatIf" class="whatif-body">
                <div class="whatif-controls">
                  <div class="whatif-control-row">
                    <label class="whatif-label">Ingredient</label>
                    <select v-model.number="whatIfIndex" class="whatif-select" @change="whatIfDelta = 0">
                      <option v-for="(ing, i) in recipe.ingredients" :key="i" :value="i">
                        {{ ing.sourceLabel }} ({{ ing.amount }}%)
                      </option>
                    </select>
                  </div>
                  <div class="whatif-control-row">
                    <label class="whatif-label">
                      Adjust
                      <span class="whatif-delta-display" :class="{ pos: whatIfDelta > 0, neg: whatIfDelta < 0 }">
                        {{ whatIfDelta > 0 ? '+' : '' }}{{ whatIfDelta }}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      v-model.number="whatIfDelta"
                      class="whatif-slider"
                    />
                  </div>
                </div>

                <div v-if="whatIfChemistry.isValid" class="whatif-compare">
                  <div class="whatif-compare-header">
                    <span>Metric</span>
                    <span>Before</span>
                    <span>After</span>
                    <span>Δ</span>
                  </div>
                  <div class="whatif-row">
                    <span>Si : Al</span>
                    <span class="whatif-val">{{ chemistry.siToAl !== null ? chemistry.siToAl.toFixed(2) : '—' }}</span>
                    <span class="whatif-val">{{ whatIfChemistry.siToAl !== null ? whatIfChemistry.siToAl.toFixed(2) : '—' }}</span>
                    <span class="whatif-delta" :class="deltaClass(chemistry.siToAl ?? 0, whatIfChemistry.siToAl ?? 0)">
                      {{ chemistry.siToAl !== null && whatIfChemistry.siToAl !== null ? formatDelta(chemistry.siToAl, whatIfChemistry.siToAl) : '—' }}
                    </span>
                  </div>
                  <div class="whatif-row">
                    <span>KNaO</span>
                    <span class="whatif-val">{{ chemistry.knaO.toFixed(3) }}</span>
                    <span class="whatif-val">{{ whatIfChemistry.knaO.toFixed(3) }}</span>
                    <span class="whatif-delta" :class="deltaClass(chemistry.knaO, whatIfChemistry.knaO)">{{ formatDelta(chemistry.knaO, whatIfChemistry.knaO) }}</span>
                  </div>
                  <div class="whatif-row">
                    <span>Al₂O₃</span>
                    <span class="whatif-val">{{ chemistry.totalAl.toFixed(3) }}</span>
                    <span class="whatif-val">{{ whatIfChemistry.totalAl.toFixed(3) }}</span>
                    <span class="whatif-delta" :class="deltaClass(chemistry.totalAl, whatIfChemistry.totalAl)">{{ formatDelta(chemistry.totalAl, whatIfChemistry.totalAl) }}</span>
                  </div>
                  <div class="whatif-row">
                    <span>SiO₂</span>
                    <span class="whatif-val">{{ chemistry.totalSi.toFixed(3) }}</span>
                    <span class="whatif-val">{{ whatIfChemistry.totalSi.toFixed(3) }}</span>
                    <span class="whatif-delta" :class="deltaClass(chemistry.totalSi, whatIfChemistry.totalSi)">{{ formatDelta(chemistry.totalSi, whatIfChemistry.totalSi) }}</span>
                  </div>
                  <div class="whatif-row">
                    <span>Expansion</span>
                    <span class="whatif-val">{{ chemistry.expansionIndex.toFixed(1) }}</span>
                    <span class="whatif-val">{{ whatIfChemistry.expansionIndex.toFixed(1) }}</span>
                    <span class="whatif-delta" :class="deltaClass(chemistry.expansionIndex, whatIfChemistry.expansionIndex)">{{ formatDelta(chemistry.expansionIndex, whatIfChemistry.expansionIndex) }}</span>
                  </div>
                  <p class="whatif-note">
                    Preview only — no changes are saved. The percentages are renormalised in UMF calculation.
                  </p>
                </div>
              </div>
            </Transition>
          </section>

          <!-- Swap confirmation toast -->
          <Transition name="toast">
            <div v-if="swapConfirm" class="swap-toast">
              <span class="toast-icon">✓</span>
              <div class="toast-text">
                <strong>Swap applied!</strong>
                <span>{{ swapConfirm.fromLabel }} → {{ swapConfirm.toLabel }}</span>
                <span class="toast-sub">Opening your new recipe…</span>
              </div>
            </div>
          </Transition>

          <!-- Colorant combination hints -->
          <section v-if="combinationHints.length" class="drawer-section">
            <h3 class="section-label">Combined Colorant Effect</h3>
            <div class="combo-hints">
              <div v-for="hint in combinationHints" :key="hint.combined" class="combo-hint">
                <span class="combo-combined">{{ hint.combined }}</span>
                <p class="combo-note">{{ hint.note }}</p>
              </div>
            </div>
          </section>

          <!-- Visual scores -->
          <section v-if="scores" class="drawer-section">
            <h3 class="section-label">Character</h3>
            <div class="scores-grid">
              <div class="score-row">
                <span>Gloss</span>
                <span class="score-dots">{{ formatScore(scores.glossLevel) }}</span>
              </div>
              <div class="score-row">
                <span>Opacity</span>
                <span class="score-dots">{{ formatScore(scores.opacityLevel) }}</span>
              </div>
              <div class="score-row">
                <span>Variation</span>
                <span class="score-dots">{{ formatScore(scores.variationLevel) }}</span>
              </div>
              <div class="score-row">
                <span>Run risk</span>
                <span class="score-dots" :class="{ 'high-risk': scores.runRisk >= 4 }">{{ formatScore(scores.runRisk) }}</span>
              </div>
              <div class="score-row">
                <span>Texture</span>
                <span class="score-dots">{{ formatScore(scores.textureLevel) }}</span>
              </div>
            </div>
            <p v-if="recipeOverride?.edgeBreak" class="visual-hint">
              <span class="hint-label">Edge break</span> {{ recipeOverride.edgeBreak }}
            </p>
            <p v-if="recipeOverride?.poolingColorHint" class="visual-hint">
              <span class="hint-label">Pooling</span> {{ recipeOverride.poolingColorHint }}
            </p>
          </section>

          <!-- Notes (collapsible on mobile) -->
          <section v-if="recipe.notes.length" class="drawer-section collapsible-section">
            <h3 class="section-label section-toggle" @click="toggleSection('notes')">
              Notes
              <span class="toggle-arrow">{{ isSectionOpen('notes') ? '▾' : '▸' }}</span>
            </h3>
            <ul v-if="isSectionOpen('notes')" class="notes-list">
              <li v-for="(note, i) in recipe.notes" :key="i">{{ note }}</li>
            </ul>
          </section>

          <!-- Surface tags -->
          <section v-if="recipe.surfaceIds.length" class="drawer-section">
            <h3 class="section-label">Surface</h3>
            <div class="tag-row">
              <TagBadge v-for="s in recipe.surfaceIds" :key="s" :label="s" variant="surface" />
            </div>
          </section>

          <!-- Tableware status -->
          <div class="tableware-status" :class="recipe.tablewareStatus">
            <span class="status-icon">
              {{ recipe.tablewareStatus === 'functional' ? '✓' : recipe.tablewareStatus === 'test-only' ? '⚠' : '◦' }}
            </span>
            <span>{{ recipe.tablewareStatus.replace(/-/g, ' ') }}</span>
          </div>

          <!-- Similar recipes (collapsible on mobile) -->
          <RecipeSimilarList
            :recipes="similarRecipes"
            title="Similar Recipes"
            section-key="similar"
            :is-section-open="isSectionOpen('similar')"
            @toggle="toggleSection"
          />

          <!-- Cross-range similar (collapsible on mobile) -->
          <RecipeSimilarList
            :recipes="crossRangeSimilar"
            title="Similar at Other Temps"
            section-key="crossRange"
            :is-section-open="isSectionOpen('crossRange')"
            :cone-label="(r) => `C${r.cone} · ${r.firingRangeId.replace(/-/g, ' ')}`"
            @toggle="toggleSection"
          />

          <!-- Visual twins -->
          <RecipeSimilarList
            :recipes="visualTwins"
            title="Visual Twins"
            section-key="twins"
            hint="same look, different path"
            :is-section-open="isSectionOpen('twins')"
            :cone-label="(r) => `C${r.cone} · ${r.ingredients.length} materials`"
            @toggle="toggleSection"
          />

          <!-- Colour Development Guide (collapsible on mobile) -->
          <section v-if="matchingColourGuides.length" class="drawer-section collapsible-section">
            <h3 class="section-label section-toggle" @click="toggleSection('colourGuide')">
              Colour Guide
              <span class="toggle-arrow">{{ isSectionOpen('colourGuide') ? '▾' : '▸' }}</span>
            </h3>
            <div v-if="isSectionOpen('colourGuide')" class="collapsible-body">
              <ColourGuidePanel :guides="matchingColourGuides" />
            </div>
          </section>

          <!-- Firing Programs (collapsible on mobile) -->
          <section v-if="matchingFiringPrograms.length" class="drawer-section collapsible-section">
            <h3 class="section-label section-toggle" @click="toggleSection('firing')">
              Firing Programs
              <span class="toggle-arrow">{{ isSectionOpen('firing') ? '▾' : '▸' }}</span>
            </h3>
            <div v-if="isSectionOpen('firing')" class="collapsible-body">
              <FiringProgramPanel :programs="matchingFiringPrograms" />
            </div>
          </section>

          <!-- Body Response (collapsible on mobile) -->
          <section v-if="matchingBodyResponse" class="drawer-section collapsible-section">
            <h3 class="section-label section-toggle" @click="toggleSection('bodyResponse')">
              Body Response
              <span class="section-hint">how this glaze behaves on different clays</span>
              <span class="toggle-arrow">{{ isSectionOpen('bodyResponse') ? '▾' : '▸' }}</span>
            </h3>
            <div v-if="isSectionOpen('bodyResponse')" class="collapsible-body">
              <BodyResponsePanel :responses="matchingBodyResponse.responses" :bodies="glazeStore.bodyDefinitions" />
            </div>
          </section>

          <!-- User notes -->
          <section class="drawer-section user-notes-section">
            <h3 class="section-label">My Notes</h3>
            <ul v-if="workshopStore.getUserNotes(recipe.id).length" class="user-notes-list">
              <li v-for="(note, i) in workshopStore.getUserNotes(recipe.id)" :key="i" class="user-note-item">
                <span class="user-note-text">{{ note }}</span>
                <button class="user-note-remove" @click="workshopStore.removeUserNote(recipe.id, i)" title="Remove note">×</button>
              </li>
            </ul>
            <div class="user-note-input-row">
              <input
                v-model="newNote"
                class="user-note-input"
                placeholder="Add a note..."
                @keydown.enter="submitNote"
              />
              <button class="user-note-add" :disabled="!newNote.trim()" @click="submitNote">+</button>
            </div>
          </section>

          <!-- Application notes -->
          <section v-if="applicationNote" class="drawer-section">
            <h3 class="section-label">Application Guide</h3>
            <div class="app-note-grid">
              <div class="app-note-item">
                <span class="app-note-label">Thickness</span>
                <span class="app-note-value">{{ applicationNote.thickness }}</span>
                <span class="app-note-desc">{{ applicationNote.thicknessNote }}</span>
              </div>
              <div class="app-note-item">
                <span class="app-note-label">Specific Gravity</span>
                <span class="app-note-value">{{ applicationNote.specificGravity }}</span>
              </div>
              <div class="app-note-item">
                <span class="app-note-label">Dipping Time</span>
                <span class="app-note-value">{{ applicationNote.dippingTime }}</span>
              </div>
              <div class="app-note-item full-width">
                <span class="app-note-label">Layering</span>
                <span class="app-note-desc">{{ applicationNote.layeringNote }}</span>
              </div>
            </div>
            <ul v-if="applicationNote.generalTips.length" class="app-tips">
              <li v-for="(tip, i) in applicationNote.generalTips" :key="i">{{ tip }}</li>
            </ul>
          </section>

          <!-- Sources -->
          <div v-if="recipeSources.length" class="sources-line">
            <span class="sources-label">Source:</span>
            <span v-for="(src, i) in recipeSources" :key="src!.id">
              <a v-if="src!.url" :href="src!.url" target="_blank" rel="noopener" class="source-link">{{ src!.name }}</a>
              <span v-else class="source-name">{{ src!.name }}</span>
              <span v-if="i < recipeSources.length - 1">, </span>
            </span>
          </div>

          <!-- Actions -->
          <div class="drawer-actions">
            <button class="btn btn-primary" @click="openInCalculator">
              Open in Calculator
            </button>
            <button class="btn btn-secondary" @click="duplicateAsCustom">
              ✎ Make My Version
            </button>
            <button
              class="btn btn-ghost"
              @click="workshopStore.toggleFavorite(recipe.id)"
            >
              {{ workshopStore.isFavorite(recipe.id) ? '♥ Saved' : '♡ Save' }}
            </button>
            <button class="btn btn-ghost" @click="copyRecipe">
              {{ copyLabel }}
            </button>
            <button class="btn btn-ghost" @click="exportAsPDF">
              Export PDF
            </button>
            <button v-if="explanation" class="btn btn-ghost" @click="showExplanation = !showExplanation">
              {{ showExplanation ? 'Hide Explanation' : 'Explain This Recipe' }}
            </button>
          </div>

          <!-- Recipe Explanation -->
          <Transition name="slide-down">
            <div v-if="showExplanation && explanation" class="explanation-panel">
              <p class="explanation-summary">{{ explanation.summary }}</p>
              <ul v-if="explanation.details.length" class="explanation-details">
                <li v-for="(detail, i) in explanation.details" :key="i">{{ detail }}</li>
              </ul>
              <div v-if="explanation.warnings.length" class="explanation-warnings">
                <div v-for="(warning, i) in explanation.warnings" :key="i" class="explanation-warning">
                  <span class="warning-icon">!</span>
                  <span>{{ warning }}</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(26, 20, 16, 0.4);
  backdrop-filter: blur(3px);
  z-index: calc(var(--z-drawer) - 1);
}

.recipe-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: min(var(--drawer-width), 100vw);
  background: var(--chalk);
  z-index: var(--z-drawer);
  overflow-y: auto;
  box-shadow: -8px 0 40px rgba(44, 36, 22, 0.2);
}

.drawer-swatch {
  height: 140px;
  position: relative;
  flex-shrink: 0;
}

.swatch-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
}

.close-btn {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--cream-90);
  border: none;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  color: var(--ink);
}

.close-btn:hover {
  background: white;
  transform: scale(1.05);
}

.drawer-content {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.drawer-header { display: flex; flex-direction: column; gap: var(--space-2); }
.drawer-tags { display: flex; gap: var(--space-1); flex-wrap: wrap; }

.drawer-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--carbon);
  line-height: 1.2;
}

.drawer-appearance {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--stone);
  font-size: var(--text-base);
}

/* Cautions */
.cautions-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.caution-item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border-left: 3px solid;
}

.caution-item.info {
  background: rgba(122, 143, 110, 0.1);
  border-color: var(--sage);
}

.caution-item.warning {
  background: rgba(196, 83, 42, 0.08);
  border-color: var(--clay);
}

.caution-item.danger {
  background: rgba(192, 57, 43, 0.08);
  border-color: #c0392b;
}

.caution-icon {
  font-size: var(--text-base);
  flex-shrink: 0;
  margin-top: 1px;
  line-height: 1.4;
}

.caution-item.info .caution-icon { color: var(--sage-dark); }
.caution-item.warning .caution-icon { color: var(--clay); }
.caution-item.danger .caution-icon { color: #c0392b; }

.caution-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.caution-text strong {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.caution-item.info .caution-text strong { color: var(--sage-dark); }
.caution-item.warning .caution-text strong { color: var(--clay-dark); }
.caution-item.danger .caution-text strong { color: #c0392b; }

.caution-text span {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

.drawer-section { display: flex; flex-direction: column; gap: var(--space-3); }

.section-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.section-hint {
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: none;
  font-style: italic;
  opacity: 0.6;
  font-size: 10px;
}

.ingredients-list { display: flex; flex-direction: column; gap: 0; }

.ingredient-row-wrap {
  position: relative;
  border-bottom: 1px solid var(--ink-05);
  padding: var(--space-2) 0;
  cursor: default;
}

.ingredient-row-wrap:last-child { border-bottom: none; }

.ingredient-row {
  display: grid;
  grid-template-columns: 1fr 80px 48px 28px;
  gap: var(--space-2);
  align-items: center;
}

.ing-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.ing-action-dot,
.ing-find-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 9px;
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.ing-action-dot {
  background: var(--ink-10);
  color: var(--stone);
  font-style: italic;
}

.ing-action-dot:hover,
.ing-action-dot.active {
  background: var(--clay);
  color: white;
}

.ing-find-btn {
  background: transparent;
  color: var(--stone);
  border: 1px solid var(--ink-10);
  font-size: 11px;
}

.ing-find-btn:hover {
  background: var(--parchment);
  color: var(--ink);
  border-color: var(--ink-20);
}

.ing-bar-wrap {
  height: 6px;
  background: var(--parchment);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.ing-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--clay), var(--clay-light));
  border-radius: var(--radius-full);
  max-width: 100%;
}

.ing-amount {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  text-align: right;
}

/* Click-expanded ingredient info panel */
.ingredient-info-panel {
  padding: var(--space-3);
  margin: var(--space-1) 0 var(--space-2);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border: 1px solid var(--ink-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.expand-info-enter-active,
.expand-info-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}
.expand-info-enter-from,
.expand-info-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.tip-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.tip-section + .tip-section {
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-05);
}

.tip-beginner {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

.tip-role {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  text-transform: capitalize;
}

.tip-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--clay);
}

.tip-visual-hint {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.45;
  font-style: italic;
}

.tip-range {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--stone-dark);
}

.tip-watch {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.tip-watch-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.tip-watch-item {
  font-family: var(--font-mono);
  font-size: 10px;
  color: #c0392b;
  padding: 1px var(--space-1);
  background: rgba(192, 57, 43, 0.08);
  border-radius: 2px;
}

/* Substitute trigger */
.sub-trigger {
  background: none;
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  color: var(--stone);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.sub-trigger:hover,
.sub-trigger.active {
  background: var(--clay);
  border-color: var(--clay);
  color: white;
}

.tip-sub-hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--clay);
  font-style: italic;
  padding-top: var(--space-1);
  border-top: 1px solid var(--ink-05);
}

.ingredients-total {
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-10);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
}

.balanced { color: var(--sage-dark); font-weight: 700; }

/* Colorant combination hints */
.combo-hints {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.combo-hint {
  padding: var(--space-3) var(--space-4);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--clay);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.combo-combined {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--carbon);
}

.combo-note {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  line-height: 1.5;
  font-style: italic;
}

.scores-grid { display: flex; flex-direction: column; gap: var(--space-2); }

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
}

.score-dots {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--clay);
  letter-spacing: 2px;
}

.score-dots.high-risk { color: #c0392b; }

.visual-hint {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.5;
  margin-top: var(--space-2);
  font-style: italic;
}

.hint-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink);
  margin-right: var(--space-1);
}

.notes-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.notes-list li {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  padding-left: var(--space-4);
  position: relative;
  line-height: 1.55;
}

.notes-list li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: var(--stone);
}

.tag-row { display: flex; gap: var(--space-2); flex-wrap: wrap; }

.tableware-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--parchment);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--stone);
}

.tableware-status.functional { background: rgba(122, 143, 110, 0.15); color: var(--sage-dark); }
.tableware-status.test-only { background: rgba(196, 83, 42, 0.1); color: var(--clay-dark); }

.status-icon { font-size: var(--text-base); }

/* Similar recipes */
/* Sources */
.sources-line {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
}

.sources-label {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 10px;
}

.source-link {
  color: var(--clay);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--transition-fast);
}

.source-link:hover { color: var(--clay-dark); }

/* User notes */
.user-notes-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.user-note-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--parchment);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--clay-20);
}

.user-note-text {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.5;
  flex: 1;
}

.user-note-remove {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--stone);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.user-note-remove:hover {
  background: var(--clay-10);
  color: var(--clay);
}

.user-note-input-row {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.user-note-input {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  background: var(--chalk);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
}

.user-note-input::placeholder {
  color: var(--stone);
  font-style: italic;
}

.user-note-input:focus {
  outline: none;
  border-color: var(--clay);
}

.user-note-add {
  width: 32px;
  height: 32px;
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-sm);
  background: var(--chalk);
  color: var(--clay);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.user-note-add:hover:not(:disabled) {
  background: var(--clay);
  color: white;
  border-color: var(--clay);
}

.user-note-add:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Caution badge in header */
.caution-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: rgba(196, 83, 42, 0.1);
  border: 1px solid rgba(196, 83, 42, 0.2);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--clay-dark);
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-start;
}

.caution-badge:hover {
  background: rgba(196, 83, 42, 0.15);
  border-color: var(--clay);
}

.caution-badge-icon {
  font-size: 12px;
}

.caution-badge-arrow {
  font-size: 9px;
  opacity: 0.6;
}

/* Collapsible sections */
.section-toggle {
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.section-toggle:hover {
  color: var(--clay);
}

.toggle-arrow {
  font-size: 10px;
  opacity: 0.5;
  margin-left: auto;
  font-weight: 400;
}

/* On desktop, hide toggle arrows */
@media (min-width: 769px) {
  .toggle-arrow {
    display: none;
  }
}

/* On mobile, give toggles more tap target */
@media (max-width: 768px) {
  .collapsible-section .section-toggle {
    padding: var(--space-1) 0;
  }
}

.source-name { color: var(--stone); }

.drawer-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-2);
}

/* ── Explanation panel ── */
/* ─── What If? ─── */
.whatif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.whatif-toggle-btn {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--ink-20);
  background: transparent;
  color: var(--stone);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.whatif-toggle-btn:hover,
.whatif-toggle-btn.active {
  border-color: var(--clay);
  color: var(--clay);
  background: var(--clay-10);
}

.whatif-body {
  margin-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.whatif-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.whatif-control-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.whatif-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.whatif-delta-display {
  font-weight: 700;
}

.whatif-delta-display.pos {
  color: var(--sage);
}

.whatif-delta-display.neg {
  color: var(--clay);
}

.whatif-select {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--ink);
  background: var(--parchment);
  border: 1px solid var(--ink-20);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  width: 100%;
  cursor: pointer;
}

.whatif-slider {
  width: 100%;
  accent-color: var(--clay);
  cursor: pointer;
}

.whatif-compare {
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.whatif-compare-header {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--ink-05);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}

.whatif-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: var(--space-2);
  align-items: center;
  padding: 6px var(--space-3);
  border-top: 1px solid var(--ink-05);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ink);
}

.whatif-val {
  min-width: 52px;
  text-align: right;
  color: var(--stone);
}

.whatif-delta {
  min-width: 52px;
  text-align: right;
  font-weight: 700;
}

.delta-pos {
  color: var(--sage);
}

.delta-neg {
  color: var(--clay);
}

.whatif-note {
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-style: italic;
  color: var(--stone);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--ink-05);
  line-height: 1.5;
  margin: 0;
}

.explanation-panel {
  background: var(--parchment);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-left: 3px solid var(--sage);
}

.explanation-summary {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.7;
  font-weight: 500;
}

.explanation-details {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.explanation-details li {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.6;
  padding-left: var(--space-4);
  position: relative;
}

.explanation-details li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--sage);
  font-weight: 700;
}

.explanation-warnings {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.explanation-warning {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-2) var(--space-3);
  background: rgba(196, 83, 42, 0.06);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--clay);
}

.explanation-warning .warning-icon {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--clay);
  flex-shrink: 0;
}

.explanation-warning span:last-child {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
  overflow: hidden;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-down-enter-to, .slide-down-leave-from {
  max-height: 600px;
}

/* Swap confirmation toast */
.swap-toast {
  position: sticky;
  bottom: var(--space-4);
  background: var(--band);
  color: var(--on-band);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  box-shadow: var(--shadow-xl);
  z-index: 10;
}

.toast-icon {
  font-size: var(--text-lg);
  color: var(--sage);
  flex-shrink: 0;
}

.toast-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toast-text strong {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
}

.toast-text span {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  opacity: 0.8;
}

.toast-sub {
  font-family: var(--font-mono) !important;
  font-size: 10px !important;
  color: var(--stone-light) !important;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity var(--transition-base); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-right-enter-active, .slide-right-leave-active { transition: transform var(--transition-slow); }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }

/* Expanded material info in ingredient panel */
.tip-expanded-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tip-expanded-list li {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.45;
  padding-left: var(--space-3);
  position: relative;
}

.tip-expanded-list li::before {
  content: '·';
  position: absolute;
  left: var(--space-1);
  color: var(--stone);
  font-weight: 700;
}

.tip-use-pct {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  margin-top: var(--space-1);
}

/* Switching playbook block */
.playbook-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: rgba(122, 143, 110, 0.06);
  border-left: 2px solid rgba(122, 143, 110, 0.3);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.playbook-why {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark);
  line-height: 1.5;
  font-style: italic;
}

.playbook-first {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

.playbook-first strong {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sage);
}

.playbook-test {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.playbook-test-label {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--stone);
  font-weight: 700;
}

.playbook-test-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  counter-reset: pstep;
}

.playbook-test-list li {
  counter-increment: pstep;
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--ink);
  line-height: 1.45;
  padding-left: var(--space-3);
  position: relative;
}

.playbook-test-list li::before {
  content: counter(pstep) '.';
  position: absolute;
  left: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.playbook-stop {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.playbook-stop-item {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--clay);
  line-height: 1.45;
}

.playbook-stop-icon {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 10px;
}

/* Application notes */
.app-note-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.app-note-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-3);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border-left: 2px solid var(--ink-10);
}

.app-note-item.full-width {
  grid-column: 1 / -1;
}

.app-note-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}

.app-note-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--clay);
  font-weight: 600;
}

.app-note-desc {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.5;
}

.app-tips {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: rgba(122, 143, 110, 0.06);
  border-left: 2px solid rgba(122, 143, 110, 0.3);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.app-tips li {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--ink);
  line-height: 1.55;
  padding-left: var(--space-3);
  position: relative;
}

.app-tips li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--sage);
  font-weight: 700;
}

@media (max-width: 768px) {
  .app-note-grid {
    grid-template-columns: 1fr;
  }
}
</style>
