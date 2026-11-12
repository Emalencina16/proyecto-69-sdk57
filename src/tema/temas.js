// Paleta "Monte y Río": monte en galería (primario), río Uruguay (rio, para
// info y agua), atardecer (acento, solo favoritos). El oscuro parte del monte
// de noche. Valores y contrastes en RESEARCH.md.
//
// Los dos temas tienen las mismas claves. Las clases de Tailwind leen
// variables CSS (ver tailwind.config.js) que _layout carga según el tema del
// teléfono; el código JS usa useColores().
const claro = {
  fondo: '#f3f6f2',
  superficie: '#ffffff',
  borde: '#d8e2da',
  texto: '#14231c',
  'texto-suave': '#56685e',

  primario: '#1d5446',
  'primario-oscuro': '#143c32',
  'primario-claro': '#e0ece5',
  // Texto e íconos sobre el primario (blanco en claro, oscuro en oscuro).
  'sobre-primario': '#ffffff',

  rio: '#165a6e',
  'rio-claro': '#dcedf2',
  // Coral de atardecer: favoritos. Nunca en el mapa (se confunde con el pin
  // de Gastronomía).
  acento: '#d4553d',
  'acento-claro': '#fbe5df',

  exito: '#357025',
  'exito-claro': '#e4f1dc',
  advertencia: '#935700',
  'advertencia-claro': '#faeed3',
  error: '#b42318',
  'error-claro': '#fce3e0',
};

const oscuro = {
  fondo: '#0d1713',
  superficie: '#15221d',
  borde: '#26382f',
  texto: '#e4eee8',
  'texto-suave': '#9bafa4',

  primario: '#72c7a2',
  'primario-oscuro': '#08100d',
  'primario-claro': '#1b3329',
  'sobre-primario': '#0d1713',

  rio: '#71c2d8',
  'rio-claro': '#14303a',
  acento: '#f08b73',
  'acento-claro': '#3a221c',

  exito: '#93d282',
  'exito-claro': '#1c3320',
  advertencia: '#f0b54a',
  'advertencia-claro': '#382c13',
  error: '#f2918a',
  'error-claro': '#3d1e1c',
};

module.exports = { claro, oscuro };
