/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1B3C",
          50: "#EEF0F7",
          100: "#D8DCEC",
          200: "#B2BADA",
          300: "#8A94C2",
          400: "#5C68A0",
          500: "#37417A",
          600: "#232D5F",
          700: "#18224A",
          800: "#121A3A",
          900: "#0F1B3C",
          950: "#090F26",
        },
        vault: {
          cyan: "#22D9CE",
          cyanDark: "#0FB8AE",
          amber: "#E8A93B",
          coral: "#E2584C",
          leaf: "#33B27A",
        },
        paper: "#F5F7FB",
        line: "#DFE3EE",
        slateink: "#3C4560",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,60,0.06), 0 8px 24px -12px rgba(15,27,60,0.12)",
        pop: "0 12px 32px -8px rgba(15,27,60,0.28)",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(34,217,206,0.45)" },
          "70%": { boxShadow: "0 0 0 10px rgba(34,217,206,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34,217,206,0)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2.2s ease-out infinite",
        fadeUp: "fadeUp 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
