<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { glossary, type GlossaryEntry } from '@/data/glossary'

const headerEl = ref<HTMLElement | null>(null)
const searchQuery = ref('')

// Group terms into categories for browsing
const categories: { label: string; icon: string; keys: string[] }[] = [
  {
    label: 'Firing & Temperature',
    icon: '△',
    keys: [
      'cone', 'firing range', 'low-fire', 'mid-fire', 'high-fire', 'raku',
      'cone 4', 'cone 5', 'cone 6', 'cone 8', 'cone 9', 'cone 10',
      'heat work', 'soak', 'firing schedule', 'ramp rate', 'thermal shock',
      'candling', 'downdraft', 'updraft', 'draft', 'ventilation',
    ],
  },
  {
    label: 'Kiln & Equipment',
    icon: '⬡',
    keys: [
      'kiln', 'kiln wash', 'kiln furniture', 'kiln sitter', 'thermocouple',
      'pyrometric cone', 'pyrometric', 'cone pack', 'witness cone', 'stilt',
      'banding wheel', 'extruder', 'pugmill', 'rib', 'chuck',
    ],
  },
  {
    label: 'Atmosphere',
    icon: '◎',
    keys: ['atmosphere', 'oxidation', 'reduction', 'neutral', 'soda firing'],
  },
  {
    label: 'Glaze Chemistry',
    icon: '⬢',
    keys: [
      'umf', 'knao', 'loi', 'thermal expansion', 'fit',
      'flux', 'glass former', 'stabilizer', 'colorant', 'stain', 'opacifier',
      'deflocculant', 'specific gravity',
    ],
  },
  {
    label: 'Oxides — Glass Formers & Stabilizers',
    icon: '◆',
    keys: ['sio2', 'al2o3', 'b2o3'],
  },
  {
    label: 'Oxides — Fluxes',
    icon: '◇',
    keys: ['cao', 'mgo', 'k2o', 'na2o', 'li2o', 'zno', 'bao', 'sro', 'pbo'],
  },
  {
    label: 'Oxides — Colorants & Opacifiers',
    icon: '●',
    keys: [
      'fe2o3', 'tio2', 'zro2', 'coo', 'cuo', 'mno', 'mno2',
      'cr2o3', 'nio', 'sno2', 'p2o5',
    ],
  },
  {
    label: 'Raw Materials',
    icon: '▣',
    keys: [
      'feldspar', 'kaolin', 'silica', 'whiting', 'frit', 'ball clay',
      'spodumene', 'rutile', 'wollastonite', 'dolomite', 'talc',
      'nepheline syenite', 'bentonite', 'soda ash', 'grog',
    ],
  },
  {
    label: 'Glaze Surfaces',
    icon: '◐',
    keys: [
      'matte', 'satin', 'glossy', 'crackle', 'crystalline',
      'opaque', 'transparent', 'variegated',
    ],
  },
  {
    label: 'Glaze Styles',
    icon: '◈',
    keys: ['celadon', 'tenmoku', 'shino', 'majolica', 'ash', 'engobe'],
  },
  {
    label: 'Defects & Problems',
    icon: '⚠',
    keys: [
      'crazing', 'shivering', 'crawling', 'pinholing', 'blistering',
      'running', 'dunting', 'carbon trapping',
    ],
  },
  {
    label: 'Application & Technique',
    icon: '✦',
    keys: [
      'dipping', 'brushing', 'spraying', 'layering', 'wax resist',
      'slip', 'slip trailing', 'underglaze', 'overglaze', 'burnishing',
      'recipe', 'batch weight',
    ],
  },
  {
    label: 'Clay & Bodies',
    icon: '▤',
    keys: ['stoneware', 'porcelain', 'earthenware'],
  },
  {
    label: 'Making & Studio',
    icon: '⊛',
    keys: [
      'greenware', 'bone dry', 'leather hard', 'bisque', 'bisque ware',
      'glaze fire', 'vitrification', 'throwing', 'trimming', 'centering',
      'coil building', 'drape mold', 'foot ring', 'gallery', 'scoring',
      'sponge', 'wedging',
    ],
  },
]

// Collect any glossary entries not in any category
const categorizedKeys = new Set(categories.flatMap(c => c.keys))
const uncategorized = computed(() => {
  const extra: string[] = []
  for (const key of glossary.keys()) {
    if (!categorizedKeys.has(key)) extra.push(key)
  }
  return extra
})

interface DisplayEntry {
  key: string
  entry: GlossaryEntry
}

