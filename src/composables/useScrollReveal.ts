import { onMounted, onUnmounted, type Ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export type RevealMode = 'fade' | 'slide' | 'scale'

interface RevealOptions {
  mode?: RevealMode
  delay?: number
  duration?: number
  stagger?: number
}

export function useScrollReveal(el: Ref<HTMLElement | null>, options: RevealOptions = {}) {
  const { mode = 'slide', delay = 0, duration = 0.7 } = options

  let trigger: ScrollTrigger | null = null

  const getFromVars = (m: RevealMode) => {
    if (m === 'fade') return { opacity: 0 }
    if (m === 'scale') return { opacity: 0, scale: 0.92 }
    return { opacity: 0, y: 30 }
  }

  const getToVars = () => ({
    opacity: 1,
    y: 0,
    scale: 1,
    duration,
    delay,
    ease: 'power2.out',
  })

  onMounted(() => {
    if (!el.value) return
    gsap.set(el.value, getFromVars(mode))
    trigger = ScrollTrigger.create({
      trigger: el.value,
      start: 'top 88%',
      onEnter: () => {
        gsap.to(el.value!, getToVars())
      },
      once: true,
    })
  })

  onUnmounted(() => {
    trigger?.kill()
  })
}

export function revealChildren(container: HTMLElement, mode: RevealMode = 'slide', stagger = 0.06) {
  const children = Array.from(container.children) as HTMLElement[]
  const fromVars = mode === 'fade' ? { opacity: 0 } : mode === 'scale' ? { opacity: 0, scale: 0.92 } : { opacity: 0, y: 24 }
  gsap.fromTo(children, fromVars, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    stagger,
    ease: 'power2.out',
  })
}
