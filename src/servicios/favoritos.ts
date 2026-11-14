import { pedir, pedirLista, pedirUno } from '@/servicios/cliente';
import { obtenerLugar } from '@/servicios/lugares';
import type { Favorito } from '@/tipos/favorito';
import type { Lugar } from '@/tipos/lugar';

// Favoritos de quien tiene la sesión: la API saca el usuario del token, por
// eso ninguna función recibe usuarioId. Cada favorito se identifica por el
// lugar (PUT / DELETE /yo/favoritos/:lugarId), no por su propio id.

// Por defecto la API pagina de a 20; con 100 (el máximo) entran todos.
const FAVORITOS_POR_PAGINA = 100;

export async function obtenerFavoritos(): Promise<Favorito[]> {
  return pedirLista<Favorito>(`/yo/favoritos?porPagina=${FAVORITOS_POR_PAGINA}`);
}

// Para la pantalla "Yo": la lista de favoritos no sirve de mucho sin los
// datos del lugar, así que acá mismo se pide cada lugar por su id.
export async function obtenerLugaresFavoritos(): Promise<Lugar[]> {
  const favoritos = await obtenerFavoritos();
  return Promise.all(favoritos.map((favorito) => obtenerLugar(favorito.lugarId)));
}

// Si ya era favorito, la API devuelve el existente (no lo duplica).
export async function agregarFavorito(lugarId: string): Promise<Favorito> {
  return pedirUno<Favorito>(`/yo/favoritos/${encodeURIComponent(lugarId)}`, { method: 'PUT' });
}

// 204 siempre, también si no estaba.
export async function quitarFavorito(lugarId: string): Promise<void> {
  await pedir(`/yo/favoritos/${encodeURIComponent(lugarId)}`, { method: 'DELETE' });
}
