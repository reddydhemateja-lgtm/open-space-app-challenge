/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0B0F19',
          800: '#111827',
          700: '#1F2937',
          600: '#374151'
        },
        nasa: {
          blue: '#105BD8',
          red: '#FC3D21',
          gold: '#F5A623',
          dark: '#0B132B'
        },
        fire: {
          low: '#3B82F6',
          moderate: '#F59E0B',
          elevated: '#EF4444',
          extreme: '#991B1B'
        }
      }
    },
  },
  plugins: [],
}

