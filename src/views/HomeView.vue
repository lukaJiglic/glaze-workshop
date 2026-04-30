<script setup lang="ts">
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useGlazeStore } from '@/stores/glaze'
import { useWorkshopStore } from '@/stores/workshop'
import HeroSection from '@/components/home/HeroSection.vue'
import FamilyPreviewGrid from '@/components/home/FamilyPreviewGrid.vue'
import RecipeCard from '@/components/recipe/RecipeCard.vue'

const store = useGlazeStore()
const workshopStore = useWorkshopStore()

const recentRecipes = computed(() =>
  workshopStore.recentlyViewed
    .map(id => store.recipeById.get(id))
    .filter(Boolean) as ReturnType<typeof store.recipeById.get>[]
)

const stats = computed(() => [
  { value: store.recipes.length, label: 'Recipes', suffix: '+' },
  { value: store.colorProfiles.length, label: 'Color profiles', suffix: '' },
  { value: store.families.length, label: 'Glaze families', suffix: '' },
])

// Onboarding — show for first-time visitors
const onboardingDismissed = useStorage('glaze-onboarding-dismissed', false)
const showOnboarding = computed(() =>
  !onboardingDismissed.value &&
  workshopStore.recentlyViewed.length === 0 &&
  workshopStore.favoriteIds.length === 0
)
</script>

<template>
  <div class="home-view">
    <HeroSection />

    <!-- Onboarding for first-time visitors -->
    <section v-if="showOnboarding" class="onboarding" v-reveal.fade>
      <div class="onboarding-inner">
        <button class="onboarding-dismiss" @click="onboardingDismissed = true">×</button>
        <h2 class="onboarding-title">New here?</h2>
        <p class="onboarding-text">
          This is a glaze recipe reference for ceramics. Start by browsing a glaze family below,
          or jump straight into the Workshop to search and filter all recipes.
        </p>
        <div class="onboarding-links">
          <RouterLink to="/workshop" class="btn btn-primary">Open the Workshop</RouterLink>
          <RouterLink to="/colors" class="btn btn-secondary">Explore Colors</RouterLink>
        </div>
      </div>
    </section>

    <!-- Stats band -->
    <div ref="statsEl" class="stats-band" v-reveal>
      <div class="stats-inner">
        <div v-for="stat in stats" :key="stat.label" class="stat-item">
          <span class="stat-value">{{ stat.value }}{{ stat.suffix }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Family preview -->
    <FamilyPreviewGrid />

    <!-- Features section -->
    <section class="features-section">
      <div class="features-inner">
        <div class="feature-card" v-reveal.slide="{ delay: 0 }">
          <div class="feature-icon">⚗</div>
          <h3>Recipe Workshop</h3>
          <p>Filter 300+ recipes by cone, atmosphere, color, and surface. Full ingredient lists with visual scoring.</p>
          <RouterLink to="/workshop" class="feature-link">Open Workshop →</RouterLink>
        </div>
        <div class="feature-card" v-reveal.slide="{ delay: 0.1 }">
          <div class="feature-icon">⚖</div>
          <h3>Batch Calculator</h3>
          <p>Scale any recipe to your batch size. Animated weight display updates in real time as you type.</p>
          <RouterLink to="/calculator" class="feature-link">Open Calculator →</RouterLink>
        </div>
        <div class="feature-card" v-reveal.slide="{ delay: 0.2 }">
          <div class="feature-icon">◉</div>
          <h3>Color Atlas</h3>
          <p>Explore all 50+ color profiles as visual swatch cards with gloss, opacity, and variation scores.</p>
          <RouterLink to="/colors" class="feature-link">Open Atlas →</RouterLink>
        </div>
        <div class="feature-card" v-reveal.slide="{ delay: 0.3 }">
          <div class="feature-icon">✎</div>
          <h3>My Recipes</h3>
          <p>Create your own recipes with ingredient sliders, live change-impact feedback, and substitution hints.</p>
          <RouterLink to="/my-recipes" class="feature-link">My Recipes →</RouterLink>
        </div>
        <div class="feature-card" v-reveal.slide="{ delay: 0.4 }">
          <div class="feature-icon">⚕</div>
          <h3>Troubleshooter</h3>
          <p>Crazing, crawling, pinholes? Tap a symptom and walk through causes and fixes step by step.</p>
          <RouterLink to="/troubleshooter" class="feature-link">Get Help →</RouterLink>
        </div>
      </div>
    </section>

    <!-- Custom recipes in progress -->
    <section v-if="workshopStore.customRecipes.length" class="custom-banner" v-reveal.fade>
      <div class="custom-banner-inner">
        <span class="custom-icon">✎</span>
        <p class="custom-text">
          You have <strong>{{ workshopStore.customRecipes.length }}</strong> custom recipe{{ workshopStore.customRecipes.length !== 1 ? 's' : '' }} in progress.
        </p>
        <RouterLink to="/my-recipes" class="custom-link">Continue editing →</RouterLink>
      </div>
    </section>

    <!-- Recently viewed -->
    <section v-if="recentRecipes.length" class="recent-section">
      <div class="recent-inner">
        <div class="recent-heading" v-reveal.fade>
          <h2 class="recent-title">Recently Viewed</h2>
          <RouterLink to="/favorites" class="recent-link">♥ View saved →</RouterLink>
        </div>
        <div class="recent-scroll">
          <RecipeCard
            v-for="(recipe, i) in recentRecipes"
            :key="recipe!.id"
            :recipe="recipe!"
            v-reveal.slide="{ delay: i * 0.05 }"
          />
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="home-footer">
      <p class="footer-text">Built with Vue 3, Pinia, GSAP + a deep love for ceramics.</p>
    </footer>
  </div>
</template>

<style scoped>
.home-view {
  background: var(--cream);
}

.stats-band {
  background: var(--band);
  padding: var(--space-10) var(--space-8);
}

.stats-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  justify-content: center;
  gap: var(--space-20);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.stat-value {
  font-family: var(--font-display);
  font-size: var(--text-5xl);
  font-weight: 700;
  color: var(--on-band);
  line-height: 1;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--stone-light);
}

