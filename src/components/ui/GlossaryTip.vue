<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { glossary } from '@/data/glossary'

const props = defineProps<{
  term: string
}>()

const entry = computed(() => glossary.get(props.term.toLowerCase()))

const isVisible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const position = ref<'above' | 'below'>('above')
const tooltipStyle = ref<Record<string, string>>({})

let hideTimeout: ReturnType<typeof setTimeout> | null = null

function show() {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  isVisible.value = true
  nextTick(updatePosition)
}

function hide() {
  hideTimeout = setTimeout(() => {
    isVisible.value = false
  }, 120)
}

function toggle() {
  if (isVisible.value) {
    isVisible.value = false
  } else {
    show()
  }
}

function updatePosition() {
  if (!triggerRef.value || !tooltipRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  // Decide above or below
  const spaceAbove = triggerRect.top
  const spaceBelow = viewportHeight - triggerRect.bottom

  if (spaceAbove < tooltipRect.height + 12 && spaceBelow > spaceAbove) {
    position.value = 'below'
  } else {
    position.value = 'above'
  }

  // Horizontal centering with viewport clamping
  const triggerCenter = triggerRect.left + triggerRect.width / 2
  let left = triggerCenter - tooltipRect.width / 2
  const margin = 8

  if (left < margin) left = margin
  if (left + tooltipRect.width > viewportWidth - margin) {
    left = viewportWidth - margin - tooltipRect.width
  }

  const style: Record<string, string> = {
    left: `${left}px`,
  }

  if (position.value === 'above') {
    style.top = `${triggerRect.top - tooltipRect.height - 8}px`
  } else {
    style.top = `${triggerRect.bottom + 8}px`
  }

  tooltipStyle.value = style
}

function onScroll() {
  if (isVisible.value) updatePosition()
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<template>
  <span
    v-if="entry"
    ref="triggerRef"
    class="glossary-trigger"
    @mouseenter="show"
    @mouseleave="hide"
    @click.stop="toggle"
    @keydown.enter.prevent="toggle"
    tabindex="0"
    role="button"
    :aria-label="`Learn about ${entry.term}`"
  >
    <slot>{{ entry.term }}</slot>
    <span class="glossary-indicator" aria-hidden="true">?</span>

    <Teleport to="body">
      <Transition name="glossary-tooltip">
        <div
          v-if="isVisible"
          ref="tooltipRef"
          class="glossary-tooltip"
          :class="[`glossary-tooltip--${position}`]"
          :style="tooltipStyle"
          role="tooltip"
          @mouseenter="show"
          @mouseleave="hide"
        >
          <div class="glossary-tooltip__arrow" />
          <h4 class="glossary-tooltip__title">{{ entry.term }}</h4>
          <p class="glossary-tooltip__body">{{ entry.plain }}</p>
          <p v-if="entry.analogy" class="glossary-tooltip__analogy">{{ entry.analogy }}</p>
          <p class="glossary-tooltip__note">{{ entry.whyItMatters }}</p>
        </div>
      </Transition>
    </Teleport>
  </span>
  <slot v-else />
</template>

<style scoped>
.glossary-trigger {
  position: relative;
  cursor: help;
  border-bottom: 1.5px dotted rgba(139, 115, 85, 0.6);
  text-decoration: none;
  display: inline;
}

.glossary-trigger:hover,
.glossary-trigger:focus-visible {
  border-bottom-color: var(--clay);
}

.glossary-trigger:focus-visible {
  outline: 2px solid var(--clay-20);
  outline-offset: 2px;
  border-radius: 2px;
}

.glossary-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: 2px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  color: var(--stone);
  background: var(--ink-05);
  border-radius: var(--radius-full);
  vertical-align: super;
  position: relative;
  top: -1px;
}

.glossary-trigger:hover .glossary-indicator {
  color: var(--chalk);
  background: var(--clay);
}
</style>

<style>
/* Tooltip styles are unscoped because they render in a Teleport */
.glossary-tooltip {
  position: fixed;
  z-index: 500;
  max-width: 320px;
  padding: 14px 16px 12px;
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
}

.glossary-tooltip__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  transform: rotate(45deg);
  left: calc(50% - 5px);
}

.glossary-tooltip--above .glossary-tooltip__arrow {
  bottom: -6px;
  border-top: none;
  border-left: none;
}

.glossary-tooltip--below .glossary-tooltip__arrow {
  top: -6px;
  border-bottom: none;
  border-right: none;
}

.glossary-tooltip__title {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--clay);
  margin: 0 0 6px 0;
  line-height: 1.3;
}

.glossary-tooltip__body {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--ink);
  margin: 0 0 6px 0;
  line-height: 1.55;
}

.glossary-tooltip__analogy {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--stone);
  margin: 0 0 6px 0;
  line-height: 1.5;
}

.glossary-tooltip__note {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark);
  margin: 0;
  line-height: 1.5;
  padding-top: 4px;
  border-top: 1px solid var(--ink-05);
}

/* Transition */
.glossary-tooltip-enter-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.glossary-tooltip-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}
.glossary-tooltip-enter-from,
.glossary-tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.glossary-tooltip-enter-to,
.glossary-tooltip-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
