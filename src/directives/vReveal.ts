import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { DirectiveBinding } from 'vue'

gsap.registerPlugin(ScrollTrigger)

type RevealModifier = 'slide' | 'fade' | 'scale'

interface RevealValue {
  delay?: number
  duration?: number
}

function getFromVars(mode: RevealModifier) {
  if (mode === 'fade') return { opacity: 0 }
  if (mode === 'scale') return { opacity: 0, scale: 0.9, transformOrigin: 'center bottom' }
  return { opacity: 0, y: 32 }
}

export const vReveal = {
  mounted(el: HTMLElement, binding: DirectiveBinding<RevealValue | undefined>) {
    const mode: RevealModifier =
      'slide' in (binding.modifiers ?? {}) ? 'slide' :
      'fade' in (binding.modifiers ?? {}) ? 'fade' :
      'scale' in (binding.modifiers ?? {}) ? 'scale' : 'slide'

    const delay = binding.value?.delay ?? 0
    const duration = binding.value?.duration ?? 0.65

    gsap.set(el, getFromVars(mode))

    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration,
          delay,
          ease: 'power2.out',
        })
      },
      once: true,
    })
  },
  unmounted(el: HTMLElement) {
    ScrollTrigger.getAll()
      .filter(t => t.trigger === el)
      .forEach(t => t.kill())
  },
}
