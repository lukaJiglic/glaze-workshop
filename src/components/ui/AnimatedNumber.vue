<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps<{
  value: number
  decimals?: number
  suffix?: string
  duration?: number
}>()

const displayed = ref(0)
const elRef = ref<HTMLSpanElement | null>(null)

function animateTo(target: number) {
  gsap.to(displayed, {
    value: target,
    duration: props.duration ?? 0.6,
    ease: 'power2.out',
    onUpdate: () => {
      displayed.value = Number(displayed.value.toFixed(props.decimals ?? 1))
    },
  })
}

onMounted(() => animateTo(props.value))

watch(() => props.value, (val) => animateTo(val))
</script>

<template>
  <span ref="elRef" class="animated-number">
    {{ displayed.toFixed(decimals ?? 1) }}{{ suffix ?? '' }}
  </span>
</template>

<style scoped>
.animated-number {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
</style>
