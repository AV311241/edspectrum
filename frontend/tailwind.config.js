module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#93004e',
        'primary-container': '#b81d67',
        'on-primary-container': '#ffd2de',
        secondary: '#006398',
        'secondary-container': '#5bb8fe',
        tertiary: '#005539',
        'tertiary-container': '#00704c',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        surface: '#faf8ff',
        'surface-container-lowest': '#ffffff',
        'surface-container': '#eaedff',
        'on-surface': '#131b2e',
        'on-surface-variant': '#584047',
        outline: '#8b7077',
        navy: {
          900: '#0E1726',
          800: '#10172A',
          700: '#1E293B',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'headline-lg': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'headline-md': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-md': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '600' }],
        'metric-xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      spacing: {
        gutter: '1rem',
        'space-md': '0.875rem',
        'space-lg': '1.25rem',
      },
      borderRadius: {
        'radius-md': '0.75rem',
        'radius-lg': '1.0rem',
        'radius-full': '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 4px 16px rgba(15, 23, 42, 0.08), 0 10px 24px -4px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
