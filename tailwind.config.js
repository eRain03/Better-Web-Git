/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 强制所有文本使用等宽字体，营造极客感
        sans: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // 界面背景：深沉，但不死黑
        bg: '#09090b',
        // 侧边栏/面板背景
        surface: '#18181b',
        // 边框颜色：微妙的分割线
        border: '#27272a',
        // 交互元素背景
        element: '#27272a',
        // 文本颜色
        text: {
          main: '#e4e4e7',    // 主要文字 (亮灰)
          dim: '#a1a1aa',     // 次要文字 (暗灰)
          mute: '#52525b',    // 注释/低优先级 (深灰)
        },
        // 强调色：冷静的蓝色/青色，或者你喜欢的任何颜色
        accent: {
          DEFAULT: '#ffffff', // 极致的白作为高亮
          dim: 'rgba(255,255,255,0.1)'
        },
        // 状态色
        git: {
          added: '#4ade80',   // 绿色
          removed: '#f87171', // 红色
          modified: '#fbbf24' // 黄色
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}