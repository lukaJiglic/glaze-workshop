<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlazeStore } from '@/stores/glaze'
import { gsap } from 'gsap'
import StepProcedureCard from '@/components/ui/StepProcedureCard.vue'

const router = useRouter()
const glazeStore = useGlazeStore()

interface DefectLink {
  label: string
  query: string        // search query for workshop
  material?: string    // materialId for substitution context
}

interface Defect {
  id: string
  name: string
  symptom: string
  firstChecks: string[]
  likelyCauses: string[]
  actions: string[]
  icon: string
  workshopLinks?: DefectLink[]
  avoidScoreKey?: string  // visual score key that indicates avoidance
  avoidScoreMax?: number  // max value = good avoidance
}

const defects = ref<Defect[]>([
  {
    id: 'crazing', name: 'Crazing', icon: '≋',
    symptom: 'Fine crack network after cooling or after use.',
    firstChecks: ['Confirm body and firing schedule match the recipe', 'Check if it crazes on one body but not another'],
    likelyCauses: ['Glaze expansion too high for the body', 'Too much Na2O or K2O', 'Glaze applied too thick', 'Body underfired or too porous'],
    actions: ['Raise SiO2 modestly in a line blend', 'Reduce high-expansion fluxes (sodium, potassium)', 'Switch to a lower-expansion frit', 'Test on a different body'],
    workshopLinks: [
      { label: 'Recipes using low-expansion frits', query: 'frit 3249' },
      { label: 'Recipes with wollastonite (CaO without high expansion)', query: 'wollastonite' },
    ],
  },
  {
    id: 'shivering', name: 'Shivering', icon: '⌇',
    symptom: 'Glaze chips or peels away from the body, especially on rims and edges.',
    firstChecks: ['Opposite of crazing — glaze is in too much compression', 'Look for chip-shaped flakes, not cracks'],
    likelyCauses: ['Glaze expansion too low for the body', 'Too much silica or lithium', 'Talc body with a low-expansion glaze'],
    actions: ['Lower SiO2 in a test blend', 'Try a higher-expansion frit', 'Test on a different body'],
    workshopLinks: [
      { label: 'Recipes using nepheline syenite (high expansion)', query: 'nepheline' },
    ],
  },
  {
    id: 'pinholing', name: 'Pinholing', icon: '∘',
    symptom: 'Small holes in the glaze surface that did not heal over during firing.',
    firstChecks: ['Check if the kiln reached full temperature', 'Look at bisque quality — underfired bisque gasses more'],
    likelyCauses: ['Gases from carbonates or organics escaping too late', 'Insufficient top soak', 'Glaze applied too thick', 'Bisque too low or firing too fast'],
    actions: ['Add a 10-15 minute top soak', 'Slow the bisque firing through quartz inversion', 'Apply glaze thinner', 'Reduce carbonate materials (whiting → wollastonite)'],
    workshopLinks: [
      { label: 'Recipes using whiting (high LOI carbonate)', query: 'whiting', material: 'whiting' },
      { label: 'Recipes using dolomite (high LOI)', query: 'dolomite', material: 'dolomite' },
      { label: 'Recipes using wollastonite (low-LOI alternative)', query: 'wollastonite' },
    ],
  },
  {
    id: 'blistering', name: 'Blistering', icon: '◌',
    symptom: 'Large bubbles or burst craters in the glaze surface.',
    firstChecks: ['Worse than pinholes — larger disruptions', 'Often related to overfiring or thick application'],
    likelyCauses: ['Overfiring or too-fast firing', 'Contamination from kiln wash or dust', 'Reduction timing too aggressive', 'Glaze too thick'],
    actions: ['Lower peak temperature or shorten soak', 'Apply glaze thinner', 'Clean bisqueware before glazing', 'Check kiln furniture for contamination'],
  },
  {
    id: 'crawling', name: 'Crawling', icon: '◠',
    symptom: 'Glaze pulls away from the body in patches, exposing bare clay.',
    firstChecks: ['Crawling usually happens before the glaze fully melts', 'Check for dusty or oily bisqueware'],
    likelyCauses: ['Dusty or greasy bisqueware', 'Too much raw clay (kaolin/ball clay) causing high dry shrinkage', 'Glaze applied too thick', 'Excessive bentonite'],
    actions: ['Clean bisqueware — wipe with damp sponge before glazing', 'Replace some raw clay with calcined kaolin', 'Apply thinner coats', 'Reduce bentonite below 3%'],
    workshopLinks: [
      { label: 'Recipes using calcined kaolin (less crawling)', query: 'calcined kaolin' },
      { label: 'Recipes using bentonite (check amount)', query: 'bentonite' },
    ],
  },
  {
    id: 'running', name: 'Running / Dripping', icon: '▽',
    symptom: 'Glaze flows down the pot and pools at the bottom, may stick to the kiln shelf.',
    firstChecks: ['Check if the kiln is overfiring', 'Was the glaze applied too thick at the bottom?'],
    likelyCauses: ['Too much flux, too little alumina', 'Overfiring or too long a soak', 'Glaze applied too thick', 'Zinc or boron levels too high'],
    actions: ['Add alumina (kaolin) to stiffen the melt', 'Reduce flux materials', 'Apply thinner at the bottom half', 'Use a catch plate for testing', 'Wax the foot ring before glazing'],
    workshopLinks: [
      { label: 'Recipes using kaolin (adds alumina — stiffens melt)', query: 'kaolin' },
    ],
    avoidScoreKey: 'runRisk',
    avoidScoreMax: 1,
  },
  {
    id: 'cutlery-marking', name: 'Cutlery Marking', icon: '─',
    symptom: 'Metal marks appear when cutlery touches the glaze surface.',
    firstChecks: ['Is the surface matte or underfired?', 'Marks wipe off with abrasive cleaner but return with use'],
    likelyCauses: ['Surface too rough or underfired', 'High alumina matte with micro-crystals that trap metal', 'Insufficient silica in the surface glass'],
    actions: ['Fire to a higher cone or add a longer soak', 'Increase silica to build a smoother glass surface', 'Switch to a glossier formulation for dinnerware']
  },
])

