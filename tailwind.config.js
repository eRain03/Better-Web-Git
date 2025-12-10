/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        page: '#f8fafc',      // 极浅灰背景
        card: '#ffffff',      // 卡片白
        border: '#e2e8f0',    // 边框灰
        txt: {
          main: '#0f172a',    // 深黑
          sub: '#64748b',     // 次级灰
        },
        brand: '#4f46e5',     // 靛蓝
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}