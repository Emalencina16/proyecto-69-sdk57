const { claro } = require('./src/tema/temas');
const radios = require('./src/tema/radios');

// Cada color lee su variable (la define _layout con el tema del teléfono), así
// bg-primario cambia solo entre claro y oscuro y sigue aceptando opacidad
// (bg-primario-oscuro/70).
const colores = Object.fromEntries(
  Object.keys(claro).map((clave) => [clave, `rgb(var(--color-${clave}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,jsx,ts,tsx}', './src/components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: colores,
      borderRadius: Object.fromEntries(
        Object.entries(radios).map(([nombre, px]) => [nombre, `${px}px`]),
      ),
    },
  },
  plugins: [],
};
