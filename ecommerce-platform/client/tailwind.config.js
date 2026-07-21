/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        heading: ['Syne', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        background: '#FFFFFF',
        foreground: '#111111',
        primary: {
          DEFAULT: '#111111',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F5F3EF',
          foreground: '#111111',
        },
        muted: {
          DEFAULT: '#F5F5F4',
          foreground: '#6B6862',
        },
        'muted-foreground': '#6B6862',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#111111',
        },
        border: 'rgba(17,17,17,0.10)',
        'border-color': 'rgba(17,17,17,0.10)',
        input: 'rgba(17,17,17,0.14)',
        ring: '#111111',
        destructive: {
          DEFAULT: '#D4322B',
          foreground: '#FFFFFF',
        },
        surface: '#F5F3EF',
        gold: '#C7A86D',
        'accent-gold': '#C7A86D',
        'sale-red': '#D4322B',
        ink: '#0A0A0A',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        '8xl': '1800px',
      },
      letterSpacing: {
        'luxe': '0.25em',
        'luxe-sm': '0.18em',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
