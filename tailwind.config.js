/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}', './src/index.html'],
  theme: {
    extend: {
      colors: {
        // FOLMARÉ brand palette (FOLMARE_Brand_Kit_FINAL/css/tokens.css)
        forest: '#0F3D32',
        'forest-hover': '#19594A',
        sage: '#4F7F72',
        'sea-mist': '#A8C3B6',
        'pearl-mist': '#E0EAE5',
        sand: '#D8C5AE',
        cream: '#F7F8F4',
        coral: '#FF7F64',
        'coral-deep': '#C9503A',
        peach: '#FFAD8C',
        ink: '#1D302C',
        muted: '#5E6F68',
        outline: '#DCE5E0',
        // Legacy names kept so older class references still resolve to the new palette
        'primary-brown': '#19594A',
        'primary-brown-light': '#4F7F72',
        'deep-brown': '#0F3D32',
        'cream-sand': '#F7F8F4',
        'cream-subtle': '#EEF3EF',
        'teal-morocco': '#4F7F72',
        'teal-light': '#E0EAE5',
        'warm-gold': '#FF7F64',
        'border-subtle': '#DCE5E0'
      },
      fontFamily: {
        sans: ['Montserrat', 'Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['Lora', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
};
