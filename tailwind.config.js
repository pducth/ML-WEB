/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}', './src/index.html'],
  theme: {
    extend: {
      colors: {
        'primary-brown': '#6E473B',
        'primary-brown-light': '#8A5B4D',
        'deep-brown': '#4A2E2B',
        'cream-sand': '#FDFBF7',
        'cream-subtle': '#F7F3EC',
        'teal-morocco': '#00A3A6',
        'teal-light': '#E0F7F7',
        'warm-gold': '#C89B58',
        'border-subtle': '#E7E3DC'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
