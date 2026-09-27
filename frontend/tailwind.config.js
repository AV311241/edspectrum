module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#c02672',
          'pink-dark': '#9e1859',
          'pink-soft': '#fdf2f8',
          'pink-light': '#fcf2f7',
          navy: '#182030',
          'navy-hover': '#232d42',
          bg: '#f4f6fa',
          surface: '#ffffff',
        },
        stage: {
          1: '#c02672',
          2: '#f472b6',
          3: '#f87171',
          4: '#fbcfe8',
          5: '#fce7f3',
        },
        status: {
          positive: '#10b981',
          warning: '#f59e0b',
          alert: '#ef4444',
          info: '#3b82f6',
          accent: '#8b5cf6',
        },
        'brand-ink': '#1e293b',
        'brand-muted': '#64748b',
        'brand-line': '#e2e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Akshara type scale: 800 titles, 700 card titles, 600 sub-headers,
        // 500 table values, 400 body, 9-11px sub-labels.
        'display-lg': ['30px', { lineHeight: '36px', fontWeight: '800' }],
        'metric-xl': ['24px', { lineHeight: '30px', fontWeight: '800', letterSpacing: '-0.02em' }],
        'headline-lg': ['18px', { lineHeight: '24px', fontWeight: '700' }],
        'card-title': ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'body-md': ['14px', { lineHeight: '19px', fontWeight: '400' }],
        'table-md': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', fontWeight: '600' }],
        'label-xs': ['10px', { lineHeight: '12px', fontWeight: '600' }],
        micro: ['9px', { lineHeight: '12px', fontWeight: '400' }],
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
        card: '0 2px 10px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 24px -6px rgba(192, 38, 114, 0.18)',
      },
    },
  },
  plugins: [],
}
