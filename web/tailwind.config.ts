import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          light: "#f0d9b5",
          dark: "#b58863",
          highlight: "#aef45a",
          hint: "#f6f669",
        },
        surface: {
          DEFAULT: "#18181b",
          darker: "#09090b",
          lighter: "#27272a",
        },
        border: {
          DEFAULT: "#27272a",
          lighter: "#3f3f46",
        },
        accent: {
          DEFAULT: "#f59e0b",
          hover: "#fbbf24",
          muted: "rgba(245,158,11,0.1)",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      spacing: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