.features-section {
  background: var(--parchment);
  padding: var(--space-20) var(--space-8);
  clip-path: polygon(0 40px, 100% 0, 100% 100%, 0 100%);
  margin-top: -40px;
}

.features-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-6);
  padding-top: var(--space-6);
}

.feature-card {
  background: var(--chalk);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border: 1px solid var(--ink-10);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  font-size: 2rem;
  color: var(--clay);
  line-height: 1;
}

.feature-card h3 {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--carbon);
}

.feature-card p {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--stone);
  line-height: 1.6;
  flex: 1;
}

.feature-link {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--clay);
  letter-spacing: 0.04em;
  transition: color var(--transition-fast);
}

.feature-link:hover { color: var(--clay-dark); }

/* Onboarding */
.onboarding {
  padding: var(--space-6) var(--space-8);
  max-width: var(--content-max);
  margin: 0 auto;
}

.onboarding-inner {
  position: relative;
  background: var(--chalk);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-8);
  border: 1px solid var(--ink-10);
  border-left: 4px solid var(--clay);
}

.onboarding-dismiss {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: 28px;
  height: 28px;
  border: none;
  background: var(--parchment);
  border-radius: var(--radius-full);
  font-size: 16px;
  color: var(--stone);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.onboarding-dismiss:hover {
  background: var(--clay-10);
  color: var(--clay);
}

.onboarding-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--carbon);
  margin-bottom: var(--space-2);
}

.onboarding-text {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--stone);
  line-height: 1.6;
  max-width: 520px;
  margin-bottom: var(--space-4);
}

.onboarding-links {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.custom-banner {
  padding: var(--space-6) var(--space-8);
  border-top: 1px solid var(--ink-10);
}

.custom-banner-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-left: 3px solid var(--clay);
  border-radius: var(--radius-md);
}

.custom-icon {
  font-size: 1.2rem;
  color: var(--clay);
}

.custom-text {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  flex: 1;
}

.custom-text strong {
  font-family: var(--font-mono);
  color: var(--clay);
}

.custom-link {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--clay);
  text-decoration: none;
  white-space: nowrap;
}

.custom-link:hover { color: var(--clay-dark); }

.recent-section {
  background: var(--cream);
  padding: var(--space-16) var(--space-8);
  border-top: 1px solid var(--ink-10);
}

.recent-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.recent-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.recent-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--carbon);
}

.recent-link {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--clay);
  letter-spacing: 0.04em;
  transition: color var(--transition-fast);
}

.recent-link:hover { color: var(--clay-dark); }

.recent-scroll {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}

.home-footer {
  background: var(--cream);
  padding: var(--space-10) var(--space-8);
  text-align: center;
  border-top: 1px solid var(--ink-10);
}

.footer-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone);
  letter-spacing: 0.04em;
}
</style>
