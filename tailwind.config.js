/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 使用 Zinc 色系打造理性、冷淡的风格
        bg: '#09090b',       // 极深灰背景
        surface: '#18181b',  // 组件背景
        border: '#27272a',   // 边框
        text: {
          primary: '#e4e4e7',
          secondary: '#a1a1aa',
          muted: '#52525b'
        },
        accent: '#f4f4f5',   // 高亮白
        danger: '#ef4444',
        success: '#10b981'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}