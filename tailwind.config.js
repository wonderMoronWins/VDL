/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#12111A',
          secondary: '#1A1825',
          card:      '#1E1C2E',
          hover:     '#2A2840',
        },
        accent: {
          DEFAULT: '#7C5CDB',
          light:   '#9B7EF0',
        },
        text: {
          primary:   'rgba(255,255,255,0.9)',
          secondary: 'rgba(255,255,255,0.5)',
          muted:     'rgba(255,255,255,0.3)',
        },
        success: '#3FC97E',
        danger:  '#E24B4A',
      },
      borderRadius: {
        card: '10px',
        lg:   '12px',
      },
    },
  },
  plugins: [],
}
