import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { vReveal } from './directives/vReveal'
import App from './App.vue'

import './assets/styles/variables.css'
import './assets/styles/base.css'
import './assets/styles/typography.css'
import './assets/styles/texture.css'
import './assets/styles/animations.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.directive('reveal', vReveal)

app.mount('#app')
