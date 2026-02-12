import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#F5F0E8",
        ink: "#3B2F2F",
        rust: "#C75B12",
        leather: "#8B7355",
        aged: "#D4C4B0",
      },
      fontFamily: {
        heading: ["var(--font-roboto-slab)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        journal: "2px 2px 8px rgba(59, 47, 47, 0.08), inset 0 0 0 1px rgba(139, 115, 85, 0.2)",
        stamp: "inset 0 0 20px rgba(199, 91, 18, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
