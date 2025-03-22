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
          600: "#2563EB", // Azul mais escuro para hover
        },
        secondary: {
          500: "#10B981", // Verde secundário
        },
        neutral: {
          900: "#1F2937", // Cinza escuro
          100: "#F9FAFB", // Cinza claro
        },
        border: "#E5E7EB", // Cor da borda (usada pelo Shadcn UI)
        input: "#E5E7EB", // Cor do input
        ring: "#3B82F6", // Cor do anel de foco
        background: "#F9FAFB", // Cor de fundo (neutral-100)
        foreground: "#1F2937", // Cor do texto (neutral-900)
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
