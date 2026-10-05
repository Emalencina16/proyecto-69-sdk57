import { API_URL } from '@/config/api';
import { ErrorServicio, errorDeRed, errorDeServidor } from '@/servicios/errores';
import type { Lugar } from '@/tipos/lugar';

export interface FiltrosLugares {
  categoriaId?: string;
  busqueda?: string; // por nombre
}

// Hoy pega contra json-server (ver db.json + script "mock-api"), que devuelve
// el array o el objeto sueltos. Cuando llegue la API de la cátedra, la
// respuesta viene envuelta en { datos, meta }: lo único que cambia es la
// lectura del JSON en cada función (ver los comentarios "API cátedra") y,
// si hace falta, los nombres de los query params. Las firmas no cambian, así
// que las pantallas no se tocan.

async function pedir(ruta: string): Promise<Response> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`);
  } catch {
    throw errorDeRed();
  }
  return respuesta;
}

export async function obtenerLugares(filtros: FiltrosLugares = {}): Promise<Lugar[]> {
  const params = new URLSearchParams({ activo: 'true' });
  if (filtros.categoriaId) params.set('categoriaId', filtros.categoriaId);
  // Sintaxis de json-server v1 (contiene, sin distinguir mayúsculas).
  if (filtros.busqueda?.trim()) params.set('nombre:contains', filtros.busqueda.trim());

  const respuesta = await pedir(`/lugares?${params}`);
  if (!respuesta.ok) throw errorDeServidor();

  const lugares: Lugar[] = await respuesta.json();
  // API cátedra: const { datos }: RespuestaApi<Lugar[]> = await respuesta.json();
  return lugares;
}

export async function obtenerLugar(id: string): Promise<Lugar> {
  const respuesta = await pedir(`/lugares/${encodeURIComponent(id)}`);

  if (respuesta.status === 404) {
    throw new ErrorServicio({ codigo: 'LUGAR_NO_ENCONTRADO', mensaje: 'No existe ese lugar.' });
  }
  if (!respuesta.ok) throw errorDeServidor();

  const lugar: Lugar = await respuesta.json();
  // API cátedra: const { datos }: RespuestaApi<Lugar> = await respuesta.json();
  return lugar;
}