const activeDefect = ref<string | null>(null)
const headerEl = ref<HTMLElement | null>(null)

const selectedDefect = computed(() => defects.value.find(d => d.id === activeDefect.value))

function selectDefect(id: string) {
  activeDefect.value = activeDefect.value === id ? null : id
}

function searchWorkshop(query: string) {
  router.push({ path: '/workshop', query: { q: query } })
}

const avoidRecipes = computed(() => {
  const defect = selectedDefect.value
  if (!defect?.avoidScoreKey || !glazeStore.isLoaded) return []
  const key = defect.avoidScoreKey as keyof ReturnType<typeof glazeStore.getScores & object>
  const maxVal = defect.avoidScoreMax ?? 1
  return glazeStore.recipes
    .filter(r => {
      const s = glazeStore.getScores(r.id, r.firingRangeId) as Record<string, number> | null | undefined
      return s && typeof s[key] === 'number' && s[key] <= maxVal
    })
    .slice(0, 6)
})

onMounted(() => {
  glazeStore.loadStepProcedures()
  if (headerEl.value) {
    gsap.fromTo(headerEl.value, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
  }
})
</script>

<template>
  <div class="troubleshooter-view">
    <div ref="headerEl" class="trouble-header">
      <div class="trouble-header-inner">
        <h1 class="page-title">Troubleshooter</h1>
        <p class="page-sub">Having problems with your glaze? Start with the symptom you see.</p>
      </div>
    </div>

    <div class="trouble-layout">
      <!-- Intro text -->
      <div class="trouble-intro" v-reveal>
        <h2 class="intro-heading">What do you see?</h2>
        <p class="intro-text">Tap on a defect below to see what might be causing it and how to fix it. Always start with the "first checks" — most problems have simple causes.</p>
      </div>

      <!-- Defect cards grid -->
      <div class="defect-grid">
        <button
          v-for="defect in defects"
          :key="defect.id"
          class="defect-card"
          :class="{ active: activeDefect === defect.id }"
          @click="selectDefect(defect.id)"
          :aria-label="`Diagnose ${defect.name}`"
          v-reveal.scale
        >
          <span class="defect-icon" aria-hidden="true">{{ defect.icon }}</span>
          <h3 class="defect-name">{{ defect.name }}</h3>
          <p class="defect-symptom">{{ defect.symptom }}</p>
        </button>
      </div>

      <!-- Expanded defect detail -->
      <Transition name="detail">
        <div v-if="selectedDefect" class="defect-detail" :key="selectedDefect.id">
          <div class="detail-header">
            <span class="detail-icon">{{ selectedDefect.icon }}</span>
            <div>
              <h2 class="detail-title">{{ selectedDefect.name }}</h2>
              <p class="detail-symptom">{{ selectedDefect.symptom }}</p>
            </div>
          </div>

          <!-- First checks -->
          <section class="detail-section">
            <h3 class="detail-label">First checks</h3>
            <p class="detail-note">Rule these out before digging deeper.</p>
            <ol class="detail-list check-list">
              <li v-for="(check, i) in selectedDefect.firstChecks" :key="i">
                <span class="check-number">{{ i + 1 }}</span>
                {{ check }}
              </li>
            </ol>
          </section>

          <!-- Likely causes -->
          <section class="detail-section">
            <h3 class="detail-label">Likely causes</h3>
            <ul class="detail-list cause-list">
              <li v-for="(cause, i) in selectedDefect.likelyCauses" :key="i">{{ cause }}</li>
            </ul>
          </section>

          <!-- Actions -->
          <section class="detail-section">
            <h3 class="detail-label">What to try</h3>
            <ol class="detail-list action-list">
              <li v-for="(action, i) in selectedDefect.actions" :key="i">
                <span class="action-number">{{ i + 1 }}</span>
                {{ action }}
              </li>
            </ol>
          </section>

          <!-- Workshop links -->
          <section v-if="selectedDefect.workshopLinks?.length" class="detail-section">
            <h3 class="detail-label">Find in Workshop</h3>
            <div class="workshop-links">
              <button
                v-for="link in selectedDefect.workshopLinks"
                :key="link.query"
                class="workshop-link"
                @click="searchWorkshop(link.query)"
              >
                <span class="link-arrow">→</span>
                {{ link.label }}
              </button>
            </div>
          </section>

          <!-- Recipes that avoid this problem -->
          <section v-if="avoidRecipes.length" class="detail-section">
            <h3 class="detail-label">Recipes with low risk</h3>
            <p class="detail-note">These recipes score low on {{ selectedDefect.avoidScoreKey?.replace(/([A-Z])/g, ' $1').toLowerCase() }}.</p>
            <div class="avoid-chips">
              <button
                v-for="r in avoidRecipes"
                :key="r.id"
                class="avoid-chip"
                @click="router.push({ path: '/workshop', query: { q: r.name } })"
              >
                {{ r.name }}
              </button>
            </div>
          </section>

          <!-- General advice -->
          <div class="detail-advice">
            <span class="advice-icon">◈</span>
            <p>Always test changes on a small batch first. Use line blends — change one variable at a time and fire all tiles together so you can compare results fairly.</p>
          </div>
        </div>
      </Transition>

      <!-- Studio Procedures -->
      <div v-if="glazeStore.stepProcedures.length" class="procedures-section" v-reveal>
        <h2 class="section-heading">Studio Procedures</h2>
        <p class="procedures-intro">Step-by-step instructions for common glaze testing tasks. Follow these to keep your tests comparable and your results meaningful.</p>
        <div class="procedures-grid">
          <StepProcedureCard
            v-for="proc in glazeStore.stepProcedures"
            :key="proc.id"
            :procedure="proc"
          />
        </div>
      </div>

      <!-- General tips section -->
      <div class="general-section" v-reveal>
        <h2 class="section-heading">General Tips</h2>
        <div class="tips-grid">
          <div class="tip-card">
            <h3>Clean your bisqueware</h3>
            <p>Dust and finger oils cause crawling. Wipe with a damp sponge before glazing.</p>
          </div>
          <div class="tip-card">
            <h3>Slow your bisque</h3>
            <p>Most pinholes and blisters come from gases that didn't escape during bisque. Fire slower through 500-600°C.</p>
          </div>
          <div class="tip-card">
            <h3>Add a top soak</h3>
            <p>10-15 minutes at peak temperature gives bubbles time to heal. Helps with gloss and smoothness.</p>
          </div>
          <div class="tip-card">
            <h3>Test on different bodies</h3>
            <p>Crazing on one clay doesn't mean the glaze is bad — it might just not fit that body. Always test the pair.</p>
          </div>
          <div class="tip-card">
            <h3>One change at a time</h3>
            <p>Change one ingredient, keep everything else the same. Otherwise you can't tell what caused the difference.</p>
          </div>
          <div class="tip-card">
            <h3>Use witness cones</h3>
            <p>A pyrometer reads air temperature, not heatwork. Cones tell you what the glaze actually experienced.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.troubleshooter-view {
  min-height: 100vh;
  background: var(--cream);
}

.trouble-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-8)) var(--space-8) var(--space-8);
}

