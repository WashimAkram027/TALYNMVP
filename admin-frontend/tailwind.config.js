/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        "primary-hover": "#4338CA",
        "primary-light": "#EEF2FF",
        accent: "#0EA5E9",
        "accent-hover": "#0284C7",
        sidebar: "#1E1B4B",
        "sidebar-hover": "#312E81",
        "sidebar-active": "#4338CA",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        "bg-main": "#F8FAFC",
        "bg-card": "#FFFFFF",
        "text-primary": "#0F172A",
        "text-secondary": "#64748B",
        "border-main": "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
