/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/contexts/**/*.{js,ts,jsx,tsx}',
    './src/styles/**/*.{css}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F7F2',
        surface: '#FFFFFF',
        'surface-muted': '#EEF2EC',
        text: '#17231D',
        'text-muted': '#66736C',
        border: '#DDE3DD',
        primary: '#174D3A',
        'primary-hover': '#103D2E',
        'primary-soft': '#E3EFE8',
        success: '#2E7D32',
        warning: '#A96207',
        danger: '#B42318',
        info: '#356A7A',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      opacity: {
        8: '0.08',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(23, 35, 29, 0.06)',
      },
    },
  },
  plugins: [],
}
