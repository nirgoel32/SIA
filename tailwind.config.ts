import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS-variable-driven so [data-theme="light"] flips the whole palette.
        "museum-bg": "rgb(var(--museum-bg) / <alpha-value>)",
        "museum-bg-soft": "rgb(var(--museum-bg-soft) / <alpha-value>)",
        "museum-surface": "rgb(var(--museum-surface) / <alpha-value>)",
        "museum-border": "rgb(var(--museum-border) / <alpha-value>)",
        "museum-text": "rgb(var(--museum-text) / <alpha-value>)",
        "museum-muted": "rgb(var(--museum-muted) / <alpha-value>)",
        "museum-faint": "rgb(var(--museum-faint) / <alpha-value>)",
        gold: "rgb(var(--museum-gold) / <alpha-value>)",
        "gold-soft": "rgb(var(--museum-gold-soft) / <alpha-value>)",
        brick: "rgb(var(--museum-brick) / <alpha-value>)",
        // Legacy aliases — keep so existing markup still compiles cleanly.
        glow: "rgb(var(--museum-gold) / <alpha-value>)",
        accent: {
          cyan: "rgb(var(--museum-gold) / <alpha-value>)",
          violet: "rgb(var(--museum-brick) / <alpha-value>)",
          amber: "rgb(var(--museum-gold) / <alpha-value>)",
          emerald: "rgb(var(--museum-muted) / <alpha-value>)",
          rose: "rgb(var(--museum-brick) / <alpha-value>)",
          gold: "rgb(var(--museum-gold) / <alpha-value>)",
          brick: "rgb(var(--museum-brick) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        serif: ["Source Serif 4", "Source Serif Pro", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.22em",
        widest: "0.3em",
      },
    },
  },
  plugins: [],
};
export default config;
