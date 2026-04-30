<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { learningPaths, type LearningPath, type LearningStep } from '@/data/learning-paths'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'

const router = useRouter()
const glazeStore = useGlazeStore()
const workshopStore = useWorkshopStore()

const headerEl = ref<HTMLElement | null>(null)
const activePath = ref<LearningPath | null>(null)
const currentStepIndex = ref(0)

const currentStep = computed<LearningStep | null>(() =>
  activePath.value ? activePath.value.steps[currentStepIndex.value] ?? null : null
)

const totalSteps = computed(() => activePath.value?.steps.length ?? 0)
const progress = computed(() =>
  totalSteps.value > 0 ? ((currentStepIndex.value + 1) / totalSteps.value) * 100 : 0
)

const stepRecipe = computed(() => {
  if (!currentStep.value?.recipeId) return null
  return glazeStore.recipeById.get(currentStep.value.recipeId) ?? null
})

function selectPath(path: LearningPath) {
  activePath.value = path
  currentStepIndex.value = 0
  nextTick(() => {
    const el = document.querySelector('.learn-content')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function nextStep() {
  if (currentStepIndex.value < totalSteps.value - 1) {
    currentStepIndex.value++
    scrollToContent()
  }
}

function prevStep() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
    scrollToContent()
  }
}

function goToStep(i: number) {
  currentStepIndex.value = i
  scrollToContent()
}

function scrollToContent() {
  nextTick(() => {
    const el = document.querySelector('.step-card')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function openRecipe(recipeId: string) {
  const recipe = glazeStore.recipeById.get(recipeId)
  if (recipe) {
    workshopStore.openRecipe(recipe)
    router.push('/workshop')
  }
}

function backToList() {
  activePath.value = null
  currentStepIndex.value = 0
}

const difficultyColor: Record<string, string> = {
  beginner: 'var(--sage)',
  intermediate: 'var(--clay)',
  advanced: 'var(--carbon)',
}

let headerTween: gsap.core.Tween | null = null
let stepTween: gsap.core.Tween | null = null

onMounted(() => {
  if (headerEl.value) {
    headerTween = gsap.fromTo(headerEl.value, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
  }
})

onUnmounted(() => {
  headerTween?.kill()
  stepTween?.kill()
})

watch(currentStepIndex, () => {
  nextTick(() => {
    const card = document.querySelector('.step-card')
    if (card) {
      stepTween?.kill()
      stepTween = gsap.fromTo(card, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' })
    }
  })
})
</script>

<template>
  <div class="learn-view">
    <div ref="headerEl" class="learn-header">
      <div class="learn-header-inner">
        <h1 class="page-title">Learn</h1>
        <p class="page-sub">Guided paths through glaze chemistry — from your first clear to advanced troubleshooting.</p>
      </div>
    </div>

    <div class="learn-layout">
      <!-- Path selection grid -->
      <Transition name="fade" mode="out-in">
        <div v-if="!activePath" class="path-grid" key="grid">
          <button
            v-for="path in learningPaths"
            :key="path.id"
            class="path-card"
            @click="selectPath(path)"
            v-reveal.scale
          >
            <span class="path-icon">{{ path.icon }}</span>
            <h2 class="path-title">{{ path.title }}</h2>
            <p class="path-subtitle">{{ path.subtitle }}</p>
            <div class="path-meta">
              <span
                class="path-difficulty"
                :style="{ color: difficultyColor[path.difficulty], borderColor: difficultyColor[path.difficulty] }"
              >
                {{ path.difficulty }}
              </span>
              <span class="path-time">{{ path.estimatedMinutes }} min</span>
              <span class="path-steps">{{ path.steps.length }} steps</span>
            </div>
          </button>
        </div>

        <!-- Active path content -->
        <div v-else class="learn-content" key="content">
          <button class="back-btn" @click="backToList">
            <span class="back-arrow">&larr;</span> All Paths
          </button>

          <div class="path-header-active">
            <span class="path-icon-lg">{{ activePath.icon }}</span>
            <div>
              <h2 class="active-title">{{ activePath.title }}</h2>
              <p class="active-subtitle">{{ activePath.subtitle }}</p>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="progress-bar-wrap">
            <div class="progress-bar" :style="{ width: progress + '%' }" />
            <span class="progress-label">{{ currentStepIndex + 1 }} / {{ totalSteps }}</span>
          </div>

          <!-- Step dots -->
          <div class="step-dots">
            <button
              v-for="(step, i) in activePath.steps"
              :key="i"
              class="step-dot"
              :class="{
                active: i === currentStepIndex,
                visited: i < currentStepIndex,
                'is-recipe': step.type === 'recipe',
                'is-exercise': step.type === 'exercise',
              }"
              :title="step.title"
              @click="goToStep(i)"
            />
          </div>

          <!-- Current step -->
          <div v-if="currentStep" class="step-card" :class="[`step-${currentStep.type}`]">
            <div class="step-type-badge">
              {{ currentStep.type === 'recipe' ? 'Recipe' : currentStep.type === 'exercise' ? 'Exercise' : 'Concept' }}
            </div>
            <h3 class="step-title">{{ currentStep.title }}</h3>
            <p class="step-content">{{ currentStep.content }}</p>

            <!-- Tip callout -->
            <div v-if="currentStep.tip" class="step-tip">
              <span class="tip-icon">*</span>
              <p>{{ currentStep.tip }}</p>
            </div>

            <!-- Recipe preview -->
            <div v-if="currentStep.type === 'recipe' && stepRecipe" class="step-recipe-preview">
              <div class="recipe-mini-header">
                <span class="recipe-mini-name">{{ stepRecipe.name }}</span>
                <span class="recipe-mini-cone">Cone {{ stepRecipe.cone }}</span>
              </div>
              <div class="recipe-mini-ingredients">
                <div
                  v-for="ing in stepRecipe.ingredients"
                  :key="ing.materialId"
                  class="mini-ingredient"
                >
                  <span class="mini-ing-name">{{ ing.sourceLabel }}</span>
                  <span class="mini-ing-bar">
                    <span class="mini-ing-fill" :style="{ width: Math.min(ing.amount, 100) + '%' }" />
                  </span>
                  <span class="mini-ing-pct">{{ ing.amount }}%</span>
                </div>
              </div>
              <!-- Highlight oxides -->
              <div v-if="currentStep.highlightOxides?.length" class="highlight-oxides">
                <span class="oxide-label">Key oxides:</span>
                <span v-for="ox in currentStep.highlightOxides" :key="ox" class="oxide-badge">{{ ox }}</span>
              </div>
              <button class="open-recipe-btn" @click="openRecipe(stepRecipe.id)">
                Open in Workshop &rarr;
              </button>
            </div>
          </div>

          <!-- Navigation -->
          <div class="step-nav">
            <button class="nav-btn" :disabled="currentStepIndex === 0" @click="prevStep">
              &larr; Previous
            </button>
            <button
              v-if="currentStepIndex < totalSteps - 1"
              class="nav-btn nav-btn-primary"
              @click="nextStep"
            >
              Next &rarr;
            </button>
            <button v-else class="nav-btn nav-btn-primary" @click="backToList">
              Done &check;
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.learn-view {
  min-height: 100vh;
}

/* ── Header ────────────────────────────────────────────────────── */
.learn-header {
  background: var(--band);
  padding: calc(var(--nav-height) + var(--space-8)) 2rem var(--space-8);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 40px), 0 100%);
}
.learn-header-inner {
  max-width: 800px;
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
.learn-layout {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

/* ── Path grid ─────────────────────────────────────────────────── */
.path-grid {
  display: grid;
  gap: 1.25rem;
}
.path-card {
  background: var(--parchment);
  border: 1px solid var(--ink-05);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.path-card:hover {
  border-color: var(--clay-20);
  box-shadow: 0 4px 16px rgba(196, 83, 42, 0.12);
  transform: translateY(-2px);
}
.path-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.75rem;
  opacity: 0.7;
}
.path-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--carbon);
  margin: 0 0 0.4rem;
}
.path-subtitle {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  margin: 0 0 1rem;
  line-height: 1.5;
}
.path-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.path-difficulty {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid;
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.5rem;
}
.path-time,
.path-steps {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
}

/* ── Active path ───────────────────────────────────────────────── */
.back-btn {
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--stone);
  cursor: pointer;
  padding: 0;
  margin-bottom: 1.5rem;
  transition: color 0.15s;
}
.back-btn:hover {
  color: var(--clay);
}
.back-arrow {
  margin-right: 0.3rem;
}

.path-header-active {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.path-icon-lg {
  font-size: 2.5rem;
  opacity: 0.6;
  line-height: 1;
}
.active-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--carbon);
  margin: 0 0 0.3rem;
}
.active-subtitle {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  margin: 0;
  line-height: 1.5;
}

/* ── Progress ──────────────────────────────────────────────────── */
.progress-bar-wrap {
  position: relative;
  height: 4px;
  background: var(--ink-05);
  border-radius: 2px;
  margin-bottom: 1rem;
}
.progress-bar {
  height: 100%;
  background: var(--clay);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.progress-label {
  position: absolute;
  right: 0;
  top: 8px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
}

/* ── Step dots ─────────────────────────────────────────────────── */
.step-dots {
  display: flex;
  gap: 6px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.step-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--ink-20);
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}
.step-dot.active {
  background: var(--clay);
  border-color: var(--clay);
  transform: scale(1.3);
}
.step-dot.visited {
  background: var(--ink-20);
  border-color: var(--ink-20);
}
.step-dot.is-recipe {
  border-radius: 2px;
}
.step-dot.is-exercise {
  border-radius: 2px;
  transform: rotate(45deg);
}
.step-dot.is-exercise.active {
  transform: rotate(45deg) scale(1.3);
}

/* ── Step card ─────────────────────────────────────────────────── */
.step-card {
  background: var(--parchment);
  border: 1px solid var(--ink-05);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.step-card.step-recipe {
  border-left: 3px solid var(--clay);
}
.step-card.step-exercise {
  border-left: 3px solid var(--sage);
}

.step-type-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--stone);
  margin-bottom: 0.5rem;
}
.step-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--carbon);
  margin: 0 0 0.75rem;
}
.step-content {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--ink);
  line-height: 1.7;
  margin: 0;
}

