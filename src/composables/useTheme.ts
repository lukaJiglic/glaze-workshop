import { watch } from 'vue'
import { useStorage } from '@vueuse/core'

export type Theme = 'light' | 'dark'

const theme = useStorage<Theme>('glaze-theme', 'light')

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

// Watch for changes and apply
watch(theme, applyTheme, { immediate: true })

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return {
    theme,
    toggle,
  }
}
