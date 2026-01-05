/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}"
  ],
  theme: {
    extend: {
      colors: {
        // Financial Angel design tokens
        primary: '#264653',       // Charcoal Blue
        success: '#02C39A',       // Mint Leaf
        surface: '#F2DCA6',       // Soft Peach
        brand: '#FFADBC',         // Cherry Blossom
        secondary: '#F39B53',     // Sandy Brown
        alert: '#E9795D'          // Burnt Peach
      },
      borderRadius: {
        // Softer, high radii for friendly look
        'lg': '1rem',
        'xl': '1.5rem',
        '3xl': '2rem'
      },
      boxShadow: {
        // Soft, diffused shadows
        'soft-sm': '0 6px 18px rgba(38,70,83,0.06)',
        'soft-md': '0 10px 30px rgba(38,70,83,0.08)'
      },
      fontFamily: {
        // Friendly, modern UI font fallback; install Inter for production if desired
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial']
      }
    },
  },
  plugins: [],
};
