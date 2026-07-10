import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          700: "#182e52",
          800: "#1a2332",
          900: "#0a1628",
        },
        gold: {
          400: "#d4a94e",
          500: "#c4943c",
          600: "#b38535",
        },
      },
    },
  },
  plugins: [],
};

export default config;
