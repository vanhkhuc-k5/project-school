/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F3D5C',
          hover: '#1C6FA8',
          dark: '#0A2A40',
        },
        ocean: {
          DEFAULT: '#1C6FA8',
          hover: '#0F3D5C',
          light: '#E8F2FA',
        },
        sky: {
          DEFAULT: '#E8F2FA',
          light: '#F2F7FC',
        },
        surface: {
          neutral: '#F4F6F8',
          white: '#FFFFFF',
        },
        hairline: {
          DEFAULT: '#E1E6EB',
          darker: '#CBD5E1',
        },
        'text-primary': '#1B2B3A',
        'text-secondary': '#5B6B7A',
        success: {
          DEFAULT: '#2E8B57',
          light: '#EAF5EF',
        },
        warning: {
          DEFAULT: '#E8A33D',
          dark: '#B87314',
          light: '#FEF6EB',
        },
        danger: {
          DEFAULT: '#D64545',
          light: '#FBEBEB',
        },
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '12px',
        button: '8px',
        pill: '9999px',
      },
      boxShadow: {
        whisper: '0 2px 8px rgba(15, 61, 92, 0.06)',
        popover: '0 4px 16px rgba(15, 61, 92, 0.06), 0 1px 3px rgba(15, 61, 92, 0.04)',
      },
    },
  },
  plugins: [],
}
