/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                vampire: {
                    900: '#1a0a0a',
                    800: '#2d1111',
                    700: '#4a1c1c',
                    600: '#6b2727',
                    500: '#8b3232',
                    400: '#b54444',
                    300: '#d66666',
                    200: '#e89999',
                    100: '#f5cccc'
                },
                night: {
                    900: '#0a0a1a',
                    800: '#111128',
                    700: '#1c1c3d',
                    600: '#272752',
                    500: '#3232677'
                }
            },
            fontFamily: {
                gothic: ['Creepster', 'cursive'],
                game: ['Press Start 2P', 'cursive']
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate'
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px #b54444, 0 0 10px #b54444' },
                    '100%': { boxShadow: '0 0 20px #b54444, 0 0 30px #b54444' }
                }
            }
        },
    },
    plugins: [],
}
