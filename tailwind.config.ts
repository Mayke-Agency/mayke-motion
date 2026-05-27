import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./modules/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#14110f",
        oxblood: "#733038",
        espresso: "#241915",
        ivory: "#fbf8f2",
        sand: "#e8dfd2",
        taupe: "#6e6259",
        stone: "#d5d0c8",
        metal: "#b89a72"
      },
      fontFamily: {
        sans: ["Avenir Next", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"]
      },
      borderRadius: {
        mayke: "6px"
      }
    }
  }
};

export default config;
