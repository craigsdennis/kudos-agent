/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whiteboard: '#f5f5f5',
        sticky: {
          yellow: '#fef9c3',
          blue: '#dbeafe',
          green: '#dcfce7',
          pink: '#fce7f3',
        }
      },
      backgroundColor: {
        whiteboard: '#f5f5f5',
      },
      boxShadow: {
        'sticky': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 2px 2px 5px -1px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}