const allEntries = computed<DisplayEntry[]>(() => {
  const list: DisplayEntry[] = []
  for (const [key, entry] of glossary.entries()) {
    list.push({ key, entry })
  }
  return list.sort((a, b) => a.entry.term.localeCompare(b.entry.term))
})

const filteredEntries = computed<DisplayEntry[]>(() => {
  if (!searchQuery.value.trim()) return []
  const q = searchQuery.value.toLowerCase().trim()
  return allEntries.value.filter(
    ({ key, entry }) =>
      entry.term.toLowerCase().includes(q) ||
      key.includes(q) ||
      entry.plain.toLowerCase().includes(q)
  )
})

const isSearching = computed(() => searchQuery.value.trim().length > 0)

// Scroll to a term from seeAlso
let highlightTimeout: ReturnType<typeof setTimeout> | null = null

function scrollToTerm(termKey: string) {
  searchQuery.value = ''
  nextTick(() => {
    const el = document.getElementById(`glossary-${termKey}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('highlight-pulse')
      if (highlightTimeout) clearTimeout(highlightTimeout)
      highlightTimeout = setTimeout(() => el.classList.remove('highlight-pulse'), 1500)
    }
  })
}

function getEntry(key: string): GlossaryEntry | undefined {
  return glossary.get(key)
}

const searchInput = ref<HTMLInputElement | null>(null)

let headerTween: gsap.core.Tween | null = null

function handleKeydown(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault()
    searchInput.value?.focus()
  }
}

onMounted(() => {
  if (headerEl.value) {
    headerTween = gsap.fromTo(headerEl.value, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
  }

  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  headerTween?.kill()
  document.removeEventListener('keydown', handleKeydown)
  if (highlightTimeout) clearTimeout(highlightTimeout)
})
</script>

<template>
  <div class="glossary-view">
    <div ref="headerEl" class="glossary-header">
      <div class="glossary-header-inner">
        <h1 class="page-title">Glossary</h1>
        <p class="page-sub">Every ceramics term in one place — from cone to cobalt.</p>
      </div>
    </div>

    <div class="glossary-layout">
      <!-- Search bar -->
      <div class="search-bar" v-reveal>
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search terms…  ( / )"
          aria-label="Search glossary"
        />
        <span v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</span>
      </div>

      <!-- Search results -->
      <div v-if="isSearching" class="search-results">
        <p class="results-count" v-if="filteredEntries.length">
          {{ filteredEntries.length }} term{{ filteredEntries.length !== 1 ? 's' : '' }} found
        </p>
        <p v-else class="results-empty">No terms match "{{ searchQuery }}"</p>
        <div
          v-for="{ key, entry } in filteredEntries"
          :key="key"
          class="glossary-card"
        >
          <h3 class="card-term">{{ entry.term }}</h3>
          <p class="card-plain">{{ entry.plain }}</p>
          <p v-if="entry.analogy" class="card-analogy">{{ entry.analogy }}</p>
          <p class="card-why"><span class="why-label">Why it matters:</span> {{ entry.whyItMatters }}</p>
          <div v-if="entry.seeAlso?.length" class="card-see-also">
            <span class="see-also-label">See also:</span>
            <button
              v-for="ref in entry.seeAlso"
              :key="ref"
              class="see-also-link"
              @click="scrollToTerm(ref)"
            >
              {{ getEntry(ref)?.term ?? ref }}
            </button>
          </div>
        </div>
      </div>

      <!-- Category browsing -->
      <div v-else class="category-list">
        <section
          v-for="cat in categories"
          :key="cat.label"
          class="category-section"
          v-reveal
        >
          <h2 class="category-title">
            <span class="category-icon">{{ cat.icon }}</span>
            {{ cat.label }}
          </h2>
          <div class="category-grid">
            <div
              v-for="key in cat.keys.filter(k => glossary.has(k))"
              :key="key"
              :id="`glossary-${key}`"
              class="glossary-card"
            >
              <h3 class="card-term">{{ getEntry(key)!.term }}</h3>
              <p class="card-plain">{{ getEntry(key)!.plain }}</p>
              <p v-if="getEntry(key)!.analogy" class="card-analogy">{{ getEntry(key)!.analogy }}</p>
              <p class="card-why"><span class="why-label">Why it matters:</span> {{ getEntry(key)!.whyItMatters }}</p>
              <div v-if="getEntry(key)!.seeAlso?.length" class="card-see-also">
                <span class="see-also-label">See also:</span>
                <button
                  v-for="ref in getEntry(key)!.seeAlso"
                  :key="ref"
                  class="see-also-link"
                  @click="scrollToTerm(ref)"
                >
                  {{ getEntry(ref)?.term ?? ref }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Uncategorized (if any) -->
        <section v-if="uncategorized.length" class="category-section" v-reveal>
          <h2 class="category-title">
            <span class="category-icon">◯</span>
            Other Terms
          </h2>
          <div class="category-grid">
            <div
              v-for="key in uncategorized"
              :key="key"
              :id="`glossary-${key}`"
              class="glossary-card"
            >
              <h3 class="card-term">{{ getEntry(key)!.term }}</h3>
              <p class="card-plain">{{ getEntry(key)!.plain }}</p>
              <p v-if="getEntry(key)!.analogy" class="card-analogy">{{ getEntry(key)!.analogy }}</p>
              <p class="card-why"><span class="why-label">Why it matters:</span> {{ getEntry(key)!.whyItMatters }}</p>
              <div v-if="getEntry(key)!.seeAlso?.length" class="card-see-also">
                <span class="see-also-label">See also:</span>
                <button
                  v-for="ref in getEntry(key)!.seeAlso"
                  :key="ref"
                  class="see-also-link"
                  @click="scrollToTerm(ref)"
                >
                  {{ getEntry(ref)?.term ?? ref }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glossary-view {
  min-height: 100vh;
}

/* ── Header ────────────────────────────────────────────────────── */
.glossary-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-8)) 2rem var(--space-8);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 40px), 0 100%);
}
.glossary-header-inner {
  max-width: 900px;
  margin: 0 auto;
}
.page-title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3rem);
  color: var(--on-band);
  margin: 0 0 0.5rem;
}
.page-sub {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone-light);
  letter-spacing: 0.04em;
  margin: 0;
}

/* ── Layout ────────────────────────────────────────────────────── */
.glossary-layout {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

/* ── Search ────────────────────────────────────────────────────── */
.search-bar {
  position: relative;
  margin-bottom: 2rem;
}
.search-input {
  width: 100%;
  padding: 0.85rem 1.2rem;
  padding-right: 2.5rem;
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--ink);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.search-input:focus {
  border-color: var(--clay);
  box-shadow: 0 0 0 3px var(--clay-10);
}
.search-input::placeholder {
  color: var(--stone);
  font-style: italic;
}
.search-clear {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.3rem;
  color: var(--stone);
  cursor: pointer;
  line-height: 1;
  padding: 4px;
}
.search-clear:hover {
  color: var(--clay);
}

/* ── Results ───────────────────────────────────────────────────── */
.results-count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 1rem;
}
.results-empty {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--stone);
  text-align: center;
  padding: 3rem 0;
}

/* ── Category sections ─────────────────────────────────────────── */
.category-section {
  margin-bottom: 2.5rem;
}
.category-title {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--ink-10);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.category-icon {
  font-size: var(--text-base);
}
.category-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

/* ── Glossary card ─────────────────────────────────────────────── */
.glossary-card {
  background: var(--parchment);
  border: 1px solid var(--ink-05);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.glossary-card:hover {
  border-color: var(--ink-10);
  box-shadow: 0 2px 8px var(--clay-10);
}
.glossary-card.highlight-pulse {
  animation: highlight-pulse 1.5s ease;
}
@keyframes highlight-pulse {
  0% { box-shadow: 0 0 0 0 var(--clay-20); border-color: var(--clay); }
  100% { box-shadow: 0 0 0 0 transparent; border-color: var(--ink-05); }
}

.card-term {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--carbon);
  margin: 0 0 0.4rem;
  line-height: 1.3;
}
.card-plain {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  margin: 0 0 0.5rem;
  line-height: 1.6;
}
.card-analogy {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--stone);
  margin: 0 0 0.5rem;
  line-height: 1.5;
}
.card-why {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark, var(--stone));
  margin: 0;
  line-height: 1.5;
}
.why-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--clay);
}

/* ── See also ──────────────────────────────────────────────────── */
.card-see-also {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--ink-05);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}
.see-also-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--stone);
  margin-right: 0.2rem;
}
.see-also-link {
  background: var(--ink-05);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.see-also-link:hover {
  background: var(--clay-10);
  color: var(--clay);
}

/* ── Responsive ────────────────────────────────────────────────── */
@media (min-width: 601px) {
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .glossary-header {
    padding: 2.5rem 1.25rem 3rem;
  }
  .glossary-layout {
    padding: 1.5rem 1rem 3rem;
  }
}
</style>
