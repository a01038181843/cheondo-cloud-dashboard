import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cheondo: {
          navy: '#1E3A5F',
          blue: '#2E86AB',
          gold: '#F0A500',
          bg: '#F8F9FA',
          text: '#2C2C2C',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
