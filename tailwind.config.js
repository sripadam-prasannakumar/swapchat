/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            spacing: {
                "85": "21.25rem", // 340px
                "95": "23.75rem", // 380px
            },
            colors: {
                "primary": {
                    DEFAULT: "#7c3aed",
                    light: "#a78bfa",
                    dark: "#5b21b6",
                },
                "background-light": "#f8fafc",
                "background-dark": "#0f172a",
                "surface-dark": "#1e293b",
                "border-dark": "rgba(100, 116, 139, 0.2)",
            },
            fontFamily: {
                "display": ["Inter", "system-ui", "sans-serif"]
            },
            boxShadow: {
                "premium": "0 10px 40px -10px rgba(0, 0, 0, 0.1)",
                "premium-hover": "0 20px 50px -12px rgba(0, 0, 0, 0.15)",
                "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "0.75rem",
                "xl": "1rem",
                "2xl": "1.5rem",
                "full": "9999px"
            },
            animation: {
                "float": "float 6s ease-in-out infinite",
                "float-delayed": "float 8s ease-in-out 1s infinite",
                "pulse-glow": "pulseGlow 2s infinite",
                "fade-up": "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both",
                "fade-in": "fadeIn 0.6s ease both",
                "slide-in-left": "slideInLeft 0.7s cubic-bezier(0.22,1,0.36,1) both",
                "slide-in-right": "slideInRight 0.7s cubic-bezier(0.22,1,0.36,1) both",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                pulseGlow: {
                    "0%": { boxShadow: "0 0 0 0 rgba(127,19,236,0.7)" },
                    "70%": { boxShadow: "0 0 0 15px rgba(127,19,236,0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(127,19,236,0)" },
                },
                fadeUp: {
                    from: { opacity: "0", transform: "translateY(30px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                fadeIn: {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                slideInLeft: {
                    from: { opacity: "0", transform: "translateX(-40px)" },
                    to: { opacity: "1", transform: "translateX(0)" },
                },
                slideInRight: {
                    from: { opacity: "0", transform: "translateX(40px)" },
                    to: { opacity: "1", transform: "translateX(0)" },
                },
            },
        },
    },
    plugins: [],
}
