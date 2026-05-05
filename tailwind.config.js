/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2ff',
          100: '#dde6ff',
          200: '#b3c4ff',
          300: '#809eff',
          400: '#4d74ff',
          500: '#1a4aff',
          600: '#0033e6',
          700: '#0028b3',
          800: '#001e80',
          900: '#00144d',
          950: '#000d33',
        },
      },
    },
  },
  plugins: [],
}