/* ── Tip callout ───────────────────────────────────────────────── */
.step-tip {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(122, 143, 110, 0.08);
  border-left: 3px solid var(--sage);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.tip-icon {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--sage);
  font-size: var(--text-lg);
  line-height: 1;
  flex-shrink: 0;
}
.step-tip p {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  margin: 0;
  line-height: 1.5;
}

/* ── Recipe preview ────────────────────────────────────────────── */
.step-recipe-preview {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ink-10);
}
.recipe-mini-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}
.recipe-mini-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--carbon);
}
.recipe-mini-cone {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.recipe-mini-ingredients {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}
.mini-ingredient {
  display: grid;
  grid-template-columns: 140px 1fr 45px;
  align-items: center;
  gap: 0.5rem;
}
.mini-ing-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini-ing-bar {
  height: 6px;
  background: var(--ink-05);
  border-radius: 3px;
  overflow: hidden;
}
.mini-ing-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--clay), rgba(196, 83, 42, 0.5));
  border-radius: 3px;
}
.mini-ing-pct {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  text-align: right;
}

/* ── Highlight oxides ──────────────────────────────────────────── */
.highlight-oxides {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.oxide-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--stone);
}
.oxide-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--clay-10);
  color: var(--clay);
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-sm);
}

.open-recipe-btn {
  background: none;
  border: 1px solid var(--clay-20);
  color: var(--clay);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  padding: 0.4rem 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.open-recipe-btn:hover {
  background: var(--clay);
  color: var(--chalk);
}

/* ── Step nav ──────────────────────────────────────────────────── */
.step-nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.nav-btn {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--ink-10);
  background: var(--parchment);
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.nav-btn:hover:not(:disabled) {
  border-color: var(--clay-20);
}
.nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.nav-btn-primary {
  background: var(--clay);
  color: var(--chalk);
  border-color: var(--clay);
}
.nav-btn-primary:hover:not(:disabled) {
  background: var(--carbon);
  border-color: var(--carbon);
}

/* ── Transitions ───────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Responsive ────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .learn-header {
    padding: 2.5rem 1.25rem 3rem;
  }
  .learn-layout {
    padding: 1.5rem 1rem 3rem;
  }
  .path-header-active {
    flex-direction: column;
    gap: 0.5rem;
  }
  .mini-ingredient {
    grid-template-columns: 100px 1fr 40px;
  }
}
</style>
