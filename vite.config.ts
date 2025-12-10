import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 以前这里有一堆 polyfill 配置，现在全删掉，回归最纯粹的 Vue 配置
export default defineConfig({
  plugins: [vue()],
})