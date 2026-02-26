/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Disable preflight to avoid conflicts with PatternFly
  corePlugins: {
    preflight: false,
  },
}
