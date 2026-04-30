<script setup lang="ts">
import { gsap } from 'gsap'

function onEnter(el: Element, done: () => void) {
  gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto', onComplete: done })
}

function onLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, y: -8, duration: 0.25, ease: 'power2.in', overwrite: 'auto', onComplete: done })
}
</script>

<template>
  <Transition :css="false" mode="out-in" @enter="onEnter" @leave="onLeave">
    <slot />
  </Transition>
</template>
