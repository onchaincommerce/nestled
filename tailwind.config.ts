import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#d6e0fd',
          300: '#b3c6fc',
          400: '#8aa3f9',
          500: '#6a7ff5',
          600: '#4c5eeb',
          700: '#3e49d8',
          800: '#353cb0',
          900: '#2e398c',
        },
        secondary: {
          50: '#fdf8f6',
          100: '#f7ebe5',
          200: '#f0d8ce',
          300: '#e5b8a8',
          400: '#d89277',
          500: '#ca764f',
          600: '#bd613b',
          700: '#9d4e2f',
          800: '#82412a',
          900: '#6c3726',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
};

export default config; 