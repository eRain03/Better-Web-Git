import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// ---------------------------------------------------------
// Environment Polyfills (Critical for isomorphic-git)
// ---------------------------------------------------------
import { Buffer } from 'buffer'
import process from 'process'

// 挂载到全局对象
window.Buffer = Buffer
window.process = process

const app = createApp(App)
app.mount('#app')