.trouble-header-inner {
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

.trouble-layout {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.trouble-intro { display: flex; flex-direction: column; gap: var(--space-2); }

.intro-heading {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--carbon);
}

.intro-text {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  max-width: 600px;
  line-height: 1.6;
}

/* Defect cards */
.defect-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
}

.defect-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  background: var(--chalk);
  border: 2px solid var(--ink-10);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
}

.defect-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: var(--ink-20);
}

.defect-card.active {
  border-color: var(--clay);
  box-shadow: var(--shadow-clay);
  background: var(--parchment);
}

.defect-icon {
  font-size: 2rem;
  color: var(--clay);
  line-height: 1;
}

.defect-name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--carbon);
}

.defect-symptom {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.5;
}

/* Detail panel */
.defect-detail {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.detail-icon {
  font-size: 2.5rem;
  color: var(--clay);
  line-height: 1;
  flex-shrink: 0;
}

.detail-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--carbon);
}

.detail-symptom {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  font-style: italic;
  margin-top: var(--space-1);
}

.detail-section { display: flex; flex-direction: column; gap: var(--space-3); }

.detail-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--clay);
}

.detail-note {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  font-style: italic;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}

.check-list li, .action-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.55;
}

.check-number, .action-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--clay-10);
  color: var(--clay);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.cause-list li {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  padding-left: var(--space-4);
  position: relative;
  line-height: 1.55;
}

