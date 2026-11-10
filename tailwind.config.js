/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        chatBgLight: '#F8F9FA',
        chatBgDark: '#0F1012',
        sidebarBgLight: '#F4F5F7',
        sidebarBgDark: '#141518',
        cardBgLight: '#FFFFFF',
        cardBgDark: '#1A1B1E',
        borderLight: '#E5E7EB',
        borderDark: '#26282D',
        accentLight: '#2563EB',
        accentDark: '#3B82F6',
      },
    },
  },
  plugins: [],
};
