import { pedirLista, pedirUno } from '@/servicios/cliente';
import type { Lugar } from '@/tipos/lugar';

export interface FiltrosLugares {
  categoriaId?: string;
  busqueda?: string; // por nombre
}

// La API pagina de a 20 por defecto; para lugares admite hasta 500, así el
// mapa recibe el catálogo entero en un solo pedido. Sin filtros devuelve solo
// los activos.
const LUGARES_POR_PAGINA = 500;

export async function obtenerLugares(filtros: FiltrosLugares = {}): Promise<Lugar[]> {
  const params = new URLSearchParams({ porPagina: String(LUGARES_POR_PAGINA) });
  if (filtros.categoriaId) params.set('categoriaId', filtros.categoriaId);
  // Busca en el nombre sin distinguir mayúsculas ni tildes.
  if (filtros.busqueda?.trim()) params.set('q', filtros.busqueda.trim());

  return pedirLista<Lugar>(`/lugares?${params}`);
}

// Si no existe, la API responde LUGAR_NO_ENCONTRADO y el cliente lo lanza
// como ErrorServicio.
export async function obtenerLugar(id: string): Promise<Lugar> {
  return pedirUno<Lugar>(`/lugares/${encodeURIComponent(id)}`);
}
