import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        phosphor: {
          DEFAULT: "#00ff41",
          dim: "#a0c4a0",
          muted: "#5a7a5a",
          glow10: "rgba(0,255,65,0.10)",
          glow20: "rgba(0,255,65,0.20)",
        },
        amber: {
          DEFAULT: "#ffb000",
          dim: "#c49b40",
          glow10: "rgba(255,176,0,0.10)",
          glow20: "rgba(255,176,0,0.20)",
        },
        cyan: {
          DEFAULT: "#00e5ff",
          dim: "#60b0c0",
          glow10: "rgba(0,229,255,0.10)",
          glow20: "rgba(0,229,255,0.20)",
        },
        danger: {
          DEFAULT: "#ff3333",
          dim: "#c06060",
          glow10: "rgba(255,51,51,0.10)",
          glow20: "rgba(255,51,51,0.20)",
        },
        board: {
          light: "#1a2a1a",
          dark: "#0d1a0d",
        },
        surface: {
          DEFAULT: "#0a0a0a",
          panel: "#0d0f0d",
          raised: "#141814",
          border: "rgba(0,255,65,0.12)",
          "border-bright": "rgba(0,255,65,0.25)",
        },
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', "monospace"],
        display: ['"Orbitron"', "sans-serif"],
      },
      spacing: {
        touch: "44px",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "crt-on": "crt-on 0.5s ease-out forwards",
        "boot-line": "boot-line 0.6s ease-out forwards",
        "type-cursor": "type-cursor 1s step-end infinite",
        "data-stream": "data-stream 1.5s ease-in-out infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "crt-on": {
          "0%": { opacity: "0", transform: "scaleY(0.01)" },
          "40%": { opacity: "0.6", transform: "scaleY(1.04)" },
          "100%": { opacity: "1", transform: "scaleY(1)" },
        },
        "boot-line": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "type-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "data-stream": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      boxShadow: {
        phosphor: "0 0 10px rgba(0,255,65,0.3), 0 0 20px rgba(0,255,65,0.1)",
        amber: "0 0 10px rgba(255,176,0,0.3), 0 0 20px rgba(255,176,0,0.1)",
        cyan: "0 0 10px rgba(0,229,255,0.3), 0 0 20px rgba(0,229,255,0.1)",
        danger: "0 0 10px rgba(255,51,51,0.3), 0 0 20px rgba(255,51,51,0.1)",
        crt: "inset 0 0 60px rgba(0,255,65,0.03), 0 0 20px rgba(0,255,65,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
