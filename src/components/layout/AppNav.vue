<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkshopStore } from '@/stores/workshop'

const route = useRoute()
const workshopStore = useWorkshopStore()
const scrolled = ref(false)
const menuOpen = ref(false)

const favCount = computed(() => workshopStore.favoriteIds.length)

function onScroll() {
  scrolled.value = window.scrollY > 40
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const links = [
  { to: '/', label: 'Studio' },
  { to: '/workshop', label: 'Workshop' },
  { to: '/my-recipes', label: 'My Recipes' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/colors', label: 'Color Atlas' },
  { to: '/troubleshooter', label: 'Help' },
]
</script>

<template>
  <nav class="app-nav" :class="{ scrolled, 'menu-open': menuOpen }">
    <div class="nav-inner">
      <RouterLink to="/" class="nav-logo">
        <span class="logo-mark">◈</span>
        <span class="logo-text">Glaze Workshop</span>
      </RouterLink>

      <ul class="nav-links">
        <li v-for="link in links" :key="link.to">
          <RouterLink
            :to="link.to"
            class="nav-link"
            :class="{ active: route.path === link.to }"
          >
            {{ link.label }}
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/favorites"
            class="nav-link nav-fav"
            :class="{ active: route.path === '/favorites' }"
          >
            <span class="fav-heart">♥</span>
            <span v-if="favCount > 0" class="fav-count">{{ favCount }}</span>
          </RouterLink>
        </li>
      </ul>

      <button class="nav-menu-btn" @click="menuOpen = !menuOpen" aria-label="Menu">
        <span /><span /><span />
      </button>
    </div>

    <!-- Mobile menu -->
    <Transition name="mobile-menu">
      <div v-if="menuOpen" class="mobile-menu">
        <ul>
          <li v-for="link in links" :key="link.to">
            <RouterLink :to="link.to" class="mobile-link" @click="menuOpen = false">
              {{ link.label }}
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/favorites" class="mobile-link" @click="menuOpen = false">
              ♥ Saved{{ favCount > 0 ? ` (${favCount})` : '' }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </Transition>
  </nav>
</template>

<style scoped>
.app-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-nav);
  transition: background var(--transition-base), box-shadow var(--transition-base);
}

.app-nav.scrolled {
  background: rgba(245, 240, 232, 0.92);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 var(--ink-10), var(--shadow-sm);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--nav-height);
  padding: 0 var(--space-8);
  max-width: var(--content-max);
  margin: 0 auto;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
}

.logo-mark {
  font-size: 1.4rem;
  color: var(--clay);
  line-height: 1;
}

.logo-text {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--carbon);
  letter-spacing: -0.01em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  list-style: none;
}

.nav-link {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  letter-spacing: 0.04em;
  color: var(--stone);
  text-decoration: none;
  position: relative;
  transition: color var(--transition-fast);
  padding-bottom: 2px;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--clay);
  transition: width var(--transition-base);
  border-radius: 1px;
}

.nav-link:hover,
.nav-link.active {
  color: var(--clay);
}

.nav-link.active::after,
.nav-link:hover::after {
  width: 100%;
}

.nav-fav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
}

.fav-heart {
  font-size: 1rem;
  color: var(--clay);
  transition: transform var(--transition-fast);
}

.nav-fav:hover .fav-heart { transform: scale(1.2); }

.fav-count {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--clay);
  color: white;
  border-radius: var(--radius-full);
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-weight: 700;
}

.nav-menu-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
}

.nav-menu-btn span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--ink);
  border-radius: 1px;
  transition: transform var(--transition-base), opacity var(--transition-base);
}

.mobile-menu {
  background: rgba(245, 240, 232, 0.97);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--ink-10);
  padding: var(--space-4) var(--space-8) var(--space-6);
}

.mobile-link {
  display: block;
  padding: var(--space-3) 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--ink);
  border-bottom: 1px solid var(--ink-05);
  transition: color var(--transition-fast);
}

.mobile-link:hover {
  color: var(--clay);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .nav-links { display: none; }
  .nav-menu-btn { display: flex; }
  .logo-text { font-size: var(--text-base); }
}
</style>
