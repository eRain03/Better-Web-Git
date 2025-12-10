/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 桌面背景 (暗室感觉)
        desk: '#1a1b1e',

        // 终端屏幕背景 (深黑带点红褐，模拟显像管关闭时的颜色)
        crt: {
          bg: '#1a1000',    // 极深的琥珀黑
          panel: '#2b1d00', // 稍微亮一点的面板
          border: '#4a3200' // 边框
        },

        // 终端文字 (经典的琥珀色)
        amber: {
          dim: '#8a6a2a',    // 暗淡 (未选中)
          DEFAULT: '#ffb000', // 标准发光
          bright: '#ffcc00',  // 高亮
        }
      },
      fontFamily: {
        // 使用真正的像素风格字体
        mono: ['"VT323"', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 10px rgba(255, 176, 0, 0.5)',
        'crt-casing': '0 0 0 10px #0a0a0a, 0 20px 50px rgba(0,0,0,0.8)',
      }
    },
  },
  plugins: [],
}