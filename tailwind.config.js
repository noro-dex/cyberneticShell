/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#1a1a2e',
          surface: '#16213e',
          border: '#0f3460',
        },
        workspace: {
          empty: '#2d3748',
          occupied: '#4a5568',
          working: '#3182ce',
          success: '#38a169',
          error: '#e53e3e',
        },
        agent: {
          idle: '#a0aec0',
          thinking: '#9f7aea',
          reading: '#4299e1',
          writing: '#ed8936',
          running: '#48bb78',
          searching: '#ecc94b',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
