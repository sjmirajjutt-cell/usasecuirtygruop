import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12263f',
        navy: '#1d3557',
        signal: '#4b98cf',
        safe: '#4eb4a5',
        alert: '#ee405a'
      }
    }
  },
  plugins: []
}

export default config
