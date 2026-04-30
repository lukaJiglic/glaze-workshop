import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { defineAsyncComponent } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: defineAsyncComponent(() => import('@/views/HomeView.vue')),
    meta: { title: 'Glaze Workshop' },
  },
  {
    path: '/workshop',
    name: 'workshop',
    component: defineAsyncComponent(() => import('@/views/RecipeWorkshopView.vue')),
    meta: { title: 'Recipe Workshop' },
  },
  {
    path: '/calculator',
    name: 'calculator',
    component: defineAsyncComponent(() => import('@/views/CalculatorView.vue')),
    meta: { title: 'Batch Calculator' },
  },
  {
    path: '/colors',
    name: 'colors',
    component: defineAsyncComponent(() => import('@/views/ColorAtlasView.vue')),
    meta: { title: 'Color Atlas' },
  },
  {
    path: '/my-recipes',
    name: 'my-recipes',
    component: defineAsyncComponent(() => import('@/views/MyRecipesView.vue')),
    meta: { title: 'My Recipes' },
  },
  {
    path: '/my-recipes/:id',
    name: 'recipe-editor',
    component: defineAsyncComponent(() => import('@/views/RecipeEditorView.vue')),
    meta: { title: 'Edit Recipe' },
  },
  {
    path: '/chemistry',
    name: 'chemistry',
    component: defineAsyncComponent(() => import('@/views/ChemistryExplorerView.vue')),
    meta: { title: 'Chemistry Explorer' },
  },
  {
    path: '/learn',
    name: 'learn',
    component: defineAsyncComponent(() => import('@/views/LearnView.vue')),
    meta: { title: 'Learn' },
  },
  {
    path: '/glossary',
    name: 'glossary',
    component: defineAsyncComponent(() => import('@/views/GlossaryView.vue')),
    meta: { title: 'Glossary' },
  },
  {
    path: '/troubleshooter',
    name: 'troubleshooter',
    component: defineAsyncComponent(() => import('@/views/TroubleshooterView.vue')),
    meta: { title: 'Troubleshooter' },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: defineAsyncComponent(() => import('@/views/FavoritesView.vue')),
    meta: { title: 'Saved Recipes' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_, __, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

// Guard: redirect to /my-recipes if recipe doesn't exist
router.beforeEach((to) => {
  if (to.name === 'recipe-editor' && to.params.id) {
    const ws = useWorkshopStore()
    const exists = ws.customRecipes.some(r => r.id === to.params.id)
    if (!exists) return { name: 'my-recipes' }
  }
})

router.afterEach((to) => {
  const title = to.meta?.title as string | undefined
  document.title = title ? `${title} — Glaze Workshop` : 'Glaze Workshop'
})

export default router
