/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: '#6B46C1',
          secondary: '#E2E8F0',
          accent: '#38B2AC',
          background: '#F7FAFC',
          success: '#10B981',
          danger: '#EF4444',
        }
      },
    },
    plugins: [],
  }