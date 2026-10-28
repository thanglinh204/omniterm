/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0f1117",
          secondary: "#161922",
          tertiary: "#1e2230",
          card: "#181b26",
          border: "#282d3f",
        },
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          light: "#60a5fa",
        },
        terminal: {
          bg: "#0d0f15",
          fg: "#e2e8f0",
          selection: "#334155",
        }
      },
      fontFamily: {
        mono: [
          "Cascadia Code",
          "Fira Code",
          "JetBrains Mono",
          "Consolas",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
}
