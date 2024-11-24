/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.html",
  ],
  theme: {
    extend: {
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [],
}