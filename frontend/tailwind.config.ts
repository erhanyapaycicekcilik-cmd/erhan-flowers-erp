import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17201c',
        line: '#e5e7eb',
        brand: '#1f7a4d',
      },
      boxShadow: {
        panel: '0 10px 30px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;

