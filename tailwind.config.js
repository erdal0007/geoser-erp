/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef3ff',
          100: '#d9e4ff',
          200: '#b3c8ff',
          300: '#7fa4ff',
          400: '#4a75ff',
          500: '#1a47ff',
          600: '#0026f5',
          700: '#001bd4',
          800: '#0018ab',
          900: '#09111f',
          950: '#060b14',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
