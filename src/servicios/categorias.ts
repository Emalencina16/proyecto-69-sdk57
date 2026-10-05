import { API_URL } from '@/config/api';
import { errorDeRed, errorDeServidor } from '@/servicios/errores';
import type { Categoria } from '@/tipos/categoria';

// Mismo criterio que lugares.ts: hoy json-server devuelve el array suelto;
// con la API de la cátedra se lee `datos` (ver comentario "API cátedra").
export async function obtenerCategorias(): Promise<Categoria[]> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/categorias?_sort=orden`);
  } catch {
    throw errorDeRed();
  }
  if (!respuesta.ok) throw errorDeServidor();

  const categorias: Categoria[] = await respuesta.json();
  // API cátedra: const { datos }: RespuestaApi<Categoria[]> = await respuesta.json();
  return categorias;
}
