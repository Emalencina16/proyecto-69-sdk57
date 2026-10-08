// Paleta provisoria. Es la única fuente de colores de la app:
// la usa tailwind.config.js (clases como bg-primario, text-texto-suave)
// y también el código que necesita el valor en JS (tabs, placeholders).
// Cuando definamos la paleta final, alcanza con cambiar este archivo.
module.exports = {
  primario: '#2563eb',
  'primario-oscuro': '#1d4ed8',
  fondo: '#f8fafc',
  superficie: '#ffffff',
  borde: '#e2e8f0',
  texto: '#0f172a',
  'texto-suave': '#64748b',
  error: '#dc2626',
};
