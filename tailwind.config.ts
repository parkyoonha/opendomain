import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          menu: "#141414",
          topic: "#1e1e1e",
          main: "#2a2a2a",
          hover: "#363636",
        },
        border: {
          subtle: "#333333",
        },
        text: {
          primary: "#e8e8e8",
          secondary: "#a0a0a0",
          muted: "#6b6b6b",
        },
        accent: {
          fg: "#e8e8e8",
          bg: "#3a3a3a",
          blue: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
