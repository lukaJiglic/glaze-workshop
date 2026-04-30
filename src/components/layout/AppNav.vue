<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkshopStore } from '@/stores/workshop'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const workshopStore = useWorkshopStore()
const { theme, toggle: toggleTheme } = useTheme()
const scrolled = ref(false)
const menuOpen = ref(false)
const mobileMenuEl = ref<HTMLElement | null>(null)
const menuBtnEl = ref<HTMLElement | null>(null)

const favCount = computed(() => workshopStore.favoriteIds.length)

function onScroll() {
  scrolled.value = window.scrollY > 40
}

function onMenuKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    menuOpen.value = false
    menuBtnEl.value?.focus()
    return
  }
  if (e.key !== 'Tab' || !mobileMenuEl.value) return

  const focusable = mobileMenuEl.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled])'
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(menuOpen, async (open) => {
  if (open) {
    await nextTick()
    const firstLink = mobileMenuEl.value?.querySelector<HTMLElement>('a[href], button')
    firstLink?.focus()
  }
})

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const links = [
  { to: '/', label: 'Studio' },
  { to: '/workshop', label: 'Workshop' },
  { to: '/my-recipes', label: 'My Recipes' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/chemistry', label: 'Chemistry' },
  { to: '/colors', label: 'Color Atlas' },
  { to: '/learn', label: 'Learn' },
  { to: '/glossary', label: 'Glossary' },
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
        <li>
          <button class="nav-link theme-toggle" @click="toggleTheme" :title="theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
            {{ theme === 'light' ? '☽' : '☀' }}
          </button>
        </li>
      </ul>

      <button ref="menuBtnEl" class="nav-menu-btn" @click="menuOpen = !menuOpen" aria-label="Menu" :aria-expanded="menuOpen">
        <span /><span /><span />
      </button>
    </div>

    <!-- Mobile menu -->
    <Transition name="mobile-menu">
      <div v-if="menuOpen" ref="mobileMenuEl" class="mobile-menu" @keydown="onMenuKeydown">
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
          <li>
            <button class="mobile-link theme-toggle-mobile" @click="toggleTheme">
              {{ theme === 'light' ? '☽ Dark mode' : '☀ Light mode' }}
            </button>
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
  background: var(--cream-92);
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
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-5);
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
  background: var(--cream-97);
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

.theme-toggle {
  font-size: 0.95rem;
  line-height: 1;
  padding: 4px 8px;
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--clay-10);
  border-color: var(--clay);
  transform: scale(1.05);
  color: var(--clay) !important;
}

.theme-toggle-mobile {
  width: 100%;
  text-align: left;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--ink);
  border-bottom: 1px solid var(--ink-05);
  transition: color var(--transition-fast);
  cursor: pointer;
}

.theme-toggle-mobile:hover {
  color: var(--clay);
}

@media (max-width: 768px) {
  .nav-links { display: none; }
  .nav-menu-btn { display: flex; }
  .logo-text { font-size: var(--text-base); }
}
</style>
