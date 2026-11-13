import { getNetworkStateAsync } from 'expo-network';

import { ErrorServicio } from '@/servicios/errores';

// Si el teléfono sabe que no hay internet, no vale la pena esperar el
// timeout de cliente.ts (20 s) para enterarse.
export async function hayInternet(): Promise<boolean> {
  try {
    return (await getNetworkStateAsync()).isInternetReachable !== false;
  } catch {
    return true; // si no se puede saber, se intenta igual
  }
}

// Errores que se arreglan solos: sin señal, timeout (Render dormido) o el
// servidor caído. Con estos tiene sentido mostrar lo guardado en el teléfono
// o reintentar después. Un error de la API con código propio (lugar que no
// existe, sesión vencida) no.
const CODIGOS_SIN_CONEXION = ['ERROR_RED', 'ERROR_SERVIDOR', 'ERROR_INTERNO'];

export function esSinConexion(error: unknown): boolean {
  return !(error instanceof ErrorServicio) || CODIGOS_SIN_CONEXION.includes(error.codigo);
}