.cause-list li::before {
  content: '•';
  position: absolute;
  left: var(--space-1);
  color: var(--stone);
}

.detail-advice {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--parchment);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--clay);
}

.advice-icon {
  color: var(--clay);
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.detail-advice p {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone-dark);
  line-height: 1.6;
  font-style: italic;
}

/* Workshop links */
.workshop-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.workshop-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.workshop-link:hover {
  border-color: var(--clay);
  background: var(--clay-10);
  color: var(--clay);
}

.link-arrow {
  font-family: var(--font-mono);
  color: var(--clay);
  font-weight: 700;
}

/* Avoid chips */
.avoid-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.avoid-chip {
  padding: var(--space-1) var(--space-3);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.avoid-chip:hover {
  border-color: var(--sage);
  background: var(--sage-10);
  color: var(--sage);
}

/* General tips */
.section-heading {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--carbon);
  margin-bottom: var(--space-4);
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}

.tip-card {
  padding: var(--space-5);
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tip-card h3 {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--carbon);
}

.tip-card p {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.55;
}

/* Studio Procedures */
.procedures-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.procedures-intro {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  max-width: 600px;
  line-height: 1.6;
}

.procedures-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Transitions */
.detail-enter-active, .detail-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.detail-enter-from, .detail-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 600px) {
  .trouble-layout { padding: var(--space-4); }
  .defect-detail { padding: var(--space-5); }
}
</style>
