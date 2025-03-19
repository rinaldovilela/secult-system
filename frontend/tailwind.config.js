/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: "#3B82F6", // Azul principal
          600: "#2563EB",
        },
        secondary: {
          500: "#10B981", // Verde secundário
        },
        neutral: {
          900: "#1F2937", // Cinza escuro
          100: "#F9FAFB", // Cinza claro
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
