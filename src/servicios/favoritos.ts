import { MOCK_API_URL as API_URL } from '@/config/api';
import { errorDeRed, errorDeServidor } from '@/servicios/errores';
import { obtenerLugar } from '@/servicios/lugares';
import type { Favorito } from '@/tipos/favorito';
import type { Lugar } from '@/tipos/lugar';

// Mismo criterio que lugares.ts y categorias.ts: hoy json-server devuelve el
// array suelto; con la API de la cátedra se lee `datos` (ver "API cátedra").

export async function obtenerFavoritos(usuarioId: string): Promise<Favorito[]> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/favoritos?usuarioId=${encodeURIComponent(usuarioId)}`);
  } catch {
    throw errorDeRed();
  }
  if (!respuesta.ok) throw errorDeServidor();

  const favoritos: Favorito[] = await respuesta.json();
  // API cátedra: const { datos }: RespuestaApi<Favorito[]> = await respuesta.json();
  return favoritos;
}

// Para la pantalla "Yo": la lista de favoritos no sirve de mucho sin los
// datos del lugar, así que acá mismo se pide cada lugar por su id.
export async function obtenerLugaresFavoritos(usuarioId: string): Promise<Lugar[]> {
  const favoritos = await obtenerFavoritos(usuarioId);
  return Promise.all(favoritos.map((favorito) => obtenerLugar(favorito.lugarId)));
}

export async function agregarFavorito(usuarioId: string, lugarId: string): Promise<Favorito> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/favoritos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, lugarId, creadoEn: new Date().toISOString() }),
    });
  } catch {
    throw errorDeRed();
  }
  if (!respuesta.ok) throw errorDeServidor();

  const favorito: Favorito = await respuesta.json();
  // API cátedra: const { datos }: RespuestaApi<Favorito> = await respuesta.json();
  return favorito;
}

export async function quitarFavorito(favoritoId: string): Promise<void> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/favoritos/${encodeURIComponent(favoritoId)}`, { method: 'DELETE' });
  } catch {
    throw errorDeRed();
  }
  if (!respuesta.ok) throw errorDeServidor();
}
