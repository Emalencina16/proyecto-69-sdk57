import { vars } from 'nativewind';
import { useColorScheme } from 'react-native';

import temas from './temas';

export type Colores = typeof temas.claro;

// Colores del tema que tiene el teléfono, para lo que no se pinta con clases
// (íconos, Switch, ActivityIndicator, mapa, pestañas).
export function useColores(): Colores {
  return useColorScheme() === 'dark' ? temas.oscuro : temas.claro;
}

export function useEsOscuro(): boolean {
  return useColorScheme() === 'dark';
}

// "#1d5446" → "29 84 70": el formato que espera rgb(var(--color-x) / <alpha>).
function aCanales(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function variablesDe(colores: Colores) {
  return vars(
    Object.fromEntries(Object.entries(colores).map(([clave, hex]) => [`--color-${clave}`, aCanales(hex)])),
  );
}

const VARIABLES = { claro: variablesDe(temas.claro), oscuro: variablesDe(temas.oscuro) };

// Estilo para la vista raíz: define las variables que leen las clases.
export function useVariablesTema() {
  return useColorScheme() === 'dark' ? VARIABLES.oscuro : VARIABLES.claro;
}
