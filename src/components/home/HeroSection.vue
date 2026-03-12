<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const orb = ref<HTMLElement | null>(null)
const layer1 = ref<HTMLElement | null>(null)
const layer2 = ref<HTMLElement | null>(null)
const layer3 = ref<HTMLElement | null>(null)
const textEl = ref<HTMLElement | null>(null)

onMounted(() => {
  const tl = gsap.timeline()

  // Text reveal
  tl.fromTo(
    textEl.value?.querySelectorAll('.reveal-line') ?? [],
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out' },
    0.3
  )

  // Orb layer animations
  if (layer1.value) {
    gsap.to(layer1.value, { rotation: 360, duration: 18, ease: 'none', repeat: -1 })
  }
  if (layer2.value) {
    gsap.to(layer2.value, { rotation: -360, duration: 24, ease: 'none', repeat: -1 })
  }
  if (layer3.value) {
    gsap.to(layer3.value, { rotation: 360, duration: 32, ease: 'none', repeat: -1, scale: 1.08, yoyo: true })
  }

  // Orb entrance
  if (orb.value) {
    gsap.fromTo(orb.value, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'back.out(1.7)', delay: 0.1 })

    // Scroll: scale down orb
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: '400px top',
      scrub: 1,
      onUpdate: (self) => {
        if (orb.value) {
          gsap.set(orb.value, { scale: 1 - self.progress * 0.25, opacity: 1 - self.progress * 0.4 })
        }
      },
    })
  }
})
</script>

<template>
  <section class="hero">
    <!-- Animated glaze orb -->
    <div ref="orb" class="hero-orb" aria-hidden="true">
      <div ref="layer1" class="orb-layer layer-1" />
      <div ref="layer2" class="orb-layer layer-2" />
      <div ref="layer3" class="orb-layer layer-3" />
      <div class="orb-core" />
    </div>

    <!-- Text content -->
    <div ref="textEl" class="hero-text">
      <p class="hero-eyebrow reveal-line label-upper">A living glaze reference</p>
      <h1 class="hero-title">
        <span class="reveal-line">Glaze</span>
        <span class="reveal-line italic-accent">Workshop</span>
      </h1>
      <p class="hero-subtitle reveal-line">
        300+ recipes. Every surface, cone, and atmosphere.<br>
        Search, filter, scale, and explore the full ceramic colour palette.
      </p>
      <div class="hero-actions reveal-line">
        <RouterLink to="/workshop" class="btn btn-primary">Open Workshop</RouterLink>
        <RouterLink to="/colors" class="btn btn-ghost">Color Atlas</RouterLink>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="scroll-hint" aria-hidden="true">
      <span class="scroll-line" />
      <span class="scroll-label label-upper">Scroll</span>
    </div>
  </section>
</template>

<style scoped>
.hero {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-12);
}

/* Glaze Orb */
.hero-orb {
  position: absolute;
  width: 560px;
  height: 560px;
  top: 50%;
  right: -60px;
  transform: translateY(-50%);
  filter: blur(0px);
}

.orb-layer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  transform-origin: center;
}

.layer-1 {
  background: radial-gradient(ellipse at 40% 40%, #f5f0e8 0%, #c4532a 40%, #7a8f6e 70%, #2c2416 100%);
  opacity: 0.9;
}

.layer-2 {
  inset: 10%;
  background: radial-gradient(ellipse at 60% 30%, rgba(245,240,232,0.8) 0%, rgba(122,143,110,0.6) 50%, rgba(196,83,42,0.4) 100%);
  mix-blend-mode: overlay;
}

.layer-3 {
  inset: 25%;
  background: radial-gradient(circle, rgba(250,248,244,0.9) 0%, rgba(237,230,214,0.5) 60%, transparent 100%);
  mix-blend-mode: screen;
}

.orb-core {
  position: absolute;
  inset: 38%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--chalk) 0%, rgba(250,248,244,0.6) 100%);
  box-shadow: 0 0 60px rgba(245,240,232,0.8), 0 0 120px rgba(196,83,42,0.15);
}

/* Hero text */
.hero-text {
  position: relative;
  z-index: 2;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-right: var(--space-8);
}

.hero-eyebrow {
  color: var(--clay);
  letter-spacing: 0.12em;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 7vw, 5.5rem);
  font-weight: 700;
  line-height: 1.0;
  color: var(--carbon);
  display: flex;
  flex-direction: column;
}

.hero-subtitle {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  color: var(--stone);
  line-height: 1.65;
  max-width: 460px;
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

/* Scroll hint */
.scroll-hint {
  position: absolute;
  bottom: var(--space-8);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  opacity: 0.5;
  animation: scroll-bob 2s ease-in-out infinite;
}

.scroll-line {
  display: block;
  width: 1px;
  height: 32px;
  background: var(--stone);
}

.scroll-label {
  font-size: 10px;
  color: var(--stone);
}

@keyframes scroll-bob {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(6px); }
}

@media (max-width: 900px) {
  .hero-orb {
    width: 360px;
    height: 360px;
    right: -80px;
    opacity: 0.5;
  }
  .hero-text { padding-right: 0; }
}

@media (max-width: 600px) {
  .hero-orb { display: none; }
  .hero { justify-content: flex-start; padding-top: calc(var(--nav-height) + var(--space-16)); }
}
</style>
