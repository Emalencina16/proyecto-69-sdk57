import Storage from 'expo-sqlite/kv-store';

import type { Visita } from '@/tipos/visita';

// Visitas registradas sin señal, esperando subir a la API. Viven en el
// teléfono (kv-store de expo-sqlite) hasta que se suben. No son secretas:
// el token sigue solo en SecureStore.
//
// Las operaciones se encadenan para que dos que corren a la vez (registrar
// una visita mientras se sincroniza) no se pisen al leer y escribir la lista.

const CLAVE = 'visitas.pendientes';

let cadena: Promise<unknown> = Promise.resolve();

function enOrden<T>(operacion: () => Promise<T>): Promise<T> {
  const resultado = cadena.then(operacion);
  cadena = resultado.catch(() => {});
  return resultado;
}

async function leer(): Promise<Visita[]> {
  try {
    const texto = await Storage.getItem(CLAVE);
    return texto ? (JSON.parse(texto) as Visita[]) : [];
  } catch {
    return [];
  }
}

export function leerPendientes(usuarioId: string): Promise<Visita[]> {
  return enOrden(async () => (await leer()).filter((visita) => visita.usuarioId === usuarioId));
}

export function agregarPendiente(visita: Visita): Promise<void> {
  return enOrden(async () => {
    const pendientes = await leer();
    await Storage.setItem(CLAVE, JSON.stringify([...pendientes, visita]));
  });
}

export function quitarPendiente(id: string): Promise<void> {
  return enOrden(async () => {
    const pendientes = await leer();
    await Storage.setItem(CLAVE, JSON.stringify(pendientes.filter((visita) => visita.id !== id)));
  });
}
