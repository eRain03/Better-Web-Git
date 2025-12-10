/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // 优雅的冷灰背景
        page: '#f8fafc',      // Slate-50
        surface: '#ffffff',   // White
        border: '#e2e8f0',    // Slate-200

        // 文字层级
        txt: {
          primary: '#0f172a', // Slate-900 (深邃黑)
          secondary: '#64748b', // Slate-500 (高级灰)
          muted: '#94a3b8',   // Slate-400
        },

        // 品牌色：克制的靛蓝
        brand: {
          light: '#e0e7ff',   // Indigo-100
          DEFAULT: '#4f46e5', // Indigo-600
          hover: '#4338ca',   // Indigo-700
        },

        // 功能色
        diff: {
          add: '#dcfce7',     // Green-100
          addText: '#166534', // Green-800
          del: '#fee2e2',     // Red-100
          delText: '#991b1b', // Red-800
        }
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      }
    },
  },
  plugins: [],